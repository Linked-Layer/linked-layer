# Linked Layer · $LINKED

**Shared memory for teams & agents.** A token-gated context layer over all your
tools — collected into a permission-aware graph and served to people and AI agents
in a single call: `recall(query, scope)`.

🌐 [linkedlayer.xyz](https://linkedlayer.xyz) · ⛓ Solana

---

## The problem

A team's knowledge is scattered across Slack, GitHub, Notion, Drive, Linear and
call transcripts. The *why* behind decisions lives in someone's head or buried in a
thread. New hires spend weeks reconstructing context, decisions get silently
re-litigated, and AI agents act on stale or hallucinated information.

**Linked Layer turns that scattered activity into one living, permission-aware
memory** that both people and agents can query.

## How it works

1. **Connect sources** — Slack, GitHub, Notion, Drive, Linear & more ingest into one place; permissions mirrored from each source.
2. **Build the graph** — a permission-aware context graph of projects, people, decisions and threads, kept current by incremental sync.
3. **Distill** — an LLM continuously extracts decisions, the "why", action items and statuses (deduped).
4. **Recall** — people ask in plain language; agents call `recall()` over MCP. Same memory, same permission bounds.

## Key features

- **Permission-aware by default** — retrieval is filtered through each item's source ACL at query time and *fails closed*. Nothing is surfaced that the caller couldn't already see.
- **One primitive, two audiences** — humans ask in a chat; agents call `recall()` over MCP / the Context API.
- **Cited & traceable** — every answer links back to the exact source nodes it used.
- **Always-current** — incremental, deduped sync keeps the graph fresh.
- **Token-gated + pay-per-call** — hold `$LINKED` to use the layer; external agents pay per `recall()` via x402. Fees fuel buyback & burn.

## Tech stack

TypeScript · pnpm monorepo · Fastify · Drizzle ORM · Postgres + pgvector · BullMQ ·
Solana Web3.js · React · Vite · Tailwind · Framer Motion

```
apps/
  web/         landing + "ask the company" chat (Vite + React + TS)
packages/
  core/        domain types, graph model, zod schemas, config
  db/          Postgres + pgvector (Drizzle), hybrid search
  embed/       embeddings provider abstraction (Voyage | stub)
  connectors/  GitHub, Notion, Slack + connector interface
  distill/     LLM distillation — decisions / why / action items
  gating/      Solana SPL token gate + Sign-In-with-Solana + x402
  engine/      orchestration: ingest → distill → embed → recall
  api/         Fastify Context API + OpenAPI/Swagger
  mcp/         MCP server — recall / search / write
  worker/      BullMQ background workers + scheduler
```

## Quickstart (local dev)

```bash
pnpm install
cp .env.example .env          # LLM/embedding keys are optional

docker compose up -d          # Postgres + pgvector + Redis
pnpm db:migrate

pnpm dev                      # API + worker
pnpm web                      # frontend on :5173
pnpm test                     # vitest
```

No LLM key? A heuristic fallback keeps the pipeline running. No embedding key? Stub
embeddings work out of the box — zero hard dependencies for local development.

## MCP — plug into any AI agent

```json
{
  "mcpServers": {
    "linked": {
      "command": "npx",
      "args": ["-y", "linked-layer-mcp"],
      "env": { "RECALL_API_KEY": "your-key" }
    }
  }
}
```

Your agent now has `recall()`, `search()` and `write()` — grounded in your team's
real history, bounded by its real permissions.

## Roadmap

- [ ] Discord & Telegram connector
- [ ] Multi-workspace support (cross-org recall with ACL firewall)
- [ ] Streaming recall via SSE
- [ ] `$LINKED` staking tiers — higher rate limits & priority indexing
- [ ] On-chain proof of recall (Solana attestation per answer)
- [ ] Self-hosted deployment guide (Kubernetes helm chart)

## License

MIT
