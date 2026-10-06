import { NextRequest, NextResponse } from "next/server";
import {
  readSecretCategoriesFile,
  writeSecretCategoriesFile,
} from "@/lib/secret-categories-store";
import { nowIso } from "@/lib/store";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const name = String(body.name || "").trim();
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (name.length > 64) {
    return NextResponse.json(
      { error: "Name must be 64 characters or fewer" },
      { status: 400 }
    );
  }

  const file = await readSecretCategoriesFile();
  const idx = file.categories.findIndex((c) => c.id === params.id);
  if (idx < 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const dup = file.categories.some(
    (c) =>
      c.id !== params.id && c.name.toLowerCase() === name.toLowerCase()
  );
  if (dup) {
    return NextResponse.json(
      { error: "Category already exists" },
      { status: 409 }
    );
  }

  const next = {
    ...file.categories[idx],
    name,
    updatedAt: nowIso(),
  };
  file.categories[idx] = next;
  await writeSecretCategoriesFile(file);
  return NextResponse.json(next);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const file = await readSecretCategoriesFile();
  const before = file.categories.length;
  file.categories = file.categories.filter((c) => c.id !== params.id);
  if (file.categories.length === before) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await writeSecretCategoriesFile(file);
  // Secrets keep their category name string — no cascade rewrite.
  return NextResponse.json({ ok: true });
}
