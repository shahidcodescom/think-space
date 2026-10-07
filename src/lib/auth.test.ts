import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import {
  buildSessionPayload,
  signSession,
  verifySession,
  getSessionSecret,
} from "./auth-session";

async function main() {
  const hash = await bcrypt.hash("correct-horse-battery", 12);
  assert.ok(hash.startsWith("$2"));
  assert.equal(await bcrypt.compare("correct-horse-battery", hash), true);
  assert.equal(await bcrypt.compare("wrong-password", hash), false);

  const payload = buildSessionPayload("user-1", "shahid");
  const token = signSession(payload, "test-secret");
  const parsed = verifySession(token, "test-secret");
  assert.ok(parsed);
  assert.equal(parsed!.userId, "user-1");
  assert.equal(parsed!.username, "shahid");
  assert.equal(verifySession(token, "other-secret"), null);
  assert.equal(verifySession("nope"), null);

  // Default secret path still signs/verifies consistently
  const t2 = signSession(payload, getSessionSecret());
  assert.ok(verifySession(t2, getSessionSecret()));

  console.log("auth.test.ts: ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
