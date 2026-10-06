import { NextRequest, NextResponse } from "next/server";
import {
  readBelongingsFile,
  writeBelongingsFile,
} from "@/lib/belongings-store";
import { nowIso } from "@/lib/store";
import { BelongingStatus } from "@/lib/types";

const STATUSES: BelongingStatus[] = [
  "with_me",
  "stored",
  "lent_out",
  "missing",
];

function parseTags(raw: unknown): string[] | undefined {
  if (raw === undefined) return undefined;
  if (Array.isArray(raw)) {
    return raw.map((t) => String(t).trim()).filter(Boolean);
  }
  if (typeof raw === "string") {
    return raw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }
  return [];
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const file = await readBelongingsFile();
  const item = file.belongings.find((b) => b.id === params.id);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(item);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const file = await readBelongingsFile();
  const idx = file.belongings.findIndex((b) => b.id === params.id);
  if (idx < 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const next = { ...file.belongings[idx] };

  if (typeof body.name === "string" && body.name.trim()) next.name = body.name.trim();
  if (typeof body.category === "string") {
    next.category = body.category.trim() || "Other";
  }
  if (typeof body.location === "string") next.location = body.location.trim();
  if (typeof body.photoUrl === "string") next.photoUrl = body.photoUrl.trim();
  if (typeof body.photoNote === "string") next.photoNote = body.photoNote.trim();
  const tags = parseTags(body.tags);
  if (tags !== undefined) next.tags = tags;
  if (body.quantity !== undefined) {
    const n = Number(body.quantity);
    if (Number.isFinite(n) && n > 0) next.quantity = Math.floor(n);
  }
  if (STATUSES.includes(body.status)) next.status = body.status;
  if (typeof body.notes === "string") next.notes = body.notes;
  if (body.linkedAssetId !== undefined) {
    next.linkedAssetId =
      body.linkedAssetId === null || body.linkedAssetId === ""
        ? null
        : String(body.linkedAssetId);
  }

  next.updatedAt = nowIso();
  file.belongings[idx] = next;
  await writeBelongingsFile(file);
  return NextResponse.json(next);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const file = await readBelongingsFile();
  const before = file.belongings.length;
  file.belongings = file.belongings.filter((b) => b.id !== params.id);
  if (file.belongings.length === before) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await writeBelongingsFile(file);
  return NextResponse.json({ ok: true });
}
