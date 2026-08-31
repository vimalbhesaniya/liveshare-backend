import {
  publicSnippet,
  requireSnippetAccess,
} from "@/lib/snippets/api-helpers";
import { hashPassword } from "@/lib/password";
import { resolveViewToken } from "@/lib/view-token";
import { createSnippet, getSnippet, saveSnippet } from "@/lib/snippets/store";
import { corsJson, corsOptions } from "@/lib/cors";

export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ uniqueCode: string }> };

export function OPTIONS(request: Request) {
  return corsOptions(request);
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { uniqueCode } = await params;

    if (resolveViewToken(uniqueCode)) {
      return corsJson(request, { error: "Snippet not found" }, { status: 404 });
    }

    const snippet = await getSnippet(uniqueCode);
    if (!snippet) {
      return corsJson(request, { error: "Snippet not found" }, { status: 404 });
    }

    const denied = await requireSnippetAccess(snippet, request);
    if (denied) return denied;

    return corsJson(request, publicSnippet(snippet));
  } catch (err) {
    console.error("GET snippet error:", err);
    return corsJson(request, { error: "Failed to load snippet" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { uniqueCode } = await params;
    const body = (await request.json()) as {
      code?: string;
      language?: string;
      password?: string | null;
      current_password?: string;
    };

    if (body.code === undefined) {
      return corsJson(request, { error: "code is required" }, { status: 400 });
    }

    const existing = await getSnippet(uniqueCode);
    if (!existing) {
      const passwordHash =
        typeof body.password === "string" && body.password
          ? hashPassword(body.password)
          : null;
      const snippet = await createSnippet(
        uniqueCode,
        body.code,
        body.language ?? "text",
        passwordHash,
      );
      return corsJson(request, publicSnippet(snippet));
    }

    const denied = await requireSnippetAccess(existing, request, body);
    if (denied) return denied;

    let nextPasswordHash: string | null | undefined = undefined;
    if (body.password === null) {
      nextPasswordHash = null;
    } else if (typeof body.password === "string") {
      nextPasswordHash = body.password ? hashPassword(body.password) : null;
    }

    const snippet = await saveSnippet(
      uniqueCode,
      body.code,
      body.language,
      nextPasswordHash,
    );

    return corsJson(request, publicSnippet(snippet));
  } catch (err) {
    console.error("PATCH snippet error:", err);
    return corsJson(request, { error: "Failed to update snippet" }, { status: 500 });
  }
}
