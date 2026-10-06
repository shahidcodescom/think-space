import { NextRequest, NextResponse } from "next/server";
import { readStore, writeStore } from "@/lib/store";

export async function GET() {
  const store = await readStore();
  return NextResponse.json(store.profile);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const store = await readStore();
  store.profile = { ...store.profile, ...body };
  await writeStore(store);
  return NextResponse.json(store.profile);
}
