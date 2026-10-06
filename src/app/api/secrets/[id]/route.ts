import { NextRequest, NextResponse } from "next/server";
import { encryptSecret, valueFingerprint } from "@/lib/crypto";
import { nowIso } from "@/lib/store";
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

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const file = await readSecretsFile();
  const secret = file.secrets.find((s) => s.id === params.id);
  if (!secret) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Metadata only — use /reveal for plaintext
  return NextResponse.json(toPublic(secret));
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const file = await readSecretsFile();
  const idx = file.secrets.findIndex((s) => s.id === params.id);
  if (idx < 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const current = file.secrets[idx];
  const next: SecretRecord = { ...current };

  if (typeof body.name === "string" && body.name.trim()) {
    next.name = body.name.trim();
  }
  if (typeof body.category === "string") {
    next.category = body.category.trim() || "Other";
  }
  if (body.tags !== undefined) {
    next.tags = Array.isArray(body.tags)
      ? body.tags.map(String)
      : String(body.tags || "")
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean);
  }
  if (typeof body.notes === "string") {
    next.notes = body.notes;
  }
  // Only re-encrypt when a new value is explicitly provided (non-empty string)
  if (typeof body.value === "string" && body.value.length > 0) {
    next.valueCiphertext = await encryptSecret(body.value);
    next.valueFingerprint = valueFingerprint(body.value);
  }

  next.updatedAt = nowIso();
  file.secrets[idx] = next;
  await writeSecretsFile(file);
  return NextResponse.json(toPublic(next));
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const file = await readSecretsFile();
  const before = file.secrets.length;
  file.secrets = file.secrets.filter((s) => s.id !== params.id);
  if (file.secrets.length === before) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await writeSecretsFile(file);
  return NextResponse.json({ ok: true });
}
