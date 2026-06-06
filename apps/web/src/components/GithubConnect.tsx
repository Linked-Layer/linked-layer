import { Check, Github, Loader2, Lock, RefreshCw, ShieldCheck, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  type GithubRepoOption,
  type GithubStatus,
  githubLink,
  githubListRepos,
  githubOauthStart,
  githubSetRepos,
  githubStatus,
  githubSync,
  githubUnlink,
} from "@/lib/api";
import { useWalletCtx } from "@/providers/Wallet";
import { Button } from "@/components/ui/button";

const REPO_RE = /^[\w.-]+\/[\w.-]+$/;

/** Connect the user's own GitHub (one-click OAuth, then pick repos). PAT is a fallback. */
export function GithubConnect({ onClose, onChange }: { onClose: () => void; onChange?: (connected: boolean) => void }) {
  const { verified } = useWalletCtx();
  const [status, setStatus] = useState<GithubStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [usePat, setUsePat] = useState(false);

  // PAT fallback inputs
  const [token, setToken] = useState("");
  const [reposText, setReposText] = useState("");

  // Post-OAuth repo picker
  const [picking, setPicking] = useState(false);
  const [repoOpts, setRepoOpts] = useState<GithubRepoOption[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const refresh = async () => {
    const s = await githubStatus();
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

  // Authorized but no repos picked yet → drop straight into the picker.
  useEffect(() => {
    if (status?.authorized && status.repos.length === 0) void openPicker();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.authorized, status?.repos.length]);

  const connectOauth = async () => {
    setBusy(true);
    setError(null);
    try {
      const { url } = await githubOauthStart();
      window.location.href = url; // full-page redirect to GitHub
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  const openPicker = async () => {
    setPicking(true);
    setError(null);
    if (repoOpts) return;
    try {
      const opts = await githubListRepos();
      setRepoOpts(opts);
      setSelected(new Set(status?.repos ?? []));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const saveRepos = async () => {
    setBusy(true);
    setError(null);
    try {
      await githubSetRepos([...selected]);
      setPicking(false);
      setNote("Saved. Indexing your repos now — answers from GitHub appear in a minute.");
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const connectPat = async () => {
    setError(null);
    const repos = reposText
      .split(/[\n,]/)
      .map((r) => r.trim())
      .filter(Boolean);
    const bad = repos.filter((r) => !REPO_RE.test(r));
    if (repos.length === 0) return setError("Add at least one repo (owner/repo).");
    if (bad.length) return setError(`Use owner/repo format: ${bad.join(", ")}`);
    setBusy(true);
    try {
      await githubLink(token.trim(), repos);
      setToken("");
      setNote("Connected. Indexing now — answers from GitHub appear in a minute.");
      await refresh();
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
      setNote("Re-indexing… new commits/issues will be searchable shortly.");
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
      await githubUnlink();
      setRepoOpts(null);
      setSelected(new Set());
      setPicking(false);
      setNote("Disconnected. Your GitHub data was removed.");
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const toggle = (name: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });

  const connected = status?.connected;
  const authorized = status?.authorized;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-bg/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-panel p-5 shadow-glow" onClick={(e) => e.stopPropagation()}>
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
        ) : picking ? (
          // ---- repo picker (post-authorize) ----
          <div className="space-y-3">
            <p className="text-xs text-muted">Pick the repos to index. Only you can search them.</p>
            {!repoOpts ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-violet" />
              </div>
            ) : (
              <ul className="max-h-56 space-y-1 overflow-y-auto">
                {repoOpts.map((r) => (
                  <li key={r.fullName}>
                    <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-panel-2 px-2.5 py-1.5 text-xs text-slate-200 hover:border-violet/50">
                      <input type="checkbox" checked={selected.has(r.fullName)} onChange={() => toggle(r.fullName)} className="accent-violet" />
                      <span className="flex-1 truncate">{r.fullName}</span>
                      {r.private && (
                        <span title="private" className="flex items-center">
                          <Lock className="h-3 w-3 text-muted" />
                        </span>
                      )}
                    </label>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2">
              <Button size="sm" onClick={saveRepos} disabled={busy || selected.size === 0} className="flex-1">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Index {selected.size || ""}
              </Button>
              {connected && (
                <Button variant="outline" size="sm" onClick={() => setPicking(false)} disabled={busy}>
                  Cancel
                </Button>
              )}
            </div>
          </div>
        ) : connected ? (
          // ---- connected ----
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-400">
              <Check className="h-4 w-4 shrink-0" /> Connected · {status!.repos.length} repo{status!.repos.length === 1 ? "" : "s"}
            </div>
            <ul className="max-h-40 space-y-1 overflow-y-auto">
              {status!.repos.map((r) => (
                <li key={r} className="flex items-center gap-2 rounded-md border border-border bg-panel-2 px-2.5 py-1.5 text-xs text-slate-200">
                  <Github className="h-3 w-3 text-muted" /> {r}
                </li>
              ))}
            </ul>
            {status!.lastSyncAt && <p className="text-xs text-muted">Last indexed: {new Date(status!.lastSyncAt).toLocaleString()}</p>}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={openPicker} disabled={busy} className="flex-1">
                <Github className="h-4 w-4" /> Edit repos
              </Button>
              <Button variant="outline" size="sm" onClick={sync} disabled={busy} className="flex-1">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Sync
              </Button>
              <Button variant="outline" size="sm" onClick={disconnect} disabled={busy} className="hover:border-rose-500/60 hover:text-rose-400">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : authorized ? (
          // authorized but nothing picked (picker effect will open it; show a nudge meanwhile)
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Loader2 className="h-5 w-5 animate-spin text-violet" />
            <p className="text-sm text-muted">Loading your repositories…</p>
          </div>
        ) : status?.oauthEnabled && !usePat ? (
          // ---- not connected: one-click OAuth ----
          <div className="space-y-3">
            <p className="text-xs leading-relaxed text-muted">
              Authorize Linked Layer to read your repos, then pick which ones to index. The chat answers from their code, READMEs,
              issues & PRs — and only you can see your data.
            </p>
            <Button onClick={connectOauth} disabled={busy} className="w-full">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Github className="h-4 w-4" />} Connect with GitHub
            </Button>
            <button onClick={() => setUsePat(true)} className="w-full text-center text-[11px] text-muted hover:text-slate-300">
              or use an access token instead
            </button>
          </div>
        ) : (
          // ---- PAT fallback ----
          <div className="space-y-3">
            <p className="text-xs leading-relaxed text-muted">
              Paste a GitHub{" "}
              <a href="https://github.com/settings/tokens?type=beta" target="_blank" rel="noopener noreferrer" className="text-violet hover:underline">
                access token
              </a>{" "}
              (read-only: repo contents + issues) and the repos to index.
            </p>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="github_pat_…"
              autoComplete="off"
              className="w-full rounded-lg border border-border bg-panel-2 px-3 py-2 text-sm text-white outline-none placeholder:text-muted focus:border-violet/60"
            />
            <textarea
              value={reposText}
              onChange={(e) => setReposText(e.target.value)}
              rows={3}
              placeholder={"owner/repo\nowner/another-repo"}
              className="w-full resize-none rounded-lg border border-border bg-panel-2 px-3 py-2 font-mono text-xs text-white outline-none placeholder:text-muted focus:border-violet/60"
            />
            <Button onClick={connectPat} disabled={busy || !token.trim()} className="w-full">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Github className="h-4 w-4" />} Connect
            </Button>
            {status?.oauthEnabled && (
              <button onClick={() => setUsePat(false)} className="w-full text-center text-[11px] text-muted hover:text-slate-300">
                ← back to one-click
              </button>
            )}
          </div>
        )}

        {error && <p className="mt-3 text-xs leading-snug text-rose-400">{error}</p>}
        {note && !error && <p className="mt-3 text-xs leading-snug text-emerald-400">{note}</p>}
      </div>
    </div>
  );
}
