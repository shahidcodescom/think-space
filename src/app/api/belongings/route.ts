import { NextRequest, NextResponse } from "next/server";
import {
  groupByLocation,
  readBelongingsFile,
  writeBelongingsFile,
} from "@/lib/belongings-store";
import { nowIso, uid } from "@/lib/store";
import { Belonging, BelongingStatus } from "@/lib/types";

const STATUSES: BelongingStatus[] = [
  "with_me",
  "stored",
  "lent_out",
  "missing",
];

function parseTags(raw: unknown, fallback: string[] = []): string[] {
  if (Array.isArray(raw)) {
    return raw.map((t) => String(t).trim()).filter(Boolean);
  }
  if (typeof raw === "string") {
    return raw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }
  return fallback;
}

function normalize(
  body: Record<string, unknown>,
  base?: Belonging
): Belonging {
  const status = STATUSES.includes(body.status as BelongingStatus)
    ? (body.status as BelongingStatus)
    : base?.status || "stored";

  let quantity = base?.quantity ?? 1;
  if (body.quantity !== undefined) {
    const n = Number(body.quantity);
    quantity = Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
  }

  return {
    id: base?.id || uid("bel"),
    name: String(body.name ?? base?.name ?? "Untitled").trim() || "Untitled",
    category: String(body.category ?? base?.category ?? "Other").trim() || "Other",
    location: String(body.location ?? base?.location ?? "").trim(),
    photoUrl: String(body.photoUrl ?? base?.photoUrl ?? "").trim(),
    photoNote: String(body.photoNote ?? base?.photoNote ?? "").trim(),
    tags: body.tags !== undefined ? parseTags(body.tags) : base?.tags || [],
    quantity,
    status,
    notes: String(body.notes ?? base?.notes ?? ""),
    linkedAssetId:
      body.linkedAssetId === null || body.linkedAssetId === ""
        ? null
        : body.linkedAssetId !== undefined
          ? String(body.linkedAssetId)
          : base?.linkedAssetId ?? null,
    createdAt: base?.createdAt || nowIso(),
    updatedAt: nowIso(),
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const category = searchParams.get("category");
  const location = (searchParams.get("location") || "").toLowerCase().trim();
  const q = (searchParams.get("q") || "").toLowerCase().trim();
  const group = searchParams.get("group");

  const file = await readBelongingsFile();
  let items = file.belongings;

  if (status && STATUSES.includes(status as BelongingStatus)) {
    items = items.filter((b) => b.status === status);
  }
  if (category) {
    items = items.filter(
      (b) => b.category.toLowerCase() === category.toLowerCase()
    );
  }
  if (location) {
    items = items.filter((b) => b.location.toLowerCase().includes(location));
  }
  if (q) {
    items = items.filter((b) =>
      `${b.name} ${b.category} ${b.location} ${b.photoNote} ${b.notes} ${b.tags.join(" ")}`
        .toLowerCase()
        .includes(q)
    );
  }

  items = [...items].sort((a, b) => a.name.localeCompare(b.name));

  if (group === "location") {
    return NextResponse.json({
      belongings: items,
      byLocation: groupByLocation(items),
    });
  }

  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!String(body.name || "").trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  const item = normalize(body);
  const file = await readBelongingsFile();
  file.belongings.unshift(item);
  await writeBelongingsFile(file);
  return NextResponse.json(item, { status: 201 });
}
