import {
  hashPassword,
  resolvePasswordHash,
  stripPasswordFromCode,
  verifyPassword,
} from "@/lib/password";
import { makeViewToken } from "@/lib/view-token";
import * as store from "@/lib/snippets/store";

export function authPasswordFromRequest(req: Request, body?: unknown): string | undefined {
  const header = req.headers.get("x-snippet-password");
  if (header) return header;
  if (body && typeof body === "object" && body !== null) {
    const current = (body as { current_password?: unknown }).current_password;
    if (typeof current === "string" && current) return current;
  }
  return undefined;
}

export function publicSnippet(
  snippet: store.SnippetRecord,
  opts?: { includeCode?: boolean; includeUniqueCode?: boolean },
) {
  const protected_ = Boolean(snippet.password_hash);
  const includeUniqueCode = opts?.includeUniqueCode !== false;
  return {
    id: snippet.id,
    ...(includeUniqueCode ? { unique_code: snippet.unique_code } : {}),
    language: snippet.language,
    created_at: snippet.created_at,
    updated_at: snippet.updated_at,
    password_protected: protected_,
    view_token: makeViewToken(snippet.unique_code),
    code:
      opts?.includeCode === false
        ? ""
        : stripPasswordFromCode(snippet.code),
  };
}

export async function maybeUpgradeLegacyHash(
  snippet: store.SnippetRecord,
  plainPassword: string,
) {
  if (snippet.password_hash?.startsWith("scrypt$")) return;
  const upgraded = hashPassword(plainPassword);
  await store.saveSnippet(
    snippet.unique_code,
    stripPasswordFromCode(snippet.code),
    snippet.language,
    upgraded,
  );
  snippet.password_hash = upgraded;
  snippet.code = stripPasswordFromCode(snippet.code);
}

export async function requireSnippetAccess(
  snippet: store.SnippetRecord,
  req: Request,
  body?: unknown,
): Promise<Response | null> {
  const pwdHash = resolvePasswordHash(snippet.password_hash, snippet.code);
  snippet.password_hash = pwdHash;

  if (!pwdHash) return null;

  const provided = authPasswordFromRequest(req, body);
  if (!provided || !verifyPassword(provided, pwdHash)) {
    return Response.json(
      {
        password_required: true,
        id: snippet.id,
        unique_code: snippet.unique_code,
        language: snippet.language,
        error: "Password required",
      },
      { status: 401 },
    );
  }

  await maybeUpgradeLegacyHash(snippet, provided);
  return null;
}

export function isDuplicateKeyError(err: unknown): boolean {
  return (
    !!err &&
    typeof err === "object" &&
    "code" in err &&
    (err as { code: number }).code === 11000
  );
}
