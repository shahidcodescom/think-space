import { encryptSecret, decryptSecret, maskPreview, valueFingerprint } from "./crypto";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

async function main() {
  const plain = "sb_demo_sk_live_secret_value";
  const cipher = await encryptSecret(plain);
  assert(cipher.split(".").length === 3, "ciphertext format");
  assert(!cipher.includes(plain), "ciphertext must not contain plaintext");
  const back = await decryptSecret(cipher);
  assert(back === plain, "round-trip decrypt");
  assert(maskPreview(plain).includes("•"), "mask has bullets");
  assert(!maskPreview(plain).includes("live_secret"), "mask hides middle");
  assert(valueFingerprint(plain).length === 12, "fingerprint length");
  console.log("crypto.test.ts: all assertions passed");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
