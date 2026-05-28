import { useCallback, useRef, useState } from "react";
import { type RecallSource, streamAsk } from "@/lib/api";
import { config, isLive } from "@/lib/config";

/** Live LLM chat only when a backend is configured AND not in pre-token soft launch. */
const isChatLive = () => isLive.api() && !config.softLaunch;

export type AskStatus = "idle" | "streaming" | "done" | "error";

export interface AskState {
  status: AskStatus;
  answer: string;
  sources: RecallSource[];
  live: boolean;
  error: string | null;
}

const FALLBACK_SOURCES: RecallSource[] = [
  { nodeId: "1", title: "Decision: use Solana for the x402 pay-per-call rail", url: null, snippet: "We chose Solana for sub-cent per-call fees and first-class x402 support.", score: 0.92 },
  { nodeId: "2", title: "Thread: how should we price agent context calls?", url: null, snippet: "Flat $0.01 USDC per recall() call; fees route to buyback & burn.", score: 0.71 },
  { nodeId: "3", title: "Doc: Linked Layer architecture overview", url: null, snippet: "Connectors → permission-aware context graph → distillation → recall via MCP/API.", score: 0.64 },
];

const FALLBACK_ANSWER =
  "Based on team memory: the team chose Solana for the agent pay-per-call rail because x402 has first-class Solana support and fees are sub-cent, which matters for per-call micropayments. Pricing was set to a flat $0.01 USDC per recall() call, with fees routed to buyback & burn of $LINKED. [Decision: use Solana for the x402 pay-per-call rail] [Thread: how should we price agent context calls?]";

export function useAsk() {
  const [state, setState] = useState<AskState>({
    status: "idle",
    answer: "",
    sources: [],
    live: isChatLive(),
    error: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  const ask = useCallback(async (question: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setState({ status: "streaming", answer: "", sources: [], live: isChatLive(), error: null });

    if (!isChatLive()) {
      // Scripted fallback: reveal canned sources, then type the answer.
      setState((s) => ({ ...s, sources: FALLBACK_SOURCES }));
      const words = FALLBACK_ANSWER.split(" ");
      for (let i = 0; i < words.length; i++) {
        if (controller.signal.aborted) return;
        await new Promise((r) => setTimeout(r, 28));
        setState((s) => ({ ...s, answer: words.slice(0, i + 1).join(" ") }));
      }
      setState((s) => ({ ...s, status: "done" }));
      return;
    }

    try {
      await streamAsk(
        question,
        {
          onSources: (sources) => setState((s) => ({ ...s, sources })),
          onToken: (t) => setState((s) => ({ ...s, answer: s.answer + t })),
          onDone: () => setState((s) => (s.status === "streaming" ? { ...s, status: "done" } : s)),
          onError: (message) => setState((s) => ({ ...s, status: "error", error: message })),
        },
        controller.signal,
      );
    } catch (err) {
      if (!controller.signal.aborted) setState((s) => ({ ...s, status: "error", error: (err as Error).message }));
    }
  }, []);

  return { state, ask };
}
