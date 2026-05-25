import {
  type SourceType,
  askRequestSchema,
  connectorConfigSchema,
  recallRequestSchema,
  searchRequestSchema,
  writeRequestSchema,
} from "@recall/core";
import { relevantDistillations } from "@recall/db";
import { ask, recall, writeMemory } from "@recall/engine";
import { enqueueIngest } from "@recall/worker";
import type { FastifyInstance } from "fastify";
import { getHolder, requireToken } from "./middleware/gating";
import { requirePayment } from "./middleware/x402";

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  app.get("/healthz", async () => ({ ok: true, service: "recall-api" }));

  // ---- core: recall(query, scope) — gated + pay-per-call ----
  app.post("/v1/recall", { preHandler: [requireToken, requirePayment] }, async (req) => {
    const body = recallRequestSchema.parse(req.body);
    return recall({ ...body, holder: body.holder ?? getHolder(req) });
  });

  // ---- raw hybrid search ----
  app.post("/v1/search", { preHandler: [requireToken, requirePayment] }, async (req) => {
    const body = searchRequestSchema.parse(req.body);
    const result = await recall({
      query: body.query,
      scope: body.scope,
      limit: body.limit,
      holder: body.holder ?? getHolder(req),
    });
    return { query: result.query, sources: result.sources };
  });

  // ---- write / annotate memory ----
  app.post("/v1/write", { preHandler: [requireToken] }, async (req) => {
    const body = writeRequestSchema.parse(req.body);
    return writeMemory(body);
  });

  // ---- "ask the company" (SSE stream) ----
  app.post("/v1/ask", { preHandler: [requireToken] }, async (req, reply) => {
    const body = askRequestSchema.parse(req.body);
    const handle = await ask({
      question: body.question,
      workspace: body.scope.workspace,
      holder: body.holder ?? getHolder(req),
    });

    reply.hijack();
    const raw = reply.raw;
    raw.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive",
    });
    const send = (event: string, data: unknown) => raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

    send("sources", handle.retrieval.sources);
    send("decisions", handle.retrieval.decisions);
    try {
      for await (const token of handle.stream) send("token", token);
      send("done", { ok: true });
    } catch (err) {
      send("error", { message: (err as Error).message });
    }
    raw.end();
  });

  // ---- decision log ----
  app.get("/v1/graph/decisions", { preHandler: [requireToken] }, async (req) => {
    const q = req.query as { workspace?: string; limit?: string };
    if (!q.workspace) return { decisions: [] };
    const decisions = await relevantDistillations(q.workspace, "", getHolder(req), Number(q.limit ?? 20));
    return { decisions };
  });

  // ---- connector config + sync trigger ----
  app.post("/v1/connectors/:type", { preHandler: [requireToken] }, async (req) => {
    const type = (req.params as { type: string }).type as SourceType;
    const body = connectorConfigSchema.parse({ ...(req.body as object), sourceType: type });
    const jobId = await enqueueIngest({
      workspaceSlug: body.workspace,
      sourceType: body.sourceType,
      config: body.config,
    });
    return { enqueued: true, jobId };
  });

  app.post("/v1/ingest/:source/sync", { preHandler: [requireToken] }, async (req) => {
    const source = (req.params as { source: string }).source as SourceType;
    const body = (req.body ?? {}) as { workspace?: string };
    if (!body.workspace) throw new Error("workspace is required");
    const jobId = await enqueueIngest({ workspaceSlug: body.workspace, sourceType: source });
    return { enqueued: true, jobId };
  });
}
