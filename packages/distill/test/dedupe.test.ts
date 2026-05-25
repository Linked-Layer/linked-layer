import { describe, expect, it } from "vitest";
import { dedupeFacts } from "@recall/distill";
import type { DistilledFact } from "@recall/distill";

describe("dedupeFacts", () => {
  it("removes near-duplicate summaries of the same kind", () => {
    const facts: DistilledFact[] = [
      { kind: "decision", summary: "Use Solana for the x402 pay-per-call rail", rationale: null, status: "decided", assignee: null },
      { kind: "decision", summary: "Use Solana for the x402 pay per call rail!", rationale: "fees", status: "decided", assignee: null },
      { kind: "action_item", summary: "Ship the MCP server exposing recall", rationale: null, status: "in_progress", assignee: null },
    ];
    const out = dedupeFacts(facts);
    expect(out).toHaveLength(2);
    expect(out.filter((f) => f.kind === "decision")).toHaveLength(1);
  });

  it("keeps distinct facts", () => {
    const facts: DistilledFact[] = [
      { kind: "decision", summary: "Adopt pgvector for retrieval", rationale: null, status: "decided", assignee: null },
      { kind: "decision", summary: "Gate access by holding RECALL", rationale: null, status: "decided", assignee: null },
    ];
    expect(dedupeFacts(facts)).toHaveLength(2);
  });
});
