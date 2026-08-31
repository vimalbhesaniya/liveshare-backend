import {
  maybeUpgradeLegacyHash,
  publicSnippet,
} from "@/lib/snippets/api-helpers";
import { resolvePasswordHash, verifyPassword } from "@/lib/password";
import { getSnippet } from "@/lib/snippets/store";
import { corsJson, corsOptions } from "@/lib/cors";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ uniqueCode: string }> };

export function OPTIONS(request: Request) {
  return corsOptions(request);
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { uniqueCode } = await params;
    const body = (await request.json()) as { password?: string };

    const snippet = await getSnippet(uniqueCode);
    if (!snippet) {
      return corsJson(request, { error: "Snippet not found" }, { status: 404 });
    }

    const pwdHash = resolvePasswordHash(snippet.password_hash, snippet.code);
    snippet.password_hash = pwdHash;

    if (!pwdHash) {
      return corsJson(request, publicSnippet(snippet));
    }

    const password = typeof body.password === "string" ? body.password : "";
    if (!password || !verifyPassword(password, pwdHash)) {
      return corsJson(
        request,
        { password_required: true, error: "Incorrect password" },
        { status: 401 },
      );
    }

    await maybeUpgradeLegacyHash(snippet, password);
    return corsJson(request, publicSnippet(snippet));
  } catch (err) {
    console.error("UNLOCK snippet error:", err);
    return corsJson(request, { error: "Failed to unlock snippet" }, { status: 500 });
  }
}
