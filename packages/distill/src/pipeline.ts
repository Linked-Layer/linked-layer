import Anthropic from "@anthropic-ai/sdk";
import { config } from "@recall/core";
import type { DistillStatus } from "@recall/core";
import { dedupeFacts } from "./dedupe";
import { DISTILL_SYSTEM, distillUserPrompt } from "./prompts";

export interface DistilledFact {
  kind: "decision" | "action_item";
  summary: string;
  rationale: string | null;
  status: DistillStatus;
  /** Person responsible (for action items), e.g. "@alice". Null if unknown. */
  assignee: string | null;
}

export interface DistillInput {
  title: string;
  body: string;
  kind: string;
  metadata: Record<string, unknown>;
}

const VALID_STATUS: DistillStatus[] = ["proposed", "decided", "in_progress", "done", "superseded", "blocked"];

let client: Anthropic | null = null;
function llm(): Anthropic | null {
  if (!config.llm.apiKey) return null;
  client ??= new Anthropic({ apiKey: config.llm.apiKey });
  return client;
}

/** Distill one artifact into durable facts (LLM-backed, heuristic fallback). */
export async function distillItem(input: DistillInput): Promise<DistilledFact[]> {
  const api = llm();
  const facts = api ? await distillWithLlm(api, input) : distillHeuristic(input);
  return dedupeFacts(facts);
}

async function distillWithLlm(api: Anthropic, input: DistillInput): Promise<DistilledFact[]> {
  try {
    const msg = await api.messages.create({
      model: config.llm.model,
      max_tokens: 1024,
      system: DISTILL_SYSTEM,
      messages: [{ role: "user", content: distillUserPrompt(input.title, input.body, input.metadata) }],
    });
    const text = msg.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    return parseFacts(text);
  } catch (err) {
    console.warn("[distill] LLM call failed, falling back to heuristic:", (err as Error).message);
    return distillHeuristic(input);
  }
}

function parseFacts(text: string): DistilledFact[] {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) return [];
  try {
    const parsed = JSON.parse(text.slice(start, end + 1)) as { facts?: unknown[] };
    if (!Array.isArray(parsed.facts)) return [];
    return parsed.facts.flatMap((f) => {
      const o = f as Record<string, unknown>;
      const kind = o.kind === "action_item" ? "action_item" : o.kind === "decision" ? "decision" : null;
      const summary = typeof o.summary === "string" ? o.summary.trim() : "";
      if (!kind || !summary) return [];
      const status = VALID_STATUS.includes(o.status as DistillStatus) ? (o.status as DistillStatus) : "decided";
      const rationale = typeof o.rationale === "string" && o.rationale.trim() ? o.rationale.trim() : null;
      const assignee = typeof o.assignee === "string" && o.assignee.trim() ? o.assignee.trim() : null;
      return [{ kind, summary, rationale, status, assignee }];
    });
  } catch {
    return [];
  }
}

/** Dependency-free fallback so the pipeline runs without an API key. */
function distillHeuristic(input: DistillInput): DistilledFact[] {
  if (input.kind !== "decision" && input.kind !== "action_item") return [];
  const kind = input.kind as "decision" | "action_item";

  const summary = input.title.replace(/^(decision|action(?:\s*item)?)\s*:\s*/i, "").trim();

  const why = input.body
    .split(/\n+/)
    .map((l) => l.trim())
    .find((l) => /^(why|because|rationale)\b[:\-]?/i.test(l) || /\bbecause\b/i.test(l));
  const rationale = why ? why.replace(/^(why|rationale)\s*[:\-]\s*/i, "").trim() : null;

  const metaStatus = String(input.metadata.status ?? "").toLowerCase();
  const status: DistillStatus = VALID_STATUS.includes(metaStatus as DistillStatus)
    ? (metaStatus as DistillStatus)
    : kind === "decision"
      ? "decided"
      : "in_progress";

  // Best-effort assignee from "owner @x" / "assigned to @x" / first "@mention".
  const assigneeMatch =
    /(?:owner|assignee|assigned to|@owner)\s*[:\-]?\s*@?(\w[\w.-]*)/i.exec(input.body) ?? /@(\w[\w.-]*)/.exec(input.body);
  const assignee = assigneeMatch ? `@${assigneeMatch[1]!.replace(/^@/, "")}` : null;

  return [{ kind, summary, rationale, status, assignee }];
}
