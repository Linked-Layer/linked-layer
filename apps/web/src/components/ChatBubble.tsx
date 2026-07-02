import { motion } from "framer-motion";
import { Check, FileText } from "lucide-react";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
            i < step ? "text-muted" : i === step ? "text-ink" : "text-muted/40"
          }`}
        >
          {i < step ? (
            <Check className="h-3 w-3 text-accent" />
          ) : i === step ? (
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
          ) : (
            <span className="h-1.5 w-1.5 rounded-full border border-muted/30" />
          )}
          <span className="font-mono tracking-tight">{label}</span>
        </div>
      ))}
    </div>
  );
}

/** One chat message — user (right) or assistant (left, with the recall trace). */
export function ChatBubble({ m }: { m: ChatMessage }) {
  if (m.role === "user") {
    return (
      <div className="flex flex-col items-end gap-1.5">
        {m.files && m.files.length > 0 && (
          <div className="flex flex-wrap justify-end gap-1.5">
            {m.files.map((f, i) => (
              <span
                key={`${f}-${i}`}
                className="flex items-center gap-1 rounded-md border border-border bg-panel-2 px-2 py-0.5 text-xs text-muted"
              >
                <FileText className="h-3 w-3 text-accent" /> <span className="max-w-[180px] truncate">{f}</span>
              </span>
            ))}
          </div>
        )}
        {m.content && (
          <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-accent px-4 py-2.5 text-sm leading-relaxed text-white shadow-sm">
            {m.content}
          </div>
        )}
      </div>
    );
  }

  const isError = m.status === "error";
  const empty = !m.content && m.status === "streaming";
  // Strip inline [Title]/[1] citation markers, but keep real markdown links like
  // [text](url) (bracket immediately followed by a paren).
  const display = m.content.replace(/\s?\[[^\]]*\](?!\()/g, "");

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-panel-2">
        <LogoMark className="h-4 w-auto" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">{empty ? "Recall" : "Linked"}</div>

        {empty ? (
          <RecallTrace />
        ) : (
          <div className={`text-sm leading-relaxed ${isError ? "text-rose-600" : "text-ink"}`}>
            <div className="space-y-2 [&_a]:text-accent [&_a]:underline [&_code]:rounded [&_code]:bg-panel-2 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-accent [&_h1]:text-base [&_h1]:font-semibold [&_h2]:text-base [&_h2]:font-semibold [&_h3]:font-semibold [&_li]:ml-1 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5 [&_p]:leading-relaxed [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-panel-2 [&_pre]:p-3 [&_strong]:font-semibold [&_strong]:text-ink [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{display}</ReactMarkdown>
            </div>
            {m.status === "streaming" && <span className="animate-pulse text-accent">▍</span>}
          </div>
        )}
      </div>
    </motion.div>
  );
}
