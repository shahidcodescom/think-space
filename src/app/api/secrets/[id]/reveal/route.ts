import { NextRequest, NextResponse } from "next/server";
import { decryptSecret, maskPreview } from "@/lib/crypto";
import { readSecretsFile } from "@/lib/secrets-store";

/**
 * Explicit reveal endpoint — the only place plaintext is returned.
 * Prefer POST so it is not cached / accidentally linked.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const file = await readSecretsFile();
  const secret = file.secrets.find((s) => s.id === params.id);
  if (!secret) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const value = await decryptSecret(secret.valueCiphertext);
    return NextResponse.json({
      id: secret.id,
      value,
      preview: maskPreview(value),
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to decrypt. Master key may have changed." },
      { status: 500 }
    );
  }
}
