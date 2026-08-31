import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server as SocketIOServer } from "socket.io";
import { registerSocketHandlers } from "./src/socket";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

function allowedOrigins() {
  return (process.env.CLIENT_ORIGIN || "http://localhost:8080,http://localhost:3000")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Request handler error:", err);
      res.statusCode = 500;
      res.end("internal server error");
    }
  });

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: allowedOrigins(),
      credentials: true,
    },
    maxHttpBufferSize: 10e6,
  });

  registerSocketHandlers(io);

  httpServer.listen(port, () => {
    console.log(`LiveShare Next backend ready on http://${hostname}:${port}`);
    console.log(`  REST  → /api/snippets, /api/health`);
    console.log(`  Socket.io → same origin`);
  });
});
