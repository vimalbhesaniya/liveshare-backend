import { NextResponse } from "next/server";
import { connectDb } from "@/lib/db";

export async function GET() {
  try {
    await connectDb();
    return NextResponse.json({
      status: "ok",
      storage: "mongodb",
      database: "connected",
    });
  } catch (err) {
    console.error("Health check failed:", err);
    return NextResponse.json(
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
