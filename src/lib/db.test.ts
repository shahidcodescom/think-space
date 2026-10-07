import assert from "node:assert/strict";
import { ensureDatabase, requireDatabaseUrl, DatabaseConfigError } from "./db";
import { getDoc, setDoc } from "./db-docs";

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    try {
      requireDatabaseUrl();
      assert.fail("expected DatabaseConfigError");
    } catch (err) {
      assert.ok(err instanceof DatabaseConfigError);
    }
    console.log("db.test.ts: ok (missing URL throws)");
    return;
  }

  await ensureDatabase();
  await setDoc("db-test", { hello: "world" });
  const got = await getDoc<{ hello: string }>("db-test");
  assert.equal(got?.hello, "world");
  console.log("db.test.ts: ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
