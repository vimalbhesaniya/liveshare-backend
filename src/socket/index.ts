import type { Server, Socket } from "socket.io";
import { getSnippet, saveSnippet } from "../lib/snippets/store";
import {
  resolvePasswordHash,
  verifyPassword,
} from "../lib/password";
import { resolveViewToken } from "../lib/view-token";

type UserSelection = {
  userId: string;
  start: number;
  end: number;
  color: string;
};

type PresenceEntry = {
  socketId: string;
  userId: string;
  selection: UserSelection | null;
};

const roomPresence = new Map<string, Map<string, PresenceEntry>>();

function roomKey(uniqueCode: string) {
  return `room:${uniqueCode}`;
}

function broadcastPresence(io: Server, uniqueCode: string) {
  const room = roomKey(uniqueCode);
  const presence = roomPresence.get(room);
  const selections: UserSelection[] = [];
  const uniqueUsers = new Set<string>();

  presence?.forEach((entry) => {
    uniqueUsers.add(entry.userId);
    if (entry.selection) {
      selections.push(entry.selection);
    }
  });

  io.to(room).emit("presence:sync", {
    count: uniqueUsers.size,
    selections,
  });
}

function removeFromRoom(io: Server, socket: Socket, uniqueCode: string) {
  const room = roomKey(uniqueCode);
  const presence = roomPresence.get(room);
  presence?.delete(socket.id);

  if (presence?.size === 0) {
    roomPresence.delete(room);
  }

  socket.leave(room);
  broadcastPresence(io, uniqueCode);
}

async function assertRoomAccess(
  uniqueCode: string,
  password?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const snippet = await getSnippet(uniqueCode);
    if (!snippet) return { ok: true };
    const hash = resolvePasswordHash(snippet.password_hash, snippet.code);
    if (!hash) return { ok: true };
    if (!password || !verifyPassword(password, hash)) {
      return { ok: false, error: "Password required" };
    }
    return { ok: true };
  } catch (err) {
    console.error("room access check failed:", err);
    return { ok: false, error: "Access check failed" };
  }
}

export function registerSocketHandlers(io: Server) {
  io.on("connection", (socket) => {
    let joinedCode: string | null = null;
    let roomPassword: string | undefined;
    let joinedRole: "viewer" | "editor" = "editor";

    const isViewer = () => joinedRole === "viewer";

    socket.on(
      "room:join",
      async ({
        uniqueCode,
        viewToken,
        userId,
        password,
        role,
      }: {
        uniqueCode?: string;
        viewToken?: string;
        userId: string;
        password?: string;
        role?: "viewer" | "editor";
      }) => {
        if (!userId) return;

        let roomCode = uniqueCode;
        let forcedViewer = false;

        if (viewToken) {
          const resolved = resolveViewToken(viewToken);
          if (!resolved) {
            socket.emit("room:error", {
              uniqueCode: viewToken,
              error: "Invalid view link",
              password_required: false,
            });
            return;
          }
          roomCode = resolved;
          forcedViewer = true;
        }

        if (!roomCode) return;

        const access = await assertRoomAccess(roomCode, password);
        if (!access.ok) {
          socket.emit("room:error", {
            uniqueCode: viewToken || roomCode,
            error: access.error,
            password_required: true,
          });
          return;
        }

        if (joinedCode && joinedCode !== roomCode) {
          removeFromRoom(io, socket, joinedCode);
        }

        joinedCode = roomCode;
        roomPassword = password;
        joinedRole = forcedViewer || role === "viewer" ? "viewer" : "editor";
        const room = roomKey(roomCode);
        socket.join(room);

        if (!roomPresence.has(room)) {
          roomPresence.set(room, new Map());
        }

        roomPresence.get(room)!.set(socket.id, {
          socketId: socket.id,
          userId,
          selection: null,
        });

        broadcastPresence(io, roomCode);
        socket.emit("room:joined", {
          uniqueCode: forcedViewer ? viewToken! : roomCode,
        });
      },
    );

    socket.on("room:leave", () => {
      if (!joinedCode) return;
      removeFromRoom(io, socket, joinedCode);
      joinedCode = null;
      roomPassword = undefined;
      joinedRole = "editor";
    });

    socket.on(
      "doc:ops",
      (payload: {
        uniqueCode: string;
        tabId?: string;
        senderId: string;
        baseLength: number;
        ops: unknown[];
        code?: string;
      }) => {
        if (isViewer() || !joinedCode || !payload.ops) return;
        socket
          .to(roomKey(joinedCode))
          .emit("doc:ops", { ...payload, uniqueCode: joinedCode });
      },
    );

    socket.on(
      "code:change",
      (payload: {
        uniqueCode: string;
        tabId?: string;
        code: string;
        senderId: string;
      }) => {
        if (isViewer() || !joinedCode || payload.code === undefined) return;
        socket
          .to(roomKey(joinedCode))
          .emit("code:change", { ...payload, uniqueCode: joinedCode });
      },
    );

    socket.on(
      "tabs:meta",
      (payload: {
        uniqueCode: string;
        tabs: unknown[];
        activeTabId?: string;
        closedTabId?: string;
        senderId: string;
      }) => {
        if (isViewer() || !joinedCode || !Array.isArray(payload.tabs)) return;
        socket
          .to(roomKey(joinedCode))
          .emit("tabs:meta", { ...payload, uniqueCode: joinedCode });
      },
    );

    socket.on(
      "selection:change",
      ({
        uniqueCode,
        userId,
        selection,
      }: {
        uniqueCode: string;
        userId: string;
        selection: UserSelection | null;
      }) => {
        if (isViewer() || !joinedCode || joinedCode !== uniqueCode) return;

        const room = roomKey(joinedCode);
        const presence = roomPresence.get(room);
        const entry = presence?.get(socket.id);

        if (entry) {
          entry.selection = selection;
          broadcastPresence(io, uniqueCode);
        }
      },
    );

    socket.on(
      "snippet:save",
      async ({
        uniqueCode,
        code,
        language,
        senderId,
        password,
      }: {
        uniqueCode: string;
        code: string;
        language?: string;
        senderId?: string;
        password?: string;
      }) => {
        if (isViewer() || !joinedCode || joinedCode !== uniqueCode) return;

        const access = await assertRoomAccess(
          uniqueCode,
          password ?? roomPassword,
        );
        if (!access.ok) {
          socket.emit("room:error", {
            uniqueCode,
            error: access.error,
            password_required: true,
          });
          return;
        }

        try {
          await saveSnippet(uniqueCode, code, language);
          socket.to(roomKey(uniqueCode)).emit("snippet:updated", {
            code,
            senderId,
          });
        } catch (err) {
          console.error("snippet:save error:", err);
        }
      },
    );

    socket.on(
      "snippet:sync",
      ({
        uniqueCode,
        code,
        senderId,
      }: {
        uniqueCode: string;
        code: string;
        senderId?: string;
      }) => {
        if (isViewer() || !joinedCode || joinedCode !== uniqueCode) return;
        socket.to(roomKey(uniqueCode)).emit("snippet:updated", { code, senderId });
      },
    );

    socket.on("disconnect", () => {
      if (joinedCode) {
        removeFromRoom(io, socket, joinedCode);
      }
    });
  });
}
