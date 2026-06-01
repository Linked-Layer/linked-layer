import { motion } from "framer-motion";
import { CornerDownLeft, FileText, Loader2, Send, ShieldCheck, Sparkles, Wallet } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Section } from "@/components/Section";
import { Button } from "@/components/ui/button";
import { type ChatMessage, useAsk } from "@/hooks/useAsk";
import { BRAND } from "@/lib/brand";
import { config, isLive } from "@/lib/config";
import { useWalletCtx } from "@/providers/Wallet";

const SUGGESTIONS = [
  "Why did we pick Solana?",
  "How are agent context calls priced?",
  "What is the architecture?",
];

const HOW_IT_WORKS = [
  {
    icon: Wallet,
    title: `Hold ${BRAND.symbol}`,
    desc: `Connect a Solana wallet holding ${BRAND.symbol} to unlock the chat.`,
  },
  {
    icon: Sparkles,
    title: "Ask in plain English",
    desc: "Question your team's entire memory — decisions, the “why”, owners and status.",
  },
  {
    icon: FileText,
    title: "Cited, permission-aware",
    desc: "Every answer is grounded in real sources you're allowed to see — same recall() agents use.",
  },
];

/** Free questions a verified wallet gets before hold-to-use (keep in sync with FREE_TRIAL_CALLS). */
const FREE_QUESTIONS = 2;

export function AskCompanyDemo() {
  const { verified, connected, verify, verifying, verifyError, session } = useWalletCtx();
  const { messages, streaming, ask } = useAsk();
  const [q, setQ] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Chat requires a verified wallet (Sign-In-with-Solana). A verified wallet gets
  // FREE_QUESTIONS free answers (no token needed); holders of $LINKED are unlimited.
  const gated = !config.softLaunch && isLive.api() && !verified;

  // Auto-scroll the message list to the newest content.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const submit = (question: string) => {
    const text = question.trim();
    if (!text || streaming) return;
    setQ("");
    void ask(text);
  };

  const asked = messages.filter((m) => m.role === "user").length;
  const isHolder = !!session && session.balance > 0;
  const freeLeft = Math.max(0, FREE_QUESTIONS - asked);

  return (
    <Section
      id="chat"
      eyebrow="Chat"
      title={<>Ask the company</>}
      subtitle="Chat over your team's entire memory with cited sources — the same recall() the agents use."
    >
      <div className="mx-auto max-w-3xl space-y-6">
        {/* How it works */}
        <div className="grid gap-3 sm:grid-cols-3">
          {HOW_IT_WORKS.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="panel flex flex-col gap-2 p-4"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet/15">
                <s.icon className="h-5 w-5 text-violet" />
              </div>
              <div className="text-sm font-semibold text-white">{s.title}</div>
              <p className="text-xs leading-relaxed text-muted">{s.desc}</p>
            </motion.div>
          ))}
        </div>

        {gated ? (
          <div className="panel flex flex-col items-center gap-4 px-6 py-14 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet/15">
              <ShieldCheck className="h-6 w-6 text-violet" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Try it free — {FREE_QUESTIONS} questions</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted">
                Connect a Solana wallet and verify to ask {FREE_QUESTIONS} questions over the team's memory — free.
                Hold {BRAND.symbol} for unlimited access.
              </p>
            </div>
            {connected ? (
              <Button onClick={verify} disabled={verifying}>
                {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                {verifying ? "Check your wallet…" : "Verify wallet"}
              </Button>
            ) : (
              <p className="text-sm text-muted">
                Use <span className="text-violet">Connect Wallet</span> in the top-right, then verify.
              </p>
            )}
            {verifyError && <p className="max-w-md text-sm leading-snug text-rose-400">{verifyError}</p>}
          </div>
        ) : (
          <div className="panel flex flex-col overflow-hidden">
            {/* Message list */}
            <div
              ref={scrollRef}
              data-lenis-prevent
              className="min-h-[200px] max-h-[480px] space-y-4 overflow-y-auto overscroll-contain px-5 py-6"
            >
              {messages.length === 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted">Ask anything about the team — or start with one of these:</p>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => submit(s)}
                        className="rounded-full border border-border bg-panel-2 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:border-violet/60 hover:text-white"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((m) => <Bubble key={m.id} m={m} />)
              )}
            </div>

            {/* Composer */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit(q);
              }}
              className="border-t border-border px-4 py-3"
            >
              <div className="flex items-center gap-2">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Ask anything about the team…"
                  className="h-11 flex-1 rounded-xl border border-border bg-panel-2 px-4 text-sm text-white outline-none placeholder:text-muted focus:border-violet/60"
                />
                <Button type="submit" size="md" disabled={streaming || !q.trim()}>
                  {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  <span className="hidden sm:inline">Ask</span>
                </Button>
              </div>
              {!isHolder && (
                <p className="mt-2 px-1 text-xs text-muted">
                  Free preview · {freeLeft} of {FREE_QUESTIONS} questions left · hold {BRAND.symbol} for unlimited
                </p>
              )}
            </form>
          </div>
        )}

        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted">
          <CornerDownLeft className="h-3 w-3" /> Powered by the same MCP / Context API agents use.
        </p>
      </div>
    </Section>
  );
}

/** A single chat message — user (right) or assistant (left, with cited sources). */
function Bubble({ m }: { m: ChatMessage }) {
  if (m.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-violet/20 px-4 py-2.5 text-sm leading-relaxed text-white">
          {m.content}
        </div>
      </div>
    );
  }

  const isError = m.status === "error";
  const empty = !m.content && m.status === "streaming";
  // Sources the answer actually cited (matched on the raw [Title] markers) — real
  // provenance, not every node the retriever touched. Greetings → none.
  const cited = (m.sources ?? []).filter((s) => m.content.includes(s.title));
  // Strip the inline [Title] citation markers from the displayed text — they're shown
  // as Source cards below instead, so the answer itself reads cleanly.
  const display = m.content.replace(/\s*\[[^\]]*\]/g, "");
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-start gap-2">
      <div className="flex max-w-[90%] items-start gap-2.5">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet/15">
          <Sparkles className="h-4 w-4 text-violet" />
        </div>
        <div
          className={`rounded-2xl rounded-bl-md px-4 py-2.5 text-sm leading-relaxed ${
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
