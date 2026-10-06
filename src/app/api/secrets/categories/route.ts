import { NextRequest, NextResponse } from "next/server";
import {
  readSecretCategoriesFile,
  writeSecretCategoriesFile,
} from "@/lib/secret-categories-store";
import { nowIso, uid } from "@/lib/store";
import { SecretCategory } from "@/lib/types";

export async function GET() {
  const file = await readSecretCategoriesFile();
  const sorted = [...file.categories].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  );
  return NextResponse.json(sorted);
}

export async function POST(req: NextRequest) {
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
  const dup = file.categories.some(
    (c) => c.name.toLowerCase() === name.toLowerCase()
  );
  if (dup) {
    return NextResponse.json(
      { error: "Category already exists" },
      { status: 409 }
    );
  }

  const ts = nowIso();
  const record: SecretCategory = {
    id: uid("sec-cat"),
    name,
    createdAt: ts,
    updatedAt: ts,
  };
  file.categories.push(record);
  await writeSecretCategoriesFile(file);
  return NextResponse.json(record, { status: 201 });
}
