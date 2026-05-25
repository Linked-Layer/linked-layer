import { BRAND, config } from "@recall/core";
import { buildApp } from "./app";

async function main(): Promise<void> {
  const app = await buildApp();
  await app.listen({ host: config.api.host, port: config.api.port });
  app.log.info(`${BRAND.name} (${BRAND.symbol}) Context API listening on :${config.api.port}`);
}

main().catch((err) => {
  console.error("API failed to start:", err);
  process.exit(1);
});
