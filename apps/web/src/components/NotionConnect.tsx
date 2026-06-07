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
      <div className="absolute inset-0 bg-bg/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-panel p-5 shadow-glow" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SiNotion className="h-5 w-5 text-white" />
            <h3 className="text-base font-semibold text-white">Connect Notion</h3>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-muted transition-colors hover:text-white">
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
            <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
              <Check className="h-4 w-4 shrink-0" /> Connected
            </div>
            <p className="text-xs text-muted">
              {status.indexed > 0
                ? `${status.indexed} pages indexed`
                : status.lastSyncAt
                  ? "Indexing… (0 so far — check back in a minute)"
                  : "Queued for indexing…"}
              {status.lastSyncAt ? ` · last sync ${new Date(status.lastSyncAt).toLocaleString()}` : ""}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={sync} disabled={busy} className="flex-1">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Sync
              </Button>
              <Button variant="outline" size="sm" onClick={disconnect} disabled={busy} className="flex-1 hover:border-rose-500/60 hover:text-rose-400">
                <Trash2 className="h-4 w-4" /> Disconnect
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs leading-relaxed text-muted">
              Authorize Linked Layer to read the Notion pages you choose. The chat then answers from them — and only you can see
              your data.
            </p>
            <Button onClick={connect} disabled={busy} className="w-full">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <SiNotion className="h-4 w-4" />} Connect with Notion
            </Button>
          </div>
        )}

        {error && <p className="mt-3 text-xs leading-snug text-rose-400">{error}</p>}
        {note && !error && <p className="mt-3 text-xs leading-snug text-emerald-400">{note}</p>}
      </div>
    </div>
  );
}
