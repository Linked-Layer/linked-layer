import { motion } from "framer-motion";
import { CornerDownLeft, FileText, Loader2, Send, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Section } from "@/components/Section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAsk } from "@/hooks/useAsk";
import { BRAND } from "@/lib/brand";
import { isLive } from "@/lib/config";
import { useWalletCtx } from "@/providers/Wallet";

const SUGGESTIONS = [
  "Why did we pick Solana?",
  "How are agent context calls priced?",
  "What is the architecture?",
];

export function AskCompanyDemo() {
  const { verified, connected, verify, verifying, verifyError } = useWalletCtx();
  const { state, ask } = useAsk();
  const [q, setQ] = useState("");

  // When the backend is live, the chat is gated STRICTLY by a verified $LINKED wallet.
  const gated = isLive.api() && !verified;

  const submit = (question: string) => {
    const text = question.trim();
    if (!text || state.status === "streaming") return;
    setQ(text);
    void ask(text);
  };

  return (
    <Section
      id="chat"
      eyebrow="Chat"
      title={<>Ask the company</>}
      subtitle="Chat over a team's entire memory with cited sources — the same recall() the agents use."
    >
      <div className="mx-auto max-w-3xl">
        {gated ? (
          <div className="panel flex flex-col items-center gap-4 px-6 py-14 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet/15">
              <ShieldCheck className="h-6 w-6 text-violet" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Hold {BRAND.symbol} to chat</h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted">
                This chat is gated by your wallet. Connect a Solana wallet holding {BRAND.symbol} and verify ownership to
                unlock it.
              </p>
            </div>
            {connected ? (
              <Button onClick={verify} disabled={verifying}>
                {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                {verifying ? "Check your wallet…" : `Verify ${BRAND.symbol} ownership`}
              </Button>
            ) : (
              <p className="text-sm text-muted">
                Use <span className="text-violet">Connect Wallet</span> in the top-right, then verify.
              </p>
            )}
            {verifyError && <p className="max-w-md text-sm leading-snug text-rose-400">{verifyError}</p>}
          </div>
        ) : (
          <div className="panel overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <span className="text-sm font-medium text-slate-200">workspace: acme</span>
              <Badge className={state.live ? "border-cyan/40 text-cyan" : "border-violet/40 text-violet"}>
                {state.live ? "connected to API" : "demo mode"}
              </Badge>
            </div>

            <div className="space-y-4 px-5 py-6">
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

              {(state.answer || state.status === "streaming") && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl bg-panel-2/60 p-4">
                  <p className="text-sm leading-relaxed text-slate-100">
                    {state.answer}
                    {state.status === "streaming" && <span className="ml-0.5 animate-pulse text-violet">▍</span>}
                  </p>
                </motion.div>
              )}

              {state.error && <p className="text-sm text-rose-400">Error: {state.error}</p>}

              {state.sources.length > 0 && (
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">Sources</div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {state.sources.map((src) => (
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
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit(q);
              }}
              className="flex items-center gap-2 border-t border-border px-4 py-3"
            >
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Ask anything about the team…"
                className="h-11 flex-1 rounded-xl border border-border bg-panel-2 px-4 text-sm text-white outline-none placeholder:text-muted focus:border-violet/60"
              />
              <Button type="submit" size="md" disabled={state.status === "streaming"}>
                {state.status === "streaming" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">Ask</span>
              </Button>
            </form>
          </div>
        )}

        <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-muted">
          <CornerDownLeft className="h-3 w-3" /> Powered by the same MCP / Context API agents use.
        </p>
      </div>
    </Section>
  );
}
