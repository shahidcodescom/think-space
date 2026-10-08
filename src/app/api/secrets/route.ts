import { NextRequest, NextResponse } from "next/server";
import { encryptSecret, valueFingerprint } from "@/lib/crypto";
import { nowIso, uid } from "@/lib/store";
import { readSecretsFile, writeSecretsFile } from "@/lib/secrets-store";
import { SecretPublic, SecretRecord } from "@/lib/types";

function toPublic(s: SecretRecord): SecretPublic {
  return {
    id: s.id,
    name: s.name,
    category: s.category,
    tags: s.tags,
    notes: s.notes,
    hasValue: Boolean(s.valueCiphertext),
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}

export const dynamic = "force-dynamic";

export async function GET() {
  const file = await readSecretsFile();
  // Never return ciphertext or plaintext in list
  return NextResponse.json(file.secrets.map(toPublic));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const name = String(body.name || "").trim();
  const value = typeof body.value === "string" ? body.value : "";
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (!value) {
    return NextResponse.json({ error: "Value is required" }, { status: 400 });
  }

  const tags = Array.isArray(body.tags)
    ? body.tags.map(String)
    : String(body.tags || "")
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean);

  const ciphertext = await encryptSecret(value);
  const record: SecretRecord = {
    id: uid("secret"),
    name,
    category: String(body.category || "").trim() || "Other",
    tags,
    notes: String(body.notes || ""),
    valueCiphertext: ciphertext,
    valueFingerprint: valueFingerprint(value),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  const file = await readSecretsFile();
  file.secrets.unshift(record);
  await writeSecretsFile(file);

  // Return public shape only — client must call reveal to see value
  return NextResponse.json(toPublic(record), { status: 201 });
}
