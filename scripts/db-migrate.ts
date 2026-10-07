import { ensureDatabase, requireDatabaseUrl } from "../src/lib/db";

async function main() {
  const url = requireDatabaseUrl();
  console.log("Migrating", url.replace(/:[^:@/]+@/, ":***@"));
  await ensureDatabase();
  console.log("OK — app_documents + rag_embeddings ready.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
