import {
  maybeUpgradeLegacyHash,
  publicSnippet,
} from "@/lib/snippets/api-helpers";
import { resolvePasswordHash, verifyPassword } from "@/lib/password";
import { getSnippet } from "@/lib/snippets/store";

type RouteParams = { params: Promise<{ uniqueCode: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { uniqueCode } = await params;
    const body = (await request.json()) as { password?: string };

    const snippet = await getSnippet(uniqueCode);
    if (!snippet) {
      return Response.json({ error: "Snippet not found" }, { status: 404 });
    }

    const pwdHash = resolvePasswordHash(snippet.password_hash, snippet.code);
    snippet.password_hash = pwdHash;

    if (!pwdHash) {
      return Response.json(publicSnippet(snippet));
    }

    const password = typeof body.password === "string" ? body.password : "";
    if (!password || !verifyPassword(password, pwdHash)) {
      return Response.json(
        { password_required: true, error: "Incorrect password" },
        { status: 401 },
      );
    }

    await maybeUpgradeLegacyHash(snippet, password);
    return Response.json(publicSnippet(snippet));
  } catch (err) {
    console.error("UNLOCK snippet error:", err);
    return Response.json({ error: "Failed to unlock snippet" }, { status: 500 });
  }
}
