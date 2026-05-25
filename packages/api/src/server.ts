import { BRAND, config } from "@recall/core";
import { buildApp } from "./app";

async function main(): Promise<void> {
  const app = await buildApp();
  await app.listen({ host: config.api.host, port: config.api.port });
  app.log.info(`${BRAND.name} (${BRAND.symbol}) Context API listening on :${config.api.port}`);

  const shutdown = async (signal: string) => {
    app.log.info(`${signal} received, shutting down`);
    try {
      await app.close();
      process.exit(0);
    } catch (err) {
      app.log.error(err);
      process.exit(1);
    }
  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err) => {
  console.error("API failed to start:", err);
  process.exit(1);
});
