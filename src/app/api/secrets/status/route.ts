import { NextResponse } from "next/server";
import { getVaultStatus } from "@/lib/crypto";

export async function GET() {
  const status = await getVaultStatus();
  return NextResponse.json(status);
}
