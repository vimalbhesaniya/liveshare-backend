import {
  authPasswordFromRequest,
  maybeUpgradeLegacyHash,
  publicSnippet,
} from "@/lib/snippets/api-helpers";
import { resolvePasswordHash, verifyPassword } from "@/lib/password";
import { resolveViewToken } from "@/lib/view-token";
import { getSnippet } from "@/lib/snippets/store";
import { corsJson, corsOptions } from "@/lib/cors";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ viewToken: string }> };

export function OPTIONS(request: Request) {
  return corsOptions(request);
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { viewToken } = await params;
    const uniqueCode = resolveViewToken(viewToken);

    if (!uniqueCode) {
      return corsJson(request, { error: "Snippet not found" }, { status: 404 });
    }

    const snippet = await getSnippet(uniqueCode);
    if (!snippet) {
      return corsJson(request, { error: "Snippet not found" }, { status: 404 });
    }

    const pwdHash = resolvePasswordHash(snippet.password_hash, snippet.code);
    snippet.password_hash = pwdHash;

    if (pwdHash) {
      const provided = authPasswordFromRequest(request);
      if (!provided || !verifyPassword(provided, pwdHash)) {
        return corsJson(
          request,
          {
            password_required: true,
            id: snippet.id,
            language: snippet.language,
            access: "view",
            error: "Password required",
          },
          { status: 401 },
        );
      }
      await maybeUpgradeLegacyHash(snippet, provided);
    }

    return corsJson(request, {
      ...publicSnippet(snippet, { includeUniqueCode: false }),
      access: "view",
    });
  } catch (err) {
    console.error("GET view snippet error:", err);
    return corsJson(request, { error: "Failed to load snippet" }, { status: 500 });
  }
}
