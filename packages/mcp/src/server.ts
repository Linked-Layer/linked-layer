import { BRAND, config } from "@recall/core";
import { recall, writeMemory } from "@recall/engine";
import { getTokenGate } from "@recall/gating";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

type ToolResult = { content: { type: "text"; text: string }[]; isError?: boolean };

function text(value: unknown): ToolResult {
  return { content: [{ type: "text", text: typeof value === "string" ? value : JSON.stringify(value, null, 2) }] };
}

/** Enforce hold-to-use gating for agent tool calls, mirroring the HTTP API. */
async function gate(holder: string | undefined): Promise<void> {
  if (!config.gating.enabled) return;
  await getTokenGate().requireBalance(holder, config.gating.minBalance);
}

export function buildMcpServer(): McpServer {
  const server = new McpServer({ name: "recall", version: "0.1.0" });

  server.tool(
    "recall",
    `Recall (${BRAND.symbol}) shared team memory: fetch permission-aware context for a query in one call.`,
    {
      query: z.string().describe("What to recall, e.g. 'why did we pick Solana?'"),
      workspace: z.string().describe("Workspace slug to search within"),
      holder: z.string().optional().describe("Caller identity ($RECALL holder); bounds permissions"),
      limit: z.number().int().positive().max(50).optional(),
    },
    async ({ query, workspace, holder, limit }): Promise<ToolResult> => {
      try {
        await gate(holder);
        const result = await recall({ query, scope: { workspace }, holder, limit });
        return text(result);
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
      workspace: z.string(),
      holder: z.string().optional(),
      limit: z.number().int().positive().max(50).optional(),
    },
    async ({ query, workspace, holder, limit }): Promise<ToolResult> => {
      try {
        await gate(holder);
        const result = await recall({ query, scope: { workspace }, holder, limit });
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
      workspace: z.string(),
      kind: z.enum(["decision", "action_item", "source_object"]),
      title: z.string(),
      body: z.string().default(""),
      audience: z.array(z.string()).default([]),
      holder: z.string().optional(),
    },
    async ({ workspace, kind, title, body, audience, holder }): Promise<ToolResult> => {
      try {
        await gate(holder);
        const res = await writeMemory({ workspace, kind, title, body, audience, metadata: {} });
        return text(res);
      } catch (err) {
        return { ...text(`write failed: ${(err as Error).message}`), isError: true };
      }
    },
  );

  return server;
}

async function main(): Promise<void> {
  const server = buildMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stderr so we don't corrupt the stdio JSON-RPC stream
  console.error(`${BRAND.name} (${BRAND.symbol}) MCP server ready on stdio`);
}

main().catch((err) => {
  console.error("MCP server failed:", err);
  process.exit(1);
});
