import { motion } from "framer-motion";
import { FileText, Sparkles } from "lucide-react";
import type { ChatMessage } from "@/hooks/useChats";

/** One chat message — user (right) or assistant (left, with cited sources). */
export function ChatBubble({ m }: { m: ChatMessage }) {
  if (m.role === "user") {
    return (
      <div className="flex flex-col items-end gap-1.5">
        {m.files && m.files.length > 0 && (
          <div className="flex flex-wrap justify-end gap-1.5">
            {m.files.map((f, i) => (
              <span
                key={`${f}-${i}`}
                className="flex items-center gap-1 rounded-lg border border-border bg-panel-2 px-2 py-0.5 text-xs text-slate-300"
              >
                <FileText className="h-3 w-3 text-violet" /> <span className="max-w-[180px] truncate">{f}</span>
              </span>
            ))}
          </div>
        )}
        {m.content && (
          <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-violet/20 px-4 py-2.5 text-sm leading-relaxed text-white">
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
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-start gap-2">
      <div className="flex max-w-[90%] items-start gap-2.5">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet/15">
          <Sparkles className="h-4 w-4 text-violet" />
        </div>
        <div
          className={`whitespace-pre-wrap rounded-2xl rounded-bl-md px-4 py-2.5 text-sm leading-relaxed ${
            isError ? "bg-rose-500/10 text-rose-300" : "bg-panel-2/70 text-slate-100"
          }`}
        >
          {empty ? (
            <span className="inline-flex gap-1">
              <Dot /> <Dot /> <Dot />
            </span>
          ) : (
            <>
              {display}
              {m.status === "streaming" && <span className="ml-0.5 animate-pulse text-violet">▍</span>}
            </>
          )}
        </div>
      </div>

      {cited.length > 0 && (
        <div className="ml-9 w-full">
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">Sources</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {cited.map((src) => (
              <div key={src.nodeId} className="rounded-lg border border-border bg-panel/60 p-3">
                <div className="flex items-start gap-2">
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-violet" />
                  <div>
                    <div className="text-sm font-medium text-slate-100">{src.title}</div>
                    <div className="mt-1 line-clamp-2 text-xs text-muted">{src.snippet}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

function Dot() {
  return <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet" />;
}
