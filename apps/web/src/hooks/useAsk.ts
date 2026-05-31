import { useCallback, useRef, useState } from "react";
import { type RecallSource, streamAsk } from "@/lib/api";
import { config, isLive } from "@/lib/config";

/** Live LLM chat only when a backend is configured AND not in pre-token soft launch. */
const isChatLive = () => isLive.api() && !config.softLaunch;

export type MessageStatus = "streaming" | "done" | "error";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: RecallSource[];
  status?: MessageStatus;
}

const FALLBACK_SOURCES: RecallSource[] = [
  { nodeId: "1", title: "Decision: settle agent pay-per-call on Solana", url: null, snippet: "We chose Solana for sub-cent per-call fees and first-class x402 support.", score: 0.92 },
  { nodeId: "2", title: "Thread: how should we price agent context calls?", url: null, snippet: "Flat $0.01 USDC per recall() call; fees route to buyback & burn.", score: 0.71 },
  { nodeId: "3", title: "Doc: Linked Layer architecture overview", url: null, snippet: "Connectors → permission-aware context graph → distillation → recall via MCP/API.", score: 0.64 },
];

const FALLBACK_ANSWER =
  "Based on team memory: the team chose Solana for the agent pay-per-call rail because x402 has first-class Solana support and fees are sub-cent, which matters for per-call micropayments. Pricing was set to a flat $0.01 USDC per recall() call, with fees routed to buyback & burn of $LINKED. [Decision: settle agent pay-per-call on Solana] [Thread: how should we price agent context calls?]";

export function useAsk() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const idRef = useRef(0);
  const nextId = () => `m${++idRef.current}`;

  const ask = useCallback(async (question: string) => {
    const q = question.trim();
    if (!q) return;

    const userId = nextId();
    const assistantId = nextId();
    setMessages((prev) => [
      ...prev,
      { id: userId, role: "user", content: q },
      { id: assistantId, role: "assistant", content: "", status: "streaming" },
    ]);
    setStreaming(true);

    const patch = (fn: (m: ChatMessage) => ChatMessage) =>
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? fn(m) : m)));

    if (!isChatLive()) {
      // Scripted fallback (no backend): reveal canned sources, then type the answer.
      patch((m) => ({ ...m, sources: FALLBACK_SOURCES }));
      const words = FALLBACK_ANSWER.split(" ");
      for (let i = 0; i < words.length; i++) {
        await new Promise((r) => setTimeout(r, 26));
        patch((m) => ({ ...m, content: words.slice(0, i + 1).join(" ") }));
      }
      patch((m) => ({ ...m, status: "done" }));
      setStreaming(false);
      return;
    }

    try {
      await streamAsk(question, {
        onSources: (sources) => patch((m) => ({ ...m, sources })),
        onToken: (t) => patch((m) => ({ ...m, content: m.content + t })),
        onDone: () => patch((m) => (m.status === "streaming" ? { ...m, status: "done" } : m)),
        onError: (message) => patch((m) => ({ ...m, content: message, status: "error" })),
      });
    } catch (err) {
      patch((m) => ({ ...m, content: (err as Error).message, status: "error" }));
    }
    setStreaming(false);
  }, []);

  return { messages, streaming, ask };
}
