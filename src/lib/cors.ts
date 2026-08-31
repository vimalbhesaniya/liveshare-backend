function isHttpOrigin(value: string) {
  return /^https?:\/\/[a-zA-Z0-9.-]+(?::\d+)?$/.test(value);
}

function allowedOrigins() {
  return (
    process.env.CLIENT_ORIGIN ||
    "http://localhost:8080,http://localhost:3000,https://liveshare.dev,https://www.liveshare.dev"
  )
    .split(/[\s,]+/)
    .map((o) => o.trim())
    .filter(isHttpOrigin);
}

function applyCors(request: Request, headers: Headers) {
  const allowed = allowedOrigins();
  const origin = request.headers.get("origin") ?? "";
  const isAllowed = Boolean(origin) && allowed.includes(origin);
  const corsOrigin = isAllowed ? origin : allowed[0];
  if (!corsOrigin) return;

  headers.set("Access-Control-Allow-Origin", corsOrigin);
  headers.set("Access-Control-Allow-Credentials", "true");
  headers.set("Access-Control-Allow-Methods", "GET,POST,PATCH,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, x-snippet-password");
  headers.set("Vary", "Origin");
}

export function corsJson(
  request: Request,
  data: unknown,
  init?: ResponseInit,
) {
  const headers = new Headers(init?.headers);
  applyCors(request, headers);
  return Response.json(data, { ...init, headers });
}

export function corsOptions(request: Request) {
  const headers = new Headers();
  applyCors(request, headers);
  return new Response(null, { status: 204, headers });
}
