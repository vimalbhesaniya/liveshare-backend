import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

export function legacyClientHash(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 32).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  if (!password || !stored) return false;

  if (stored.startsWith("scrypt$")) {
    const parts = stored.split("$");
    if (parts.length !== 3) return false;
    const [, salt, expectedHex] = parts;
    try {
      const derived = scryptSync(password, salt, 32);
      const expected = Buffer.from(expectedHex, "hex");
      if (derived.length !== expected.length) return false;
      return timingSafeEqual(derived, expected);
    } catch {
      return false;
    }
  }

  return legacyClientHash(password) === stored;
}

export function extractLegacyPasswordHash(code: string): string | null {
  try {
    const parsed = JSON.parse(code) as { passwordHash?: unknown };
    if (typeof parsed?.passwordHash === "string" && parsed.passwordHash) {
      return parsed.passwordHash;
    }
  } catch {
    // plain text snippet
  }
  return null;
}

export function stripPasswordFromCode(code: string): string {
  try {
    const parsed = JSON.parse(code) as Record<string, unknown>;
    if (parsed && typeof parsed === "object" && "passwordHash" in parsed) {
      delete parsed.passwordHash;
      return JSON.stringify(parsed);
    }
  } catch {
    // plain text
  }
  return code;
}

export function resolvePasswordHash(
  passwordHash: string | null | undefined,
  code: string,
): string | null {
  if (passwordHash) return passwordHash;
  return extractLegacyPasswordHash(code);
}
