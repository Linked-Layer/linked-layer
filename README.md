# Recall ($RECALL)

> Token-gated shared-memory / context layer for teams and agents.

Recall sits on top of a team's tools, builds a **permission-aware context graph**
(projects, people, decisions, threads, links, timelines), continuously **distills**
decisions / the "why" / action items / statuses with an LLM, and serves that context
to **people** ("ask the company") and to **AI agents** through **MCP** and a **Context API**
with a single call:

```ts
recall(query, scope)
```

Access is **token-gated** (hold `$RECALL` to use; capacity tiers / namespaces) and external
agents **pay per context call** via **x402** → usage/fee → buyback & burn.

> ⚠️ This iteration is the **backend skeleton**. Monetization (gating, x402, treasury) is wired
> behind clean interfaces but **stubbed — no chain integration yet**. Connectors other than the
> built-in `sample` are stubs. No frontend.

## Architecture

```
packages/
  core/        domain types, graph model, zod schemas, brand config, errors
  db/          Postgres + pgvector (Drizzle), migrations, repositories
  connectors/  Connector interface + sample + github/slack stubs
  distill/     LLM distillation pipeline (decisions / why / action items)
  embed/       embeddings provider abstraction (voyage | stub)
  gating/      TokenGate + x402 PaymentGate + Treasury  (STUBS)
  api/         Fastify Context API: recall/search/write/ask/connectors/ingest
  mcp/         MCP server exposing recall/search/write
  worker/      BullMQ workers: ingest -> distill -> embed
```

### Data pipeline

`Connector.pull()` → `raw_ingest` → **normalize** → graph `nodes` + `acl` →
**distill (LLM)** → `decision` / `action_item` nodes → **embed** → `chunks` + `embeddings`
(pgvector) → **`recall(query, scope)`** = permission-filtered hybrid search → context bundle.

## Quickstart

```bash
corepack enable                 # provides pnpm
pnpm install
cp .env.example .env            # set ANTHROPIC_API_KEY (and VOYAGE_API_KEY if EMBED_PROVIDER=voyage)

docker compose up -d            # Postgres + pgvector, Redis
pnpm db:migrate                 # apply schema (creates the `vector` extension)
pnpm seed                       # ingest -> distill -> embed the sample workspace

pnpm api                        # Context API on :8080
pnpm worker                     # background ingest/distill/embed workers
pnpm mcp                        # MCP server (stdio) exposing recall()
```

### Try it

```bash
curl -s localhost:8080/v1/recall \
  -H 'content-type: application/json' \
  -H 'x-recall-holder: demo-holder' \
  -d '{"query":"why did we pick Solana?","scope":{"workspace":"acme"}}' | jq
```

## Configuration

All config is read from environment (see [.env.example](.env.example)). Brand/token identity
(name `Recall`, ticker `$RECALL`, mint) lives in [packages/core/src/brand.ts](packages/core/src/brand.ts)
— the single place to change naming.

## Status / not in this iteration

- Real Solana / pump.fun token, real x402 settlement (interfaces only).
- Production OAuth connectors (Slack, GitHub, Drive, Notion, Linear/Jira, CRM, calls) — stubs.
- Frontend ("ask the company" UI + memory dashboard).
