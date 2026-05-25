import { type AuthContext, BRAND, ForbiddenError, config } from "@recall/core";
import { authenticateBearer, recall, writeMemory } from "@recall/engine";
import { getTokenGate } from "@recall/gating";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

type ToolResult = { content: { type: "text"; text: string }[]; isError?: boolean };

function text(value: unknown): ToolResult {
  return { content: [{ type: "text", text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }] };
}

/** Resolve workspace/holder: a configured API key wins; else fall back to args (dev mode). */
function resolve(principal: AuthContext | null, argWorkspace?: string, argHolder?: string) {
  const workspace = principal?.workspaceSlug ?? argWorkspace;
  const holder = principal?.holder ?? argHolder;
  if (!workspace) throw new Error("workspace is required (or configure RECALL_API_KEY)");
  return { workspace, holder };
}

async function gate(holder: string | undefined): Promise<void> {
  if (!config.gating.enabled) return;
  await getTokenGate().requireBalance(holder, config.gating.minBalance);
}

export function buildMcpServer(principal: AuthContext | null): McpServer {
  const server = new McpServer({ name: "recall", version: "0.1.0" });
  const hasScope = (s: string) =>
    !principal || principal.scopes.includes(s as never) || principal.scopes.includes("admin");

  server.tool(
    "recall",
    `Recall (${BRAND.symbol}) shared team memory: fetch permission-aware context for a query in one call.`,
    {
      query: z.string().describe("What to recall, e.g. 'why did we pick Solana?'"),
      workspace: z.string().optional().describe("Workspace slug (ignored if RECALL_API_KEY is set)"),
      holder: z.string().optional().describe("Caller identity ($RECALL holder); bounds permissions"),
      limit: z.number().int().positive().max(50).optional(),
    },
    async ({ query, workspace, holder, limit }): Promise<ToolResult> => {
      try {
        if (!hasScope("recall")) throw new ForbiddenError("API key missing scope: recall");
        const r = resolve(principal, workspace, holder);
        await gate(r.holder);
        return text(await recall({ query, scope: { workspace: r.workspace }, holder: r.holder, limit }));
      } catch (err) {
        return { ...text(`recall failed: ${(err as Error).message}`), isError: true };
      }
    },
  );

  server.tool(
    "search",
    "Hybrid (vector + keyword) search over team memory; returns ranked sources only.",
    {
      query: z.string(),
      workspace: z.string().optional(),
      holder: z.string().optional(),
      limit: z.number().int().positive().max(50).optional(),
    },
    async ({ query, workspace, holder, limit }): Promise<ToolResult> => {
      try {
        if (!hasScope("search")) throw new ForbiddenError("API key missing scope: search");
        const r = resolve(principal, workspace, holder);
        await gate(r.holder);
        const result = await recall({ query, scope: { workspace: r.workspace }, holder: r.holder, limit });
        return text({ query: result.query, sources: result.sources });
      } catch (err) {
        return { ...text(`search failed: ${(err as Error).message}`), isError: true };
      }
    },
  );

  server.tool(
    "write",
    "Write or annotate team memory (decision / action_item / note); immediately retrievable.",
    {
      workspace: z.string().optional(),
      kind: z.enum(["decision", "action_item", "source_object"]),
      title: z.string(),
      body: z.string().default(""),
      audience: z.array(z.string()).default([]),
      holder: z.string().optional(),
    },
    async ({ workspace, kind, title, body, audience, holder }): Promise<ToolResult> => {
      try {
        if (!hasScope("write")) throw new ForbiddenError("API key missing scope: write");
        const r = resolve(principal, workspace, holder);
        await gate(r.holder);
        return text(await writeMemory({ workspace: r.workspace, kind, title, body, audience, metadata: {} }));
      } catch (err) {
        return { ...text(`write failed: ${(err as Error).message}`), isError: true };
      }
    },
  );

  return server;
}

async function main(): Promise<void> {
  let principal: AuthContext | null = null;
  if (config.auth.enabled) {
    principal = await authenticateBearer(process.env.RECALL_API_KEY);
    console.error(`[mcp] authenticated workspace=${principal.workspaceSlug} holder=${principal.holder}`);
  }
  const server = buildMcpServer(principal);
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`${BRAND.name} (${BRAND.symbol}) MCP server ready on stdio`);
}

main().catch((err) => {
  console.error("MCP server failed:", err);
  process.exit(1);
});
