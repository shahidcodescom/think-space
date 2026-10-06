import { NextRequest, NextResponse } from "next/server";
import { readCalendarFile, writeCalendarFile } from "@/lib/calendar-store";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const file = await readCalendarFile();
  const idx = file.tempLinks.findIndex((l) => l.id === params.id);
  if (idx < 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const next = { ...file.tempLinks[idx] };
  if (body.action === "revoke") {
    next.revoked = true;
  } else {
    if (typeof body.label === "string") next.label = body.label.trim();
    if (typeof body.expiresAt === "string") next.expiresAt = body.expiresAt;
    if (typeof body.revoked === "boolean") next.revoked = body.revoked;
    if (Array.isArray(body.dates)) {
      next.dates = body.dates.map((d: unknown) => String(d).slice(0, 10));
    }
  }

  file.tempLinks[idx] = next;
  await writeCalendarFile(file);
  return NextResponse.json(next);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const file = await readCalendarFile();
  const before = file.tempLinks.length;
  file.tempLinks = file.tempLinks.filter((l) => l.id !== params.id);
  if (file.tempLinks.length === before) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await writeCalendarFile(file);
  return NextResponse.json({ ok: true });
}
