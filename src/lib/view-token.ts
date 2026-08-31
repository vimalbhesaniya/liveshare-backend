import { createHmac, timingSafeEqual } from "crypto";

function viewSecret(): string {
  return (
    process.env.VIEW_LINK_SECRET ||
    process.env.SNIPPET_VIEW_SECRET ||
    "liveshare-dev-view-secret"
  );
}

export function makeViewToken(uniqueCode: string): string {
  const payload = Buffer.from(uniqueCode, "utf8").toString("base64url");
  const sig = createHmac("sha256", viewSecret())
    .update(`view:${uniqueCode}`)
    .digest("base64url")
    .slice(0, 22);
  return `${payload}.${sig}`;
}

export function resolveViewToken(token: string): string | null {
  if (!token || !isViewTokenFormat(token)) return null;

  let uniqueCode: string;
  try {
    const payload = token.split(".")[0]!;
    uniqueCode = Buffer.from(payload, "base64url").toString("utf8");
  } catch {
    return null;
  }

  if (!uniqueCode || uniqueCode.length > 64) return null;

  const expected = makeViewToken(uniqueCode);
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;

  try {
    if (!timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }

  return uniqueCode;
}

export function isViewTokenFormat(code: string): boolean {
  const parts = code.split(".");
  return parts.length === 2 && parts[0]!.length > 0 && parts[1]!.length > 0;
}
