import { BRAND, config, isRecallError } from "@recall/core";
import rateLimit from "@fastify/rate-limit";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
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

  await app.register(rateLimit, {
    max: config.api.rateLimitMax,
    timeWindow: config.api.rateLimitWindowMs,
    // Rate-limit per API key when present, else per IP.
    keyGenerator: (req) => {
      const h = req.headers.authorization;
      return (Array.isArray(h) ? h[0] : h) ?? req.ip;
    },
  });

  app.setNotFoundHandler((req, reply) => {
    reply.status(404).send({ error: { code: "not_found", message: `Route ${req.method} ${req.url} not found` } });
  });

  app.setErrorHandler((err: unknown, _req, reply) => {
    if (err instanceof ZodError) {
      return reply.status(400).send({ error: { code: "validation_error", message: "Invalid request", details: err.issues } });
    }
    if (isRecallError(err)) {
      // x402 challenge: surface the payment details in a standard header too.
      if (err.status === 402) reply.header("x-accept-payment", JSON.stringify(err.details ?? {}));
      return reply.status(err.status).send({ error: { code: err.code, message: err.message, details: err.details } });
    }
    // Fastify-native errors (rate limit 429, body parse 400, ...) carry a statusCode.
    const status = (err as { statusCode?: number })?.statusCode;
    const message = err instanceof Error ? err.message : String(err);
    if (typeof status === "number" && status >= 400 && status < 600) {
      const code = String((err as { code?: string })?.code ?? "error").toLowerCase();
      return reply.status(status).send({ error: { code, message } });
    }
    app.log.error(err);
    return reply.status(500).send({ error: { code: "internal_error", message } });
  });

  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title: `${BRAND.name} Context API`,
        version: "0.1.0",
        description: `Token-gated shared-memory / context layer. Authenticate with a workspace API key: \`Authorization: Bearer <key>\`. Key management requires the \`x-admin-token\` header.`,
      },
      components: {
        securitySchemes: {
          bearerAuth: { type: "http", scheme: "bearer" },
          adminToken: { type: "apiKey", in: "header", name: "x-admin-token" },
        },
      },
    },
  });
  await app.register(fastifySwaggerUi, { routePrefix: "/docs" });

  await registerRoutes(app);
  return app;
}
