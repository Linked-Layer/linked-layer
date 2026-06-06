import {
  type SourceType,
  AuthError,
  NotFoundError,
  config,
  apiKeyCreateSchema,
  askRequestSchema,
  connectorConfigSchema,
  githubLinkSchema,
  recallRequestSchema,
  searchRequestSchema,
  walletChallengeSchema,
  walletVerifySchema,
  writeRequestSchema,
} from "@recall/core";
import {
  getNodeDetail,
  listDecisions,
  listNodes,
  listPeople,
  listProjects,
  listTimeline,
  sql,
} from "@recall/db";
import {
  ask,
  buildGithubAuthorizeUrl,
  createWalletChallenge,
  getUserConnectorStatus,
  handleGithubCallback,
  issueApiKey,
  linkGithub,
  listConnectors,
  listGithubRepos,
  listWorkspaceKeys,
  recall,
  revokeWorkspaceKey,
  setGithubRepos,
  unlinkUserConnector,
  verifyWalletAndIssueSession,
  writeMemory,
} from "@recall/engine";
import { enqueueIngest } from "@recall/worker";
import type { FastifyInstance } from "fastify";
import { authenticate, requireAdmin, requireScope, resolveWorkspace } from "./middleware/auth";
import { gateAskFreeTrial, getHolder, requireToken } from "./middleware/gating";
import { resolveSession } from "./middleware/session";
import { requirePayment } from "./middleware/x402";

function parsePage(q: { limit?: string; offset?: string }): { limit: number; offset: number } {
  const limit = Math.min(Math.max(Number(q.limit ?? 50) || 50, 1), 200);
  const offset = Math.max(Number(q.offset ?? 0) || 0, 0);
  return { limit, offset };
}

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  app.get("/healthz", async () => ({ ok: true, service: "recall-api" }));

  // Readiness: verify the database is reachable.
  app.get("/readyz", async (_req, reply) => {
    try {
      await sql`SELECT 1`;
      return { ok: true, db: "up" };
    } catch (err) {
      return reply.status(503).send({ ok: false, db: "down", error: (err as Error).message });
    }
  });

  // ---- wallet ownership (Sign-In-with-Solana) — public; these ARE the auth ----
  app.post("/v1/wallet/challenge", async (req) => {
    const body = walletChallengeSchema.parse(req.body);
    return createWalletChallenge(body.address);
  });

  app.post("/v1/wallet/verify", async (req) => {
    const body = walletVerifySchema.parse(req.body);
    return verifyWalletAndIssueSession({
      address: body.address,
      signatureBase64: body.signature,
      nonce: body.nonce,
    });
  });

  // ---- core: recall(query, scope) — authenticated + gated + pay-per-call ----
  app.post(
    "/v1/recall",
    { preHandler: [authenticate, resolveSession, requireScope("recall"), requireToken, requirePayment] },
    async (req) => {
      const body = recallRequestSchema.parse(req.body);
      const workspace = resolveWorkspace(req, body.scope.workspace);
      return recall({ ...body, scope: { ...body.scope, workspace }, holder: getHolder(req) });
    },
  );

  // ---- raw hybrid search ----
  app.post(
    "/v1/search",
    { preHandler: [authenticate, resolveSession, requireScope("search"), requireToken, requirePayment] },
    async (req) => {
      const body = searchRequestSchema.parse(req.body);
      const workspace = resolveWorkspace(req, body.scope.workspace);
      const result = await recall({
        query: body.query,
        scope: { ...body.scope, workspace },
        limit: body.limit,
        holder: getHolder(req),
      });
      return { query: result.query, sources: result.sources };
    },
  );

  // ---- write / annotate memory ----
  app.post("/v1/write", { preHandler: [authenticate, requireScope("write"), requireToken] }, async (req) => {
    const body = writeRequestSchema.parse(req.body);
    return writeMemory({ ...body, workspace: resolveWorkspace(req, body.workspace) });
  });

  // ---- "ask the company" (SSE stream) ----
  app.post("/v1/ask", { preHandler: [authenticate, resolveSession, requireScope("ask"), gateAskFreeTrial] }, async (req, reply) => {
    const body = askRequestSchema.parse(req.body);
    const handle = await ask({
      question: body.question,
      workspace: resolveWorkspace(req, body.scope.workspace),
      holder: getHolder(req),
      history: body.history,
      attachments: body.attachments,
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

  // ---- graph browsing (all permission-filtered, paginated) ----
  const graphPre = { preHandler: [authenticate, requireScope("recall"), requireToken] };

  app.get("/v1/graph/decisions", graphPre, async (req) => {
    const q = req.query as { workspace?: string; kind?: string; status?: string; limit?: string; offset?: string };
    const { limit, offset } = parsePage(q);
    const decisions = await listDecisions(resolveWorkspace(req, q.workspace), getHolder(req), {
      kind: q.kind,
      status: q.status,
      limit,
      offset,
    });
    return { decisions };
  });

  app.get("/v1/graph/nodes", graphPre, async (req) => {
    const q = req.query as { workspace?: string; kind?: string; limit?: string; offset?: string };
    const { limit, offset } = parsePage(q);
    const nodes = await listNodes(resolveWorkspace(req, q.workspace), { holder: getHolder(req), kind: q.kind, limit, offset });
    return { nodes };
  });

  app.get("/v1/graph/nodes/:id", graphPre, async (req) => {
    const q = req.query as { workspace?: string };
    const id = (req.params as { id: string }).id;
    const detail = await getNodeDetail(resolveWorkspace(req, q.workspace), id, getHolder(req));
    if (!detail) throw new NotFoundError(`Node ${id} not found or not permitted`);
    return detail;
  });

  app.get("/v1/graph/timeline", graphPre, async (req) => {
    const q = req.query as { workspace?: string; limit?: string; offset?: string };
    const { limit, offset } = parsePage(q);
    const timeline = await listTimeline(resolveWorkspace(req, q.workspace), { holder: getHolder(req), limit, offset });
    return { timeline };
  });

  app.get("/v1/graph/people", graphPre, async (req) => {
    const q = req.query as { workspace?: string };
    return { people: await listPeople(resolveWorkspace(req, q.workspace), getHolder(req)) };
  });

  app.get("/v1/graph/projects", graphPre, async (req) => {
    const q = req.query as { workspace?: string };
    return { projects: await listProjects(resolveWorkspace(req, q.workspace), getHolder(req)) };
  });

  // ---- connector config + sync trigger ----
  app.post("/v1/connectors/:type", { preHandler: [authenticate, requireScope("write"), requireToken] }, async (req) => {
    const type = (req.params as { type: string }).type as SourceType;
    const raw = (req.body ?? {}) as Record<string, unknown>;
    const body = connectorConfigSchema.parse({ ...raw, sourceType: type, workspace: resolveWorkspace(req, raw.workspace as string) });
    const jobId = await enqueueIngest({
      workspaceSlug: body.workspace,
      sourceType: body.sourceType,
      config: body.config,
    });
    return { enqueued: true, jobId };
  });

  app.get("/v1/connectors", { preHandler: [authenticate, requireScope("recall"), requireToken] }, async (req) => {
    const q = req.query as { workspace?: string };
    return { connectors: await listConnectors(resolveWorkspace(req, q.workspace)) };
  });

  app.post("/v1/ingest/:source/sync", { preHandler: [authenticate, requireScope("write"), requireToken] }, async (req) => {
    const source = (req.params as { source: string }).source as SourceType;
    const body = (req.body ?? {}) as { workspace?: string };
    const jobId = await enqueueIngest({ workspaceSlug: resolveWorkspace(req, body.workspace), sourceType: source });
    return { enqueued: true, jobId };
  });

  // ---- per-user GitHub connection (scoped to the verified wallet) ----
  // Authed by the Sign-In-with-Solana session; the wallet IS the data boundary.
  const walletPre = { preHandler: [authenticate, resolveSession] };
  const requireWallet = (req: import("fastify").FastifyRequest): string => {
    if (!req.walletHolder) throw new AuthError("Connect and verify a Solana wallet first");
    return req.walletHolder;
  };

  app.post("/v1/connectors/github/link", walletPre, async (req) => {
    const holder = requireWallet(req);
    const raw = (req.body ?? {}) as Record<string, unknown>;
    const body = githubLinkSchema.parse(raw);
    const workspace = resolveWorkspace(req, raw.workspace as string | undefined);
    const { repos } = await linkGithub({ holder, workspaceSlug: workspace, token: body.token, repos: body.repos });
    const jobId = await enqueueIngest({ workspaceSlug: workspace, sourceType: "github", holder });
    return { connected: true, repos, enqueued: true, jobId };
  });

  app.get("/v1/connectors/github", walletPre, async (req) => {
    return getUserConnectorStatus(requireWallet(req), "github");
  });

  app.post("/v1/connectors/github/sync", walletPre, async (req) => {
    const holder = requireWallet(req);
    const raw = (req.body ?? {}) as Record<string, unknown>;
    const jobId = await enqueueIngest({ workspaceSlug: resolveWorkspace(req, raw.workspace as string | undefined), sourceType: "github", holder });
    return { enqueued: true, jobId };
  });

  app.delete("/v1/connectors/github", walletPre, async (req) => {
    await unlinkUserConnector(requireWallet(req), "github");
    return { connected: false };
  });

  // One-click OAuth: start returns the GitHub authorize URL (front-end redirects to it).
  app.get("/v1/connectors/github/oauth/start", walletPre, async (req) => {
    const holder = requireWallet(req);
    const q = req.query as { workspace?: string };
    return { url: buildGithubAuthorizeUrl(holder, resolveWorkspace(req, q.workspace)) };
  });

  // OAuth callback (browser redirect; identity comes from the signed state, not a header).
  app.get("/v1/connectors/github/oauth/callback", async (req, reply) => {
    const q = req.query as { code?: string; state?: string };
    const base = config.github.appBaseUrl;
    if (!q.code || !q.state) return reply.redirect(`${base}/app?github=error`);
    try {
      await handleGithubCallback(q.code, q.state);
      return reply.redirect(`${base}/app?github=connected`);
    } catch {
      return reply.redirect(`${base}/app?github=error`);
    }
  });

  // Post-OAuth repo picker.
  app.get("/v1/connectors/github/repos", walletPre, async (req) => {
    return { repos: await listGithubRepos(requireWallet(req)) };
  });

  app.post("/v1/connectors/github/repos", walletPre, async (req) => {
    const holder = requireWallet(req);
    const raw = (req.body ?? {}) as { repos?: unknown; workspace?: string };
    const repos = Array.isArray(raw.repos) ? (raw.repos.filter((r) => typeof r === "string") as string[]) : [];
    const result = await setGithubRepos(holder, repos);
    const jobId = await enqueueIngest({ workspaceSlug: resolveWorkspace(req, raw.workspace), sourceType: "github", holder });
    return { ...result, enqueued: true, jobId };
  });

  // ---- key management (admin-token guarded) ----
  app.post("/v1/keys", { preHandler: [requireAdmin] }, async (req) => {
    const body = apiKeyCreateSchema.parse(req.body);
    const issued = await issueApiKey({
      workspaceSlug: body.workspace,
      name: body.name,
      holder: body.holder,
      scopes: body.scopes,
    });
    return issued; // `key` is shown ONCE
  });

  app.get("/v1/keys", { preHandler: [requireAdmin] }, async (req) => {
    const q = req.query as { workspace?: string };
    if (!q.workspace) return { keys: [] };
    return { keys: await listWorkspaceKeys(q.workspace) };
  });

  app.delete("/v1/keys/:id", { preHandler: [requireAdmin] }, async (req) => {
    await revokeWorkspaceKey((req.params as { id: string }).id);
    return { revoked: true };
  });
}
