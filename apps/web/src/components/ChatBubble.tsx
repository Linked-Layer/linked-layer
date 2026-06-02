import { motion } from "framer-motion";
import { Check, FileText, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { LogoMark } from "@/components/Logo";
import type { ChatMessage } from "@/hooks/useChats";

const RECALL_STEPS = ["Searching team memory", "Applying permissions", "Ranking sources", "Grounding answer"];

/** Live "recall" trace shown while the answer is being retrieved + composed. */
function RecallTrace() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => Math.min(s + 1, RECALL_STEPS.length - 1)), 620);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="space-y-1.5">
      {RECALL_STEPS.map((label, i) => (
        <div
          key={label}
          className={`flex items-center gap-2 text-xs ${
            i < step ? "text-muted" : i === step ? "text-slate-200" : "text-muted/40"
          }`}
        >
          {i < step ? (
            <Check className="h-3 w-3 text-violet" />
          ) : i === step ? (
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet" />
          ) : (
            <span className="h-1.5 w-1.5 rounded-full border border-muted/30" />
          )}
          <span className="font-mono tracking-tight">{label}</span>
        </div>
      ))}
    </div>
  );
}

/** Extract a node kind from a title prefix like "Decision: …" → "Decision". */
function kindOf(title: string): string | null {
  const m = /^([A-Za-z][A-Za-z ]{1,18}):/.exec(title);
  return m ? m[1].trim() : null;
}

/** One chat message — user (right) or assistant (left, with the recall trace + cited sources). */
export function ChatBubble({ m }: { m: ChatMessage }) {
  if (m.role === "user") {
    return (
      <div className="flex flex-col items-end gap-1.5">
        {m.files && m.files.length > 0 && (
          <div className="flex flex-wrap justify-end gap-1.5">
            {m.files.map((f, i) => (
              <span
                key={`${f}-${i}`}
                className="flex items-center gap-1 rounded-md border border-border bg-panel-2 px-2 py-0.5 text-xs text-slate-300"
              >
                <FileText className="h-3 w-3 text-violet" /> <span className="max-w-[180px] truncate">{f}</span>
              </span>
            ))}
          </div>
        )}
        {m.content && (
          <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-violet/15 px-4 py-2.5 text-sm leading-relaxed text-white ring-1 ring-violet/20">
            {m.content}
          </div>
        )}
      </div>
    );
  }

  const isError = m.status === "error";
  const empty = !m.content && m.status === "streaming";
  // Real provenance: only the sources the answer actually cited.
  const cited = (m.sources ?? []).filter((s) => m.content.includes(s.title));
  // Strip inline [Title] citation markers — shown as Source cards instead.
  const display = m.content.replace(/\s*\[[^\]]*\]/g, "");

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-panel-2">
        <LogoMark className="h-4 w-auto" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">{empty ? "Recall" : "Linked Layer"}</div>

        {empty ? (
          <RecallTrace />
        ) : (
          <div className={`text-sm leading-relaxed ${isError ? "text-rose-300" : "text-slate-100"}`}>
            <span className="whitespace-pre-wrap">{display}</span>
            {m.status === "streaming" && <span className="ml-0.5 animate-pulse text-violet">▍</span>}
          </div>
        )}

        {cited.length > 0 && (
          <div className="mt-3">
            <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-muted">
              <ShieldCheck className="h-3.5 w-3.5 text-violet" />
              Grounded in {cited.length} team source{cited.length === 1 ? "" : "s"} · permission-aware
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {cited.map((src) => {
                const kind = kindOf(src.title);
                return (
                  <div key={src.nodeId} className="rounded-lg border border-border bg-panel/60 p-3">
                    {kind && (
                      <span className="mb-1.5 inline-block rounded bg-violet/15 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-violet">
                        {kind}
                      </span>
                    )}
                    <div className="line-clamp-1 text-sm font-medium text-slate-100">{src.title.replace(/^[A-Za-z ]{1,18}:\s*/, "")}</div>
                    <div className="mt-1 line-clamp-2 text-xs text-muted">{src.snippet}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
