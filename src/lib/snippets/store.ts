import { connectDb } from "@/lib/db";
import {
  extractLegacyPasswordHash,
  stripPasswordFromCode,
} from "@/lib/password";
import { CodeSnippet } from "@/models/CodeSnippet";

export type SnippetRecord = {
  id: string;
  unique_code: string;
  code: string;
  language: string;
  password_hash: string | null;
  created_at?: string;
  updated_at?: string;
};

function toRecord(
  uniqueCode: string,
  code: string,
  language: string,
  passwordHash: string | null,
  id?: string,
  createdAt?: string,
  updatedAt?: string,
): SnippetRecord {
  const now = new Date().toISOString();
  return {
    id: id || uniqueCode,
    unique_code: uniqueCode,
    code,
    language,
    password_hash: passwordHash,
    created_at: createdAt || now,
    updated_at: updatedAt || now,
  };
}

function coalescePasswordHash(
  stored: string | null | undefined,
  code: string,
): string | null {
  if (stored) return stored;
  return extractLegacyPasswordHash(code);
}

export async function getSnippet(
  uniqueCode: string,
): Promise<SnippetRecord | null> {
  await connectDb();
  const snippet = await CodeSnippet.findOne({ uniqueCode }).lean();
  if (!snippet) return null;

  const code = snippet.code || "";
  return toRecord(
    snippet.uniqueCode,
    code,
    snippet.language,
    coalescePasswordHash(snippet.passwordHash, code),
    snippet._id.toString(),
    snippet.createdAt?.toISOString(),
    snippet.updatedAt?.toISOString(),
  );
}

export async function createSnippet(
  uniqueCode: string,
  code: string,
  language: string,
  passwordHash: string | null = null,
): Promise<SnippetRecord> {
  const cleanCode = stripPasswordFromCode(code);
  await connectDb();
  const doc = await CodeSnippet.create({
    uniqueCode,
    code: cleanCode,
    language,
    passwordHash: passwordHash || null,
  });
  return toRecord(
    doc.uniqueCode,
    doc.code,
    doc.language,
    doc.passwordHash || null,
    doc._id.toString(),
    doc.createdAt?.toISOString(),
    doc.updatedAt?.toISOString(),
  );
}

export async function saveSnippet(
  uniqueCode: string,
  code: string,
  language?: string,
  passwordHash?: string | null,
): Promise<SnippetRecord> {
  const existing = await getSnippet(uniqueCode);
  const lang = language || existing?.language || "text";
  const cleanCode = stripPasswordFromCode(code);
  const nextHash =
    passwordHash === undefined
      ? (existing?.password_hash ?? null)
      : passwordHash;

  await connectDb();
  const doc = await CodeSnippet.findOneAndUpdate(
    { uniqueCode },
    { code: cleanCode, language: lang, passwordHash: nextHash },
    { new: true, upsert: true },
  );

  return toRecord(
    doc!.uniqueCode,
    doc!.code,
    doc!.language,
    doc!.passwordHash || null,
    doc!._id.toString(),
    doc!.createdAt?.toISOString(),
    doc!.updatedAt?.toISOString(),
  );
}
