export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensureDatabase, DatabaseConfigError } = await import("./lib/db");
    try {
      await ensureDatabase();
      console.info("[db] schema ready");
    } catch (err) {
      if (err instanceof DatabaseConfigError) {
        console.error(`[db] ${err.message}`);
        return;
      }
      console.error("[db] migration failed", err);
    }
  }
}
