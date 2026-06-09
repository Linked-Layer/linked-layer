import { motion } from "framer-motion";
import { ArrowLeft, Coins, FileText, Loader2, PanelLeft, Paperclip, Plus, Send, ShieldCheck, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChatBackdrop } from "@/components/ChatBackdrop";
import { ChatBubble } from "@/components/ChatBubble";
import { ConnectSources } from "@/components/ConnectSources";
import { LogoWord } from "@/components/Logo";
import { MemoryGraph, ProjectorBeam } from "@/components/MemoryGraph";
import { Onboarding, type OnboardingStep } from "@/components/Onboarding";
import { ThemeToggle } from "@/components/ThemeToggle";
import { WalletButton } from "@/components/WalletButton";
import { Button } from "@/components/ui/button";
import { useChats } from "@/hooks/useChats";
import { type Attachment } from "@/lib/api";
import { BRAND } from "@/lib/brand";
import { useWalletCtx } from "@/providers/Wallet";

const FREE_QUESTIONS = 10;

// Entrance animation for the chat view (so /app fades + rises in instead of snapping).
const EASE = [0.22, 1, 0.36, 1] as const;
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.09, delayChildren: 0.12 } } };
const rise = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } };

// File attach: text/code/markdown only, read in-browser. Capped so prompts stay bounded.
const MAX_FILES = 4;
const MAX_CHARS = 15000;
const MAX_BYTES = 1_000_000;
const TEXT_EXT =
  /\.(txt|md|markdown|csv|tsv|json|ya?ml|xml|html?|css|js|jsx|ts|tsx|py|rb|go|rs|java|c|cpp|cc|h|hpp|sh|bash|sql|log|env|toml|ini|svg|vue|php|kt|swift|dart|r|scala|pl|lua|gradle|dockerfile|properties|gitignore)$/i;

// DEV-only preview switch: skip the wallet-verify gate while running `vite dev` so the
// chat UI can be inspected without connecting/verifying a wallet. Set to false to test the
// real verify flow locally. NEVER active in a production build (guarded by import.meta.env.DEV).
const DEV_SKIP_VERIFY = true;

export function ChatApp() {
  const wallet = useWalletCtx();
  const { connected, verify, verifying, verifyError, session } = wallet;
  const verified = (import.meta.env.DEV && DEV_SKIP_VERIFY) || wallet.verified;
  const { conversations, active, activeId, streaming, totalAsked, newChat, selectChat, deleteChat, ask } = useChats();
  const [q, setQ] = useState("");
  const [files, setFiles] = useState<Attachment[]>([]);
  const [fileNote, setFileNote] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [onboarding, setOnboarding] = useState(false);
  const [composerFocused, setComposerFocused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const graphRef = useRef<HTMLDivElement>(null);
  const hubRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const sourcesRef = useRef<HTMLDivElement>(null);
  const balanceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [active?.messages]);

  // First-run tour: show once when the verified empty state first appears.
  const showEmpty = verified && (!active || active.messages.length === 0);
  useEffect(() => {
    if (!showEmpty) return;
    try {
      if (localStorage.getItem("linked.onboarded") === "1") return;
    } catch {
      return;
    }
    const t = setTimeout(() => setOnboarding(true), 450); // let the empty state lay out
    return () => clearTimeout(t);
  }, [showEmpty]);

  const finishOnboarding = () => {
    setOnboarding(false);
    try {
      localStorage.setItem("linked.onboarded", "1");
    } catch {
      /* ignore */
    }
  };

  const onboardingSteps: OnboardingStep[] = [
    {
      getEl: () => graphRef.current,
      title: "Demo prompts",
      body:
        "Tap any of these to try a question about Linked Layer. In test mode Slack, GitHub & co. are connected, so you get real, source-grounded answers.",
    },
    {
      getEl: () => composerRef.current,
      title: "…or ask anything",
      body: "Type your own question — your project, code, a pasted GitHub link, or anything general. Attach text/code files with the clip.",
    },
    {
      getEl: () => sourcesRef.current,
      title: "Your tools, one context",
      body: "These are the sources Linked pulls context from. One-click connectors are coming soon — for now, paste a link in the chat.",
    },
    {
      getEl: () => balanceRef.current,
      title: "Free preview",
      body: `You get ${FREE_QUESTIONS} free questions. Hold ${BRAND.symbol} for unlimited access.`,
    },
  ];

  const balance = session?.balance ?? 0;
  const holder = balance > 0;
  const freeLeft = Math.max(0, FREE_QUESTIONS - totalAsked);

  const submit = (text: string) => {
    const t = text.trim();
    if ((!t && files.length === 0) || streaming) return;
    const atts = files;
    setQ("");
    setFiles([]);
    setFileNote("");
    void ask(t, atts);
  };

  const onFiles = async (list: FileList | null) => {
    if (!list) return;
    setFileNote("");
    const next = [...files];
    for (const f of Array.from(list)) {
      if (next.length >= MAX_FILES) {
        setFileNote(`Up to ${MAX_FILES} files at a time.`);
        break;
      }
      if (!(TEXT_EXT.test(f.name) || f.type.startsWith("text/"))) {
        setFileNote("Text, markdown & code files only for now — PDF & images coming soon.");
        continue;
      }
      if (f.size > MAX_BYTES) {
        setFileNote("Files up to ~1 MB.");
        continue;
      }
      try {
        const text = await f.text();
        next.push({ name: f.name, content: text.slice(0, MAX_CHARS) });
      } catch {
        /* unreadable — skip */
      }
    }
    setFiles(next);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="flex h-screen w-screen overflow-hidden bg-bg text-ink"
    >
      {/* Sidebar — collapsible */}
      <aside
        className={`hidden shrink-0 flex-col overflow-hidden border-border bg-panel transition-[width] duration-200 ease-out md:flex ${
          sidebarOpen ? "w-72 border-r" : "w-0 border-r-0"
        }`}
      >
        <div className="flex items-start justify-between gap-2 border-b border-border px-4 py-4">
          <div className="min-w-0">
            <Link to="/" title="Back to home" className="inline-block rounded transition-opacity hover:opacity-80">
              <LogoWord />
            </Link>
            <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-muted">Memory console</div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
            className="shrink-0 rounded-lg border border-border bg-panel-2 p-1.5 text-muted transition-colors hover:border-stone-300 hover:text-ink"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
        </div>
        <div className="px-3 pt-3">
          <button
            onClick={newChat}
            className="flex w-full items-center gap-2 rounded-lg border border-border bg-panel-2 px-3 py-2.5 text-sm text-ink transition-colors hover:border-stone-300 hover:bg-panel"
          >
            <Plus className="h-4 w-4" /> New chat
          </button>
        </div>
        <div className="mt-3 flex-1 space-y-1 overflow-y-auto px-2">
          {conversations.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted">No conversations yet.</p>
          ) : (
            conversations.map((c) => (
              <div
                key={c.id}
                className={`group flex items-center gap-2 rounded-r-lg border-l-2 px-3 py-2 text-sm transition-colors ${
                  c.id === activeId
                    ? "border-accent bg-panel-2 text-ink"
                    : "border-transparent text-muted hover:bg-panel-2"
                }`}
              >
                <button onClick={() => selectChat(c.id)} className="flex-1 truncate text-left">
                  {c.title || "New chat"}
                </button>
                <button
                  onClick={() => deleteChat(c.id)}
                  className="opacity-0 transition-opacity hover:text-rose-400 group-hover:opacity-100"
                  aria-label="Delete chat"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
        <div className="border-t border-border p-3">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Sources</div>
          <ConnectSources variant="mini" />
        </div>
        <Link
          to="/"
          className="flex items-center gap-2 border-t border-border px-4 py-3 text-sm text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> Back to site
        </Link>
      </aside>

      {/* Main */}
      <main className="relative flex flex-1 flex-col">
        <ChatBackdrop />
        {showEmpty && <ProjectorBeam hubRef={hubRef} active={composerFocused || q.trim().length > 0} />}
        <header className="relative z-30 flex items-center justify-between gap-3 border-b border-border px-5 py-3">
          <div className="flex min-w-0 items-center gap-2 truncate text-sm text-muted">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                title="Show sidebar"
                aria-label="Show sidebar"
                className="hidden shrink-0 rounded-lg border border-border bg-panel-2 p-1.5 text-muted transition-colors hover:border-stone-300 hover:text-ink md:inline-flex"
              >
                <PanelLeft className="h-4 w-4" />
              </button>
            )}
            <Link to="/" className="md:hidden">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <span className="truncate">{active?.title ?? "New chat"}</span>
          </div>
          <div className="flex items-center gap-3">
            <div ref={balanceRef} className="flex items-center gap-2 rounded-full border border-border bg-panel-2 px-3 py-1.5 text-xs">
              <Coins className="h-3.5 w-3.5 text-accent" />
              <span className="font-medium text-ink">{balance.toLocaleString()} {BRAND.symbol}</span>
              <span className="text-muted">·</span>
              <span className="text-muted">{holder ? "Unlimited" : `${freeLeft}/${FREE_QUESTIONS} free`}</span>
            </div>
            <ThemeToggle />
            <WalletButton />
          </div>
        </header>

        {!verified ? (
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="relative z-10 flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center"
          >
            <motion.div variants={rise} className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/15">
              <ShieldCheck className="h-6 w-6 text-accent" />
            </motion.div>
            <motion.div variants={rise}>
              <h2 className="text-xl font-semibold text-ink">Sign in to chat</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted">
                Connect a Solana wallet and verify to ask {FREE_QUESTIONS} questions free. Hold {BRAND.symbol} for
                unlimited access.
              </p>
            </motion.div>
            <motion.div variants={rise} className="flex flex-col items-center gap-4">
              {connected ? (
                <Button onClick={verify} disabled={verifying}>
                  {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  {verifying ? "Check your wallet…" : "Verify wallet"}
                </Button>
              ) : (
                <p className="text-sm text-muted">
                  Use <span className="text-accent">Connect Wallet</span> in the top-right, then verify.
                </p>
              )}
              {verifyError && <p className="max-w-md text-sm leading-snug text-rose-600">{verifyError}</p>}
            </motion.div>
          </motion.div>
        ) : (
          <>
            <div ref={scrollRef} className="relative z-10 flex-1 overflow-y-auto px-4 py-6">
              <div className="mx-auto max-w-3xl space-y-5">
                {active && active.messages.length > 0 ? (
                  active.messages.map((m) => <ChatBubble key={m.id} m={m} />)
                ) : (
                  <motion.div
                    variants={stagger}
                    initial="hidden"
                    animate="show"
                    className="flex flex-col items-center gap-6 pt-6 text-center"
                  >
                    <motion.div ref={graphRef} variants={rise} className="w-full">
                      <MemoryGraph onPick={(p) => submit(p)} hubRef={hubRef} active={composerFocused || q.trim().length > 0} />
                      <p className="mx-auto mt-3 max-w-md text-xs leading-relaxed text-muted">
                        (These are demo prompts. In test mode Slack, GitHub & co. are connected — tap one to explore
                        real, source-grounded answers.)
                      </p>
                    </motion.div>
                    <motion.div variants={rise}>
                      <h2 className="text-2xl font-semibold tracking-tight text-ink">Ask your team's memory</h2>
                      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
                        Permission-aware recall over a live context graph — click a node, or ask anything below
                        (your own project, code, general questions).
                      </p>
                    </motion.div>
                    <motion.div ref={sourcesRef} variants={rise}>
                      <ConnectSources />
                    </motion.div>
                  </motion.div>
                )}
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit(q);
              }}
              className="relative z-10 border-t border-border px-4 py-3"
            >
              {files.length > 0 && (
                <div className="mx-auto mb-2 flex max-w-3xl flex-wrap gap-2">
                  {files.map((f, i) => (
                    <span
                      key={`${f.name}-${i}`}
                      className="flex items-center gap-1.5 rounded-lg border border-border bg-panel-2 px-2.5 py-1 text-xs text-ink"
                    >
                      <FileText className="h-3 w-3 text-accent" />
                      <span className="max-w-[180px] truncate">{f.name}</span>
                      <button
                        type="button"
                        onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                        className="text-muted transition-colors hover:text-rose-400"
                        aria-label="Remove file"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div ref={composerRef} className="mx-auto flex max-w-3xl items-end gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => void onFiles(e.target.files)}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach text / code files"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-panel-2 text-muted transition-colors hover:border-stone-300 hover:text-ink"
                >
                  <Paperclip className="h-4 w-4" />
                </button>
                <textarea
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onFocus={() => setComposerFocused(true)}
                  onBlur={() => setComposerFocused(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      submit(q);
                    }
                  }}
                  rows={1}
                  placeholder={`Message ${BRAND.short}…`}
                  className="max-h-40 min-h-[44px] flex-1 resize-none rounded-xl border border-border bg-panel px-4 py-3 text-sm text-ink outline-none placeholder:text-muted focus:border-accent/60"
                />
                <Button type="submit" size="md" disabled={streaming || (!q.trim() && files.length === 0)} className="h-11">
                  {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
              <p className="mx-auto mt-2 max-w-3xl px-1 text-xs text-muted">
                {fileNote ? `${fileNote} ` : ""}
                {holder ? "Unlimited access." : `Free preview · ${freeLeft}/${FREE_QUESTIONS} questions left · hold ${BRAND.symbol} for unlimited.`}
              </p>
            </form>
          </>
        )}
      </main>

      {onboarding && <Onboarding steps={onboardingSteps} onClose={finishOnboarding} />}
    </motion.div>
  );
}
