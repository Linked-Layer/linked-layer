import { Check, Github, Loader2, RefreshCw, ShieldCheck, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { type GithubStatus, githubLink, githubStatus, githubSync, githubUnlink } from "@/lib/api";
import { useWalletCtx } from "@/providers/Wallet";
import { Button } from "@/components/ui/button";

const REPO_RE = /^[\w.-]+\/[\w.-]+$/;

/** Modal to connect the user's own GitHub (paste a PAT + repos), scoped to their wallet. */
export function GithubConnect({ onClose, onChange }: { onClose: () => void; onChange?: (connected: boolean) => void }) {
  const { verified } = useWalletCtx();
  const [status, setStatus] = useState<GithubStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState("");
  const [reposText, setReposText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!verified) {
      setLoading(false);
      return;
    }
    githubStatus()
      .then((s) => setStatus(s))
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [verified]);

  const parseRepos = (): string[] =>
    reposText
      .split(/[\n,]/)
      .map((r) => r.trim())
      .filter(Boolean);

  const connect = async () => {
    setError(null);
    const repos = parseRepos();
    const bad = repos.filter((r) => !REPO_RE.test(r));
    if (repos.length === 0) return setError("Add at least one repo (owner/repo).");
    if (bad.length) return setError(`Use the owner/repo format: ${bad.join(", ")}`);
    setBusy(true);
    try {
      await githubLink(token.trim(), repos);
      setToken("");
      const s = await githubStatus();
      setStatus(s);
      onChange?.(true);
      setNote("Connected. Indexing your repos now — answers from GitHub appear in a minute.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const sync = async () => {
    setBusy(true);
    setError(null);
    try {
      await githubSync();
      setNote("Re-indexing… new issues/PRs will be searchable shortly.");
      setStatus(await githubStatus());
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
      await githubUnlink();
      setStatus({ connected: false, repos: [], lastSyncAt: null });
      onChange?.(false);
      setNote("Disconnected. Your GitHub data was removed.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-bg/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md rounded-2xl border border-border bg-panel p-5 shadow-glow"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Github className="h-5 w-5 text-white" />
            <h3 className="text-base font-semibold text-white">Connect GitHub</h3>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-muted transition-colors hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        {!verified ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <ShieldCheck className="h-6 w-6 text-violet" />
            <p className="text-sm text-muted">Connect & verify your wallet first — your GitHub is private to it.</p>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-violet" />
          </div>
        ) : status?.connected ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
              <Check className="h-4 w-4 shrink-0" /> Connected · {status.repos.length} repo{status.repos.length === 1 ? "" : "s"}
            </div>
            <ul className="max-h-40 space-y-1 overflow-y-auto">
              {status.repos.map((r) => (
                <li key={r} className="flex items-center gap-2 rounded-md border border-border bg-panel-2 px-2.5 py-1.5 text-xs text-slate-200">
                  <Github className="h-3 w-3 text-muted" /> {r}
                </li>
              ))}
            </ul>
            {status.lastSyncAt && (
              <p className="text-xs text-muted">Last indexed: {new Date(status.lastSyncAt).toLocaleString()}</p>
            )}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={sync} disabled={busy} className="flex-1">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Sync now
              </Button>
              <Button variant="outline" size="sm" onClick={disconnect} disabled={busy} className="flex-1 hover:border-rose-500/60 hover:text-rose-400">
                <Trash2 className="h-4 w-4" /> Disconnect
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs leading-relaxed text-muted">
              Paste a GitHub{" "}
              <a
                href="https://github.com/settings/tokens?type=beta"
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet hover:underline"
              >
                personal access token
              </a>{" "}
              (read-only, repo contents + issues) and the repos to index. The chat will then answer from them — only you can see your data.
            </p>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">Access token</label>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="github_pat_…"
                autoComplete="off"
                className="w-full rounded-lg border border-border bg-panel-2 px-3 py-2 text-sm text-white outline-none placeholder:text-muted focus:border-violet/60"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">Repositories</label>
              <textarea
                value={reposText}
                onChange={(e) => setReposText(e.target.value)}
                rows={3}
                placeholder={"owner/repo\nowner/another-repo"}
                className="w-full resize-none rounded-lg border border-border bg-panel-2 px-3 py-2 font-mono text-xs text-white outline-none placeholder:text-muted focus:border-violet/60"
              />
              <p className="mt-1 text-[11px] text-muted">One per line (or comma-separated), as owner/repo.</p>
            </div>
            <Button onClick={connect} disabled={busy || !token.trim()} className="w-full">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Github className="h-4 w-4" />} Connect
            </Button>
          </div>
        )}

        {error && <p className="mt-3 text-xs leading-snug text-rose-400">{error}</p>}
        {note && !error && <p className="mt-3 text-xs leading-snug text-emerald-400">{note}</p>}
      </div>
    </div>
  );
}
