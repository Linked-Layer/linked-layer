import { config, isRecallError } from "@recall/core";
import Fastify, { type FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { registerRoutes } from "./routes";

/** Build the Fastify app (no listen) — used by the server entrypoint and tests. */
export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: { level: config.api.logLevel },
    disableRequestLogging: config.api.logLevel !== "debug",
  });

  app.decorateRequest("auth", undefined);

  app.setErrorHandler((err: unknown, _req, reply) => {
    if (err instanceof ZodError) {
      return reply.status(400).send({ error: { code: "validation_error", message: "Invalid request", details: err.issues } });
    }
    if (isRecallError(err)) {
      // x402 challenge: surface the payment details in a standard header too.
      if (err.status === 402) reply.header("x-accept-payment", JSON.stringify(err.details ?? {}));
      return reply.status(err.status).send({ error: { code: err.code, message: err.message, details: err.details } });
    }
    const message = err instanceof Error ? err.message : String(err);
    app.log.error(err);
    return reply.status(500).send({ error: { code: "internal_error", message } });
  });

  await registerRoutes(app);
  return app;
}
