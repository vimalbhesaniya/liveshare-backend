import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function allowedOrigins() {
  return (process.env.CLIENT_ORIGIN || "http://localhost:8080,http://localhost:3000")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

function corsHeaders(origin: string) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-snippet-password",
  };
}

export function middleware(request: NextRequest) {
  const allowed = allowedOrigins();
  const origin = request.headers.get("origin") ?? "";
  const isAllowed = !origin || allowed.includes(origin);
  const corsOrigin = isAllowed && origin ? origin : allowed[0] ?? "*";

  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders(corsOrigin),
    });
  }

  const response = NextResponse.next();
  Object.entries(corsHeaders(corsOrigin)).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

export const config = {
  matcher: "/api/:path*",
};
