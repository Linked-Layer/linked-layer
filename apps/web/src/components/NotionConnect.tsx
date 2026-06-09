import { Check, Loader2, RefreshCw, ShieldCheck, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { SiNotion } from "react-icons/si";
import { type GithubStatus, notionOauthStart, notionStatus, notionSync, notionUnlink } from "@/lib/api";
import { useWalletCtx } from "@/providers/Wallet";
import { Button } from "@/components/ui/button";

/** Connect the user's own Notion via one-click OAuth (Notion picks pages during authorize). */
export function NotionConnect({ onClose, onChange }: { onClose: () => void; onChange?: (connected: boolean) => void }) {
  const { verified } = useWalletCtx();
  const [status, setStatus] = useState<GithubStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const refresh = async () => {
    const s = await notionStatus();
    setStatus(s);
    onChange?.(s.connected);
    return s;
  };

  useEffect(() => {
    if (!verified) {
      setLoading(false);
      return;
    }
    refresh()
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verified]);

  const connect = async () => {
    setBusy(true);
    setError(null);
    try {
      const { url } = await notionOauthStart();
      window.location.href = url;
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  const sync = async () => {
    setBusy(true);
    setError(null);
    try {
      await notionSync();
      setNote("Re-indexing your Notion pages…");
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    setError(null);
    try {
      await notionUnlink();
      setNote("Disconnected. Your Notion data was removed.");
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" />
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-panel p-5 shadow-glow" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SiNotion className="h-5 w-5 text-ink" />
            <h3 className="text-base font-semibold text-ink">Connect Notion</h3>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-muted transition-colors hover:text-ink">
            <X className="h-4 w-4" />
          </button>
        </div>

        {!verified ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <ShieldCheck className="h-6 w-6 text-violet" />
            <p className="text-sm text-muted">Connect & verify your wallet first — your Notion is private to it.</p>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-violet" />
          </div>
        ) : status?.connected ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">
              <Check className="h-4 w-4 shrink-0" /> Connected
            </div>
            {status.indexed > 0 ? (
              <div className="rounded-lg border border-border bg-panel-2 p-3 text-[11px] leading-relaxed text-muted">
                <div className="font-medium text-ink">
                  {status.indexed} page{status.indexed === 1 ? "" : "s"} indexed — you're set.
                </div>
                <p className="mt-1 text-muted">
                  Just ask about your Notion in the chat (e.g. “summarize my notes”, “what did I write about X”).
                </p>
                <p className="mt-1.5 text-muted">
                  Want more pages in? Share them in Notion (page → <span className="font-mono">•••</span> →{" "}
                  <b className="text-ink">Connections</b> → <b className="text-ink">Linked Layer</b>), then hit{" "}
                  <b className="text-ink">Sync</b>.
                  {status.lastSyncAt ? ` · last sync ${new Date(status.lastSyncAt).toLocaleString()}` : ""}
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200/90">
                <div className="mb-1.5 font-medium text-amber-900 dark:text-amber-300">
                  Almost there — one more step. Notion shares nothing until you give Linked your pages:
                </div>
                <ol className="list-decimal space-y-1 pl-4">
                  <li>In Notion, open a page (or a top-level page that holds the rest).</li>
                  <li>
                    Top-right <span className="font-mono">•••</span> → <b>Connections</b> → add <b>Linked Layer</b>. Sub-pages
                    are included automatically.
                  </li>
                  <li>
                    Come back here and hit <b>Sync</b>.
                  </li>
                </ol>
                <p className="mt-2 text-amber-700 dark:text-amber-200/70">
                  Tip: you can also re-run <b>Connect with Notion</b> and tick pages on Notion's “Select pages” screen.
                  {status.lastSyncAt ? ` · last checked ${new Date(status.lastSyncAt).toLocaleString()}` : ""}
                </p>
              </div>
            )}
            <div className="flex gap-2">
              <Button
                variant={status.indexed > 0 ? "outline" : "primary"}
                size="sm"
                onClick={sync}
                disabled={busy}
                className="flex-1"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                {status.indexed > 0 ? "Sync" : "Sync now"}
              </Button>
              <Button variant="outline" size="sm" onClick={disconnect} disabled={busy} className="hover:border-rose-500/60 hover:text-rose-600">
                <Trash2 className="h-4 w-4" /> Disconnect
              </Button>
            </div>
            {status.indexed === 0 && (
              <p className="text-[11px] leading-relaxed text-muted">
                Already shared your pages in Notion? Press <b className="text-ink">Sync now</b> to index them — it
                takes ~a minute.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs leading-relaxed text-muted">
              Connect your Notion so the chat can answer from your pages. Only you can see your data.
            </p>
            <div className="rounded-lg border border-border bg-panel-2 p-3 text-[11px] leading-relaxed text-muted">
              <div className="mb-1.5 font-medium text-ink">How it works — 2 steps</div>
              <ol className="list-decimal space-y-1.5 pl-4 text-muted">
                <li>
                  Click <span className="text-ink">Connect with Notion</span> below and approve access.
                </li>
                <li>
                  In Notion, give Linked the pages you want: open a page → <span className="font-mono text-ink">•••</span>{" "}
                  (top-right) → <span className="text-ink">Connections</span> → add{" "}
                  <span className="text-ink">Linked Layer</span>. Sub-pages are included automatically.
                </li>
              </ol>
              <p className="mt-2 text-muted">
                Connecting alone shows nothing — Notion only shares pages you explicitly add. After adding them, come back
                and hit <span className="text-ink">Sync</span>.
              </p>
            </div>
            <Button onClick={connect} disabled={busy} className="w-full">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <SiNotion className="h-4 w-4" />} Connect with Notion
            </Button>
          </div>
        )}

        {error && <p className="mt-3 text-xs leading-snug text-rose-600">{error}</p>}
        {note && !error && <p className="mt-3 text-xs leading-snug text-emerald-600">{note}</p>}
      </div>
    </div>
  );
}
