import { connectDb } from "@/lib/db";
import { corsJson, corsOptions } from "@/lib/cors";

export const dynamic = "force-dynamic";

export function OPTIONS(request: Request) {
  return corsOptions(request);
}

export async function GET(request: Request) {
  try {
    await connectDb();
    return corsJson(request, {
      status: "ok",
      storage: "mongodb",
      database: "connected",
    });
  } catch (err) {
    console.error("Health check failed:", err);
    return corsJson(
      request,
      {
        status: "error",
        storage: "mongodb",
        message:
          err instanceof Error ? err.message : "Database connection failed",
      },
      { status: 503 },
    );
  }
}
