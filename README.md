# Linked Layer

**$LINKED** — token-gated shared memory and context layer for teams and AI agents.

Connect your tools. Let your team and your agents share a single, living memory of what's happening, what was decided, and why.

---

## Why Linked Layer?

Modern teams use dozens of tools — GitHub, Slack, Notion, Linear. Every decision, every "why we shipped this", every action item lives in a different silo. When a new person joins or an AI agent needs context, they get noise instead of knowledge.

**Linked Layer fixes this.** It continuously ingests your tools, distills the important stuff — decisions, action items, context — into a permission-aware memory graph, and serves it to people and agents with a single call: `recall(query, scope)`.

---

## What it does

- **Ingests** GitHub, Slack, and other connectors into a unified context graph
- **Distills** with an LLM — decisions, "why we did this", action items, statuses — deduplicated automatically
- **Embeds** everything with pgvector for hybrid (semantic + keyword) search
- **Gates** access with real Solana wallet auth (SIWS) + on-chain `$LINKED` SPL balance check
- **Serves** memory via a Context API (`/recall`, `/search`, `/ask`) and a native **MCP server** — plug directly into any AI agent or IDE

---

## Key features

| Feature | Details |
|---|---|
| MCP server | Native Model Context Protocol — works with Claude, Cursor, any MCP-compatible agent |
| Permission-aware | Access control mirrors the source — if you can't see it in Slack, you can't recall it |
| Token-gated | Real Solana SPL balance check + Sign-In-with-Solana (SIWS) |
| LLM-distilled memory | Decisions and action items extracted from raw messages with full rationale |
| Hybrid search | pgvector semantic + full-text, filtered by your permission scope |
| Works without API keys | Heuristic fallback distiller + stub embeddings — the pipeline stays fully functional |
| Single-container deploy | One `docker compose up` — Postgres + pgvector + Redis + API + worker |

---

## Stack

TypeScript · pnpm monorepo · Fastify · Drizzle ORM · Postgres + pgvector · BullMQ · Solana Web3.js · React · Vite

```
packages/
  core/        domain types, graph model, zod schemas, auth helpers
  db/          Postgres + pgvector (Drizzle ORM), hybrid search
  embed/       embeddings provider abstraction (Voyage AI | stub)
  connectors/  GitHub, Slack connectors + connector interface
  distill/     LLM distillation pipeline — decisions / why / action items
  gating/      Solana SPL token gate + SIWS + x402 payment gate
  engine/      orchestration: ingest → distill → embed → recall
  api/         Fastify Context API + OpenAPI/Swagger
  mcp/         MCP server — recall / search / write
  worker/      BullMQ background workers + scheduler
```

---

## Quickstart

```bash
pnpm install
cp .env.example .env        # add PERPLEXITY_API_KEY or ANTHROPIC_API_KEY (optional)

docker compose up -d        # Postgres + pgvector + Redis
pnpm db:migrate
pnpm seed                   # ingest sample workspace, prints your API key

pnpm api                    # Context API on :8080  →  /docs for Swagger UI
pnpm worker                 # background ingest + distill + embed
pnpm mcp                    # MCP server (stdio) — set RECALL_API_KEY
```

No LLM key? The heuristic fallback keeps everything running. No Voyage key? Stub embeddings work out of the box. Zero hard dependencies for local development.

---

## MCP — plug into any AI agent

Add to your MCP config:

```json
{
  "mcpServers": {
    "mnemo": {
      "command": "npx",
      "args": ["-y", "linked-layer-mcp"],
      "env": {
        "RECALL_API_KEY": "your-key"
      }
    }
  }
}
```

Your agent now has `recall()`, `search()`, and `write()` — grounded in your team's real history.

---

## Token gating

Access requires holding `$LINKED` on Solana. Authentication is done with Sign-In-with-Solana (SIWS) — no passwords, no OAuth. Your wallet proves your identity and your balance proves your access tier.

---

## License

MIT
