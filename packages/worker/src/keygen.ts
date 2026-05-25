import { type ApiScope, BRAND } from "@recall/core";
import { closeDb } from "@recall/db";
import { issueApiKey } from "@recall/engine";

/**
 * Mint an API key from the CLI:
 *   tsx packages/worker/src/keygen.ts <workspace> <holder> [name] [scopesCsv]
 */
async function main(): Promise<void> {
  const [workspace, holder, name = "cli", scopesCsv] = process.argv.slice(2);
  if (!workspace || !holder) {
    console.error("usage: keygen <workspace> <holder> [name] [scopesCsv]");
    process.exit(2);
  }
  const scopes = scopesCsv ? (scopesCsv.split(",").map((s) => s.trim()) as ApiScope[]) : undefined;
  const issued = await issueApiKey({ workspaceSlug: workspace, name, holder, scopes });
  console.log(`Issued ${BRAND.name} API key (store it now — shown once):\n`);
  console.log(`  ${issued.key}\n`);
  console.log(`  workspace=${issued.workspaceSlug} holder=${issued.holder} scopes=${issued.scopes.join(",")}`);
}

main()
  .then(() => closeDb())
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error("keygen failed:", err);
    await closeDb();
    process.exit(1);
  });
