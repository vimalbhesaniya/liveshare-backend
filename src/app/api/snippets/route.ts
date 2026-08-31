import {
  isDuplicateKeyError,
  publicSnippet,
} from "@/lib/snippets/api-helpers";
import { hashPassword } from "@/lib/password";
import { createSnippet } from "@/lib/snippets/store";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      unique_code?: string;
      code?: string;
      language?: string;
      password?: string;
    };

    if (!body.unique_code || typeof body.unique_code !== "string") {
      return Response.json({ error: "unique_code is required" }, { status: 400 });
    }

    const passwordHash =
      typeof body.password === "string" && body.password
        ? hashPassword(body.password)
        : null;

    const snippet = await createSnippet(
      body.unique_code,
      body.code ?? "",
      body.language ?? "text",
      passwordHash,
    );

    return Response.json(publicSnippet(snippet), { status: 201 });
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      return Response.json({ error: "Snippet already exists" }, { status: 409 });
    }
    console.error("POST snippet error:", err);
    return Response.json({ error: "Failed to create snippet" }, { status: 500 });
  }
}
