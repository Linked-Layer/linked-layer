import { ArrowLeft, Coins, FileText, Loader2, Paperclip, Plus, Send, ShieldCheck, Sparkles, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChatBubble } from "@/components/ChatBubble";
import { LogoWord } from "@/components/Logo";
import { WalletButton } from "@/components/WalletButton";
import { Button } from "@/components/ui/button";
import { useChats } from "@/hooks/useChats";
import { type Attachment } from "@/lib/api";
import { BRAND } from "@/lib/brand";
import { useWalletCtx } from "@/providers/Wallet";

const FREE_QUESTIONS = 2;
const SUGGESTIONS = [
  "What is Linked Layer?",
  "Why did the team pick Solana?",
  "How do I get access?",
];

// File attach: text/code/markdown only, read in-browser. Capped so prompts stay bounded.
const MAX_FILES = 4;
const MAX_CHARS = 15000;
const MAX_BYTES = 1_000_000;
const TEXT_EXT =
  /\.(txt|md|markdown|csv|tsv|json|ya?ml|xml|html?|css|js|jsx|ts|tsx|py|rb|go|rs|java|c|cpp|cc|h|hpp|sh|bash|sql|log|env|toml|ini|svg|vue|php|kt|swift|dart|r|scala|pl|lua|gradle|dockerfile|properties|gitignore)$/i;

export function ChatApp() {
  const { verified, connected, verify, verifying, verifyError, session } = useWalletCtx();
  const { conversations, active, activeId, streaming, totalAsked, newChat, selectChat, deleteChat, ask } = useChats();
  const [q, setQ] = useState("");
  const [files, setFiles] = useState<Attachment[]>([]);
  const [fileNote, setFileNote] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [active?.messages]);

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
    <div className="flex h-screen w-screen overflow-hidden bg-bg text-slate-100">
      {/* Sidebar */}
      <aside className="hidden w-72 shrink-0 flex-col border-r border-border bg-panel/50 md:flex">
        <div className="px-4 py-4">
          <LogoWord />
        </div>
        <div className="px-3">
          <button
            onClick={newChat}
            className="flex w-full items-center gap-2 rounded-xl border border-border bg-panel-2 px-3 py-2.5 text-sm text-slate-200 transition-colors hover:border-violet/60 hover:text-white"
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
                className={`group flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                  c.id === activeId ? "bg-panel-2 text-white" : "text-slate-300 hover:bg-panel-2/60"
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
        <Link
          to="/"
          className="flex items-center gap-2 border-t border-border px-4 py-3 text-sm text-muted transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to site
        </Link>
      </aside>

      {/* Main */}
      <main className="flex flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
          <div className="flex items-center gap-2 truncate text-sm text-muted">
            <Link to="/" className="md:hidden">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <span className="truncate">{active?.title ?? "New chat"}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-border bg-panel-2 px-3 py-1.5 text-xs">
              <Coins className="h-3.5 w-3.5 text-violet" />
              <span className="font-medium text-white">{balance.toLocaleString()} {BRAND.symbol}</span>
              <span className="text-muted">·</span>
              <span className="text-muted">{holder ? "Unlimited" : `${freeLeft}/${FREE_QUESTIONS} free`}</span>
            </div>
            <WalletButton />
          </div>
        </header>

        {!verified ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet/15">
              <ShieldCheck className="h-6 w-6 text-violet" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Sign in to chat</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-muted">
                Connect a Solana wallet and verify to ask {FREE_QUESTIONS} questions free. Hold {BRAND.symbol} for
                unlimited access.
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
          <>
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
              <div className="mx-auto max-w-3xl space-y-5">
                {active && active.messages.length > 0 ? (
                  active.messages.map((m) => <ChatBubble key={m.id} m={m} />)
                ) : (
                  <div className="flex flex-col items-center gap-5 pt-16 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet/15">
                      <Sparkles className="h-6 w-6 text-violet" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-white">Ask anything</h2>
                      <p className="mt-1 text-sm text-muted">
                        About {BRAND.name}, your own project, code, or general questions.
                      </p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-2">
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
                )}
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit(q);
              }}
              className="border-t border-border px-4 py-3"
            >
              {files.length > 0 && (
                <div className="mx-auto mb-2 flex max-w-3xl flex-wrap gap-2">
                  {files.map((f, i) => (
                    <span
                      key={`${f.name}-${i}`}
                      className="flex items-center gap-1.5 rounded-lg border border-border bg-panel-2 px-2.5 py-1 text-xs text-slate-200"
                    >
                      <FileText className="h-3 w-3 text-violet" />
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
              <div className="mx-auto flex max-w-3xl items-end gap-2">
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
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-panel-2 text-muted transition-colors hover:border-violet/60 hover:text-white"
                >
                  <Paperclip className="h-4 w-4" />
                </button>
                <textarea
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      submit(q);
                    }
                  }}
                  rows={1}
                  placeholder={`Message ${BRAND.short}…`}
                  className="max-h-40 min-h-[44px] flex-1 resize-none rounded-xl border border-border bg-panel-2 px-4 py-3 text-sm text-white outline-none placeholder:text-muted focus:border-violet/60"
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
    </div>
  );
}
