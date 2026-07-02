import { BRAND } from "@/lib/brand";

const SECTIONS = [
  { id: "abstract", title: "1. Abstract" },
  { id: "problem", title: "2. The problem" },
  { id: "solution", title: "3. The solution" },
  { id: "architecture", title: "4. Architecture" },
  { id: "permissions", title: "5. Permissions" },
  { id: "token", title: "6. Token model" },
  { id: "use-cases", title: "7. Use cases" },
  { id: "developers", title: "8. Developers & agents" },
  { id: "distillation", title: "9. Distillation & quality" },
  { id: "security", title: "10. Security & data" },
  { id: "why-now", title: "11. Why now" },
  { id: "faq", title: "12. FAQ" },
];

/** Whitepaper rendered as an in-page section (single-page site). */
export function WhitepaperSection() {
  return (
    <section id="whitepaper" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-24 sm:px-6">
      <div className="mb-10">
        <h1 className="text-5xl font-semibold tracking-tight text-ink">{BRAND.name}</h1>
        <p className="mt-3 max-w-2xl text-muted">
          {BRAND.tagline}. {BRAND.oneLiner}
        </p>
      </div>

      <div className="grid gap-10 lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:block">
          <nav className="sticky top-24 space-y-2 text-sm">
            {SECTIONS.map((s) => (
              <a key={s.id} href={`#${s.id}`} className="block text-muted transition-colors hover:text-ink">
                {s.title}
              </a>
            ))}
          </nav>
        </aside>

        <article className="prose-linked max-w-none space-y-12">
          <Block id="abstract" title="1. Abstract">
            <p>
              {BRAND.name} is a token-gated shared-memory layer for teams and AI agents. It sits on top of a team's
              existing tools — Slack, documents, GitHub, trackers, calls and CRM — and distills them into a single,
              permission-aware <em>context graph</em>: the decisions, the reasoning behind them, the action items and
              their statuses. That memory is served to people through an “ask the company” interface and to autonomous
              agents through the Model Context Protocol (MCP) and a Context API with one call:
              <code> recall(query, scope)</code>. Access is gated by holding {BRAND.symbol}; external agents pay per call
              via x402, and fees fuel buyback &amp; burn.
            </p>
            <p>
              Most teams don't lose knowledge because it was never written down — they lose it because it is smeared
              across a dozen disconnected tools, buried in scrollback, and locked behind per-tool permissions no machine
              can read. {BRAND.name} treats memory as infrastructure: a single, always-current, permission-aware layer
              that any human or agent can query in one call, instead of a pile of documents nobody re-reads.
            </p>
          </Block>

          <Block id="problem" title="2. The problem">
            <p>
              Institutional knowledge is scattered across a dozen tools and lost in chat scrollback. New hires spend
              weeks reconstructing context; engineers re-litigate settled decisions; and the new wave of AI agents has no
              reliable, permissioned way to know <em>why</em> a team does what it does. Existing search tools index
              documents but don't capture decisions, rationale or cross-tool relationships — and none expose that context
              to agents natively.
            </p>
            <p>
              The cost compounds. Decisions get silently reversed because no one remembers the original rationale; the
              same questions are answered again and again in different channels; and onboarding becomes an archaeology
              project. As teams adopt AI agents the gap widens — an agent that can't see <em>why</em> a choice was made,
              or that ignores who is allowed to see what, is worse than no agent at all.
            </p>
          </Block>

          <Block id="solution" title="3. The solution">
            <p>
              {BRAND.name} continuously ingests connected sources, mirrors their permissions, and builds a living graph
              of projects, people, decisions and threads. A distillation pipeline extracts durable facts and keeps them
              deduplicated and current. The result is a company's memory as a queryable, permission-bounded resource —
              usable by humans and machines through the same primitive.
            </p>
            <p>
              Crucially, the same primitive serves both audiences. A teammate asks a question in plain language and gets
              a cited answer; an agent calls <code>recall(query, scope)</code> and gets exactly the context it needs,
              bounded by the caller's permissions. Nothing is duplicated, nothing leaks, and the memory stays fresh as
              the underlying tools change.
            </p>
          </Block>

          <Block id="architecture" title="4. Architecture">
            <ul>
              <li><strong>Connectors</strong> pull raw items idempotently and mirror source permissions into an ACL.</li>
              <li><strong>Context graph</strong> — Postgres + pgvector stores nodes, typed edges, chunks and embeddings.</li>
              <li><strong>Distillation</strong> — an LLM extracts decisions / rationale / action items / statuses, deduped across sources.</li>
              <li><strong>Retrieval</strong> — hybrid vector + keyword search, always bounded by the caller's permissions.</li>
              <li><strong>Interfaces</strong> — an MCP server and a REST Context API expose <code>recall</code>, <code>search</code>, <code>write</code> and <code>ask</code>.</li>
            </ul>
            <p>
              Each layer is independent and idempotent: connectors re-sync without creating duplicates, distillation
              re-runs safely, and retrieval is stateless. The graph is the single source of truth, so adding a new
              connector or interface never requires re-architecting what already works.
            </p>
          </Block>

          <Block id="permissions" title="5. Permissions">
            <p>
              Every item carries an audience inherited from its source. Retrieval is filtered through this ACL, so{" "}
              {BRAND.name} never surfaces to anyone — human or agent — anything they could not already access in the
              originating tool. Multi-tenancy isolates workspaces; API keys bind a holder identity and scopes.
            </p>
            <p>
              Permissions are enforced at retrieval time, not bolted on afterwards, so there is no path by which a
              forgotten document or a clever prompt can surface restricted context. The same guarantee applies
              identically to humans and to autonomous agents — an agent inherits exactly the visibility of the identity
              that called it, never more.
            </p>
          </Block>

          <Block id="token" title="6. Token model">
            <p>{BRAND.symbol} aligns access, usage and value capture:</p>
            <ul>
              <li><strong>Hold to use.</strong> Holding {BRAND.symbol} unlocks access, capacity tiers and private namespaces.</li>
              <li><strong>Pay per context call.</strong> External agents pay per <code>recall()</code> via x402 (USDC / {BRAND.symbol}).</li>
              <li><strong>Buyback &amp; burn.</strong> Usage fees route to a treasury that buys back and burns {BRAND.symbol}.</li>
            </ul>
            <p>
              Built on {BRAND.chain}: sub-cent fees make per-call micropayments viable, and x402 settlement is
              first-class. Allocation: 50% liquidity, 20% community &amp; airdrops, 15% treasury (buyback &amp; burn), 10%
              team (vested), 5% ecosystem.
            </p>
            <p>
              Together these create a flywheel: real usage drives demand for the token to access and pay for the layer,
              fees accrue to the treasury, and buyback &amp; burn returns that value to holders — aligning the people who
              use {BRAND.name} with the people who hold {BRAND.symbol}.
            </p>
          </Block>

          <Block id="use-cases" title="7. Use cases">
            <p>
              {BRAND.name} is deliberately general — anywhere a team's knowledge is scattered and needs to be recalled
              with the right permissions, it fits. A few concrete patterns:
            </p>
            <ul>
              <li><strong>Onboarding.</strong> New hires ask “how does billing work?” or “why did we choose this stack?” and get a cited answer in seconds instead of spending weeks reconstructing context from scrollback.</li>
              <li><strong>Decision memory.</strong> Settled choices stop getting silently re-litigated — the original rationale, trade-offs and owner are one query away.</li>
              <li><strong>Agent context.</strong> Autonomous agents pull the exact, permission-bounded context they need before they act, rather than hallucinating or over-reaching.</li>
              <li><strong>Internal support.</strong> Recurring “who owns X / what's the status of Y” questions are answered by the memory layer, not by interrupting a teammate.</li>
              <li><strong>Audit &amp; continuity.</strong> When people leave, their reasoning stays; the institution remembers even as the team changes.</li>
            </ul>
            <p>
              In every case the value is the same: turn a dozen disconnected tools into one answerable, permission-aware
              memory — for people and for the agents working alongside them.
            </p>
          </Block>

          <Block id="developers" title="8. For developers & agents">
            <p>
              {BRAND.name} exposes the same memory two ways: a Model Context Protocol (MCP) server for agents and a REST
              Context API for everything else. Both speak one primitive — <code>recall(query, scope)</code> — and both are
              bounded by the caller's identity and scopes, so an integration can never see more than it is allowed to.
            </p>
            <ul>
              <li><strong>recall</strong> — fetch permission-filtered context for a query in a single call.</li>
              <li><strong>search</strong> — hybrid vector + keyword retrieval that returns ranked sources only.</li>
              <li><strong>write</strong> — append a decision, action item or note that becomes immediately retrievable.</li>
              <li><strong>ask</strong> — a streamed, cited natural-language answer over the same memory.</li>
            </ul>
            <p>
              Agents authenticate with a scoped key (or a wallet session), call <code>recall()</code> before they reason,
              and pay per call via x402 when usage-based billing applies. There is no SDK lock-in: any MCP-compatible
              client works out of the box, and the REST surface is a few plain HTTP endpoints.
            </p>
          </Block>

          <Block id="distillation" title="9. Distillation & quality">
            <p>
              Raw activity is noisy. {BRAND.name} runs a continuous distillation pass that reads ingested artifacts and
              extracts only durable facts — decisions, the reasoning behind them, action items and their statuses —
              discarding the chatter around them. Each fact records its sources, so every answer can be traced back to
              where it came from.
            </p>
            <p>
              Quality is maintained over time, not just at ingestion. Near-duplicate facts surfaced through multiple tools
              are merged so the decision log stays clean; superseded decisions are marked rather than silently dropped;
              and re-running the pipeline is idempotent, so the graph converges on a single, current view of the truth
              instead of accumulating contradictions.
            </p>
          </Block>

          <Block id="security" title="10. Security & data handling">
            <p>
              Permissions are not a feature bolted on top — they are the substrate. Every item inherits the audience of
              its source, retrieval is filtered through that ACL at query time, and access fails closed: if the system
              cannot confirm a caller is entitled to a piece of context, it is simply never returned.
            </p>
            <ul>
              <li><strong>Source-mirrored ACLs.</strong> Visibility matches the originating tool — nothing becomes more accessible by being ingested.</li>
              <li><strong>Tenant isolation.</strong> Workspaces are isolated; a key or session can only ever touch its own tenant.</li>
              <li><strong>Least exposure.</strong> Agents inherit exactly the visibility of the identity that invoked them, never more.</li>
              <li><strong>Traceability.</strong> Answers cite their sources, so every claim is auditable rather than opaque.</li>
            </ul>
            <p>
              The result is a memory layer that teams can point at sensitive tools without widening their attack surface
              — the same guarantees that protect a human reader protect an autonomous agent.
            </p>
          </Block>

          <Block id="why-now" title="11. Why now">
            <p>
              Two shifts make {BRAND.name} timely. First, teams have never been more tool-fragmented: decisions live
              across Slack, docs, trackers, code and calls, and the cost of that fragmentation grows with every new tool.
              Second, AI agents are moving from prototypes into real workflows — and an agent is only as good as the context it
              can safely reach. A permission-aware memory layer is the missing piece between “agents that sound smart” and
              “agents that know what your team actually decided.”
            </p>
            <p>
              On-chain settlement is the third enabler. Sub-cent fees and first-class x402 support on {BRAND.chain} make
              per-call micropayments viable for the first time, so usage can be priced fairly — humans hold to use, agents
              pay as they go — without subscriptions, seats or friction.
            </p>
          </Block>

          <Block id="faq" title="12. FAQ">
            <ul>
              <li><strong>Do I need to hold {BRAND.symbol} to try it?</strong> No — connect a wallet and verify to ask 10 questions free. Holding {BRAND.symbol} unlocks unlimited access and higher tiers.</li>
              <li><strong>Is my data exposed to other holders?</strong> Never. Retrieval is permission-filtered; you only ever see what your identity is allowed to see in the source tool.</li>
              <li><strong>Which tools does it connect?</strong> Slack and GitHub to start, with documents, trackers, calls and CRM on the roadmap. The connector model is uniform, so more sources slot in without re-architecting.</li>
              <li><strong>How do agents pay?</strong> Per call via x402 (USDC / {BRAND.symbol}); fees route to the treasury for buyback &amp; burn.</li>
              <li><strong>Is it a chatbot?</strong> It's a memory layer. The “ask the company” chat is one interface; agents use the same recall primitive through MCP and the Context API.</li>
            </ul>
          </Block>
        </article>
      </div>
    </section>
  );
}

function Block({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="mb-4 text-2xl font-semibold tracking-tight text-ink">{title}</h2>
      <div className="space-y-4 leading-relaxed text-ink/80 [&_code]:rounded [&_code]:bg-panel-2 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-accent [&_li]:ml-1 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6 [&_strong]:text-ink [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6">
        {children}
      </div>
    </section>
  );
}
