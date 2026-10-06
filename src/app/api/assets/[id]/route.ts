import { NextRequest, NextResponse } from "next/server";
import { readAssetsFile, writeAssetsFile } from "@/lib/assets-store";
import { nowIso } from "@/lib/store";
import { Asset, AssetStatus, AssetType } from "@/lib/types";

const TYPES: AssetType[] = ["Hardware", "Software", "Document", "Media", "Other"];
const STATUSES: AssetStatus[] = ["Active", "In repair", "Retired", "Lost"];

function parseTags(input: unknown): string[] {
  if (Array.isArray(input)) return input.map(String).map((s) => s.trim()).filter(Boolean);
  return String(input || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseIds(input: unknown): string[] {
  if (Array.isArray(input)) return input.map(String).filter(Boolean);
  return String(input || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const file = await readAssetsFile();
  const asset = file.assets.find((a) => a.id === params.id);
  if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(asset);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const file = await readAssetsFile();
  const idx = file.assets.findIndex((a) => a.id === params.id);
  if (idx < 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const current = file.assets[idx];
  const next: Asset = { ...current };

  if (typeof body.name === "string" && body.name.trim()) next.name = body.name.trim();
  if (TYPES.includes(body.type)) next.type = body.type;
  if (STATUSES.includes(body.status)) next.status = body.status;
  if (typeof body.serial === "string") next.serial = body.serial.trim();
  if (typeof body.purchaseDate === "string") next.purchaseDate = body.purchaseDate.slice(0, 10);
  if (body.value === null || body.value === "") next.value = null;
  else if (body.value !== undefined) {
    const n = Number(body.value);
    next.value = Number.isFinite(n) ? n : null;
  }
  if (typeof body.location === "string") next.location = body.location.trim();
  if (typeof body.owner === "string") next.owner = body.owner.trim();
  if (body.tags !== undefined) next.tags = parseTags(body.tags);
  if (typeof body.notes === "string") next.notes = body.notes;
  if (body.relatedSecretIds !== undefined) next.relatedSecretIds = parseIds(body.relatedSecretIds);
  if (body.relatedNoteIds !== undefined) next.relatedNoteIds = parseIds(body.relatedNoteIds);
  next.updatedAt = nowIso();

  file.assets[idx] = next;
  await writeAssetsFile(file);
  return NextResponse.json(next);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const file = await readAssetsFile();
  const before = file.assets.length;
  file.assets = file.assets.filter((a) => a.id !== params.id);
  if (file.assets.length === before) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await writeAssetsFile(file);
  return NextResponse.json({ ok: true });
}
