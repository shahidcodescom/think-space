import { NextRequest, NextResponse } from "next/server";
import { readAssetsFile, writeAssetsFile } from "@/lib/assets-store";
import { nowIso, uid } from "@/lib/store";
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

function normalizeAsset(body: Record<string, unknown>, base?: Asset): Asset {
  const type = (TYPES.includes(body.type as AssetType) ? body.type : base?.type || "Other") as AssetType;
  const status = (STATUSES.includes(body.status as AssetStatus)
    ? body.status
    : base?.status || "Active") as AssetStatus;
  let value: number | null = base?.value ?? null;
  if (body.value === null || body.value === "") value = null;
  else if (body.value !== undefined) {
    const n = Number(body.value);
    value = Number.isFinite(n) ? n : null;
  }

  return {
    id: base?.id || uid("asset"),
    name: String(body.name ?? base?.name ?? "Untitled asset").trim() || "Untitled asset",
    type,
    status,
    serial: String(body.serial ?? base?.serial ?? "").trim(),
    purchaseDate: String(body.purchaseDate ?? base?.purchaseDate ?? "").slice(0, 10),
    value,
    location: String(body.location ?? base?.location ?? "").trim(),
    owner: String(body.owner ?? base?.owner ?? "").trim(),
    tags: body.tags !== undefined ? parseTags(body.tags) : base?.tags || [],
    notes: String(body.notes ?? base?.notes ?? ""),
    relatedSecretIds:
      body.relatedSecretIds !== undefined
        ? parseIds(body.relatedSecretIds)
        : base?.relatedSecretIds || [],
    relatedNoteIds:
      body.relatedNoteIds !== undefined
        ? parseIds(body.relatedNoteIds)
        : base?.relatedNoteIds || [],
    createdAt: base?.createdAt || nowIso(),
    updatedAt: nowIso(),
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const status = searchParams.get("status");
  const q = (searchParams.get("q") || "").toLowerCase().trim();

  const file = await readAssetsFile();
  let assets = file.assets;

  if (type && TYPES.includes(type as AssetType)) {
    assets = assets.filter((a) => a.type === type);
  }
  if (status && STATUSES.includes(status as AssetStatus)) {
    assets = assets.filter((a) => a.status === status);
  }
  if (q) {
    assets = assets.filter((a) => {
      const hay = `${a.name} ${a.serial} ${a.tags.join(" ")} ${a.location} ${a.owner}`.toLowerCase();
      return hay.includes(q);
    });
  }

  return NextResponse.json(assets);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!String(body.name || "").trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  const asset = normalizeAsset(body);
  const file = await readAssetsFile();
  file.assets.unshift(asset);
  await writeAssetsFile(file);
  return NextResponse.json(asset, { status: 201 });
}
