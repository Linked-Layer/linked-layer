import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import type { IconType } from "react-icons";
import { SiConfluence, SiGithub, SiGoogledrive, SiJira, SiLinear, SiNotion, SiSlack } from "react-icons/si";
import { GithubConnect } from "@/components/GithubConnect";
import { NotionConnect } from "@/components/NotionConnect";
import { githubStatus, notionStatus } from "@/lib/api";
import { useWalletCtx } from "@/providers/Wallet";

type Connector = "github" | "notion";

interface Source {
  name: string;
  Icon: IconType;
  /** Live per-user connectors open a connect modal; others are greyed "coming soon". */
  connector?: Connector;
  /** Tile background for live connectors (brand colour). */
  bg?: string;
}

const SOURCES: Source[] = [
  // Live connectors first + rendered larger; the rest are smaller "coming soon" tiles.
  { name: "GitHub", Icon: SiGithub, connector: "github", bg: "#1F2328" },
  { name: "Notion", Icon: SiNotion, connector: "notion", bg: "#0B0B0B" },
  { name: "Slack", Icon: SiSlack },
  { name: "Google Drive", Icon: SiGoogledrive },
  { name: "Linear", Icon: SiLinear },
  { name: "Jira", Icon: SiJira },
  { name: "Confluence", Icon: SiConfluence },
];

/**
 * Supported sources. GitHub & Notion are live — click to connect your own (scoped to
 * your wallet). The rest are greyed-out "coming soon" tiles.
 */
export function ConnectSources({ variant = "strip" }: { variant?: "strip" | "mini" }) {
  const { verified } = useWalletCtx();
  const [note, setNote] = useState(false);
  const [open, setOpen] = useState<Connector | null>(null);
  const [connected, setConnected] = useState<Record<Connector, boolean>>({ github: false, notion: false });
  const mini = variant === "mini";
  // Live connectors are bigger/brighter; "coming soon" tiles are smaller + greyed.
  const liveTile = mini ? "h-9 w-9" : "h-12 w-12";
  const soonTile = mini ? "h-6 w-6" : "h-9 w-9";
  const liveIc = mini ? "h-5 w-5" : "h-6 w-6";
  const soonIc = mini ? "h-3 w-3" : "h-4 w-4";

  const setConn = (c: Connector, v: boolean) => setConnected((prev) => ({ ...prev, [c]: v }));

  useEffect(() => {
    if (!verified) {
      setConnected({ github: false, notion: false });
      return;
    }
    let alive = true;
    githubStatus().then((s) => alive && setConn("github", s.connected)).catch(() => {});
    notionStatus().then((s) => alive && setConn("notion", s.connected)).catch(() => {});
    return () => {
      alive = false;
    };
  }, [verified, open]);

  // Returning from an OAuth redirect (?github=connected / ?notion=connected) → open the
  // matching modal. Only the full strip handles it (and clears the param) to avoid doubles.
  useEffect(() => {
    if (mini) return;
    const p = new URLSearchParams(window.location.search);
    const target = (["github", "notion"] as Connector[]).find((c) => p.get(c) === "connected");
    if (target) {
      setOpen(target);
      p.delete(target);
      const qs = p.toString();
      window.history.replaceState({}, "", window.location.pathname + (qs ? `?${qs}` : ""));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={mini ? "" : "flex flex-col items-center gap-3"}>
      {!mini && (
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">Connect your tools → one context</div>
      )}
      <div className={`flex flex-wrap items-center ${mini ? "gap-1.5" : "justify-center gap-2.5"}`}>
        {SOURCES.map((s, i) =>
          s.connector ? (
            <button
              key={s.name}
              title={connected[s.connector] ? `${s.name} · connected` : `Connect ${s.name}`}
              onClick={() => setOpen(s.connector!)}
              style={{ background: s.bg, animationDelay: `${i * 0.4}s` }}
              className={`animate-bob motion-reduce:animate-none relative flex ${liveTile} items-center justify-center rounded-xl shadow-glow ring-1 ring-white/15 transition hover:ring-violet/70`}
            >
              <s.Icon className={`${liveIc} text-white`} />
              {connected[s.connector] && (
                <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-bg" />
              )}
            </button>
          ) : (
            <button
              key={s.name}
              title={`${s.name} · coming soon`}
              onClick={() => setNote(true)}
              className={`relative flex ${soonTile} items-center justify-center rounded-lg bg-panel-2 opacity-60 ring-1 ring-white/10 grayscale transition hover:opacity-100 hover:ring-violet/40`}
            >
              <s.Icon className={`${soonIc} text-slate-500`} />
            </button>
          ),
        )}
        <button
          onClick={() => setNote(true)}
          title="Add a source"
          className={`flex ${soonTile} items-center justify-center rounded-lg border border-dashed border-border text-muted transition hover:border-violet/60 hover:text-white`}
        >
          <Plus className={mini ? "h-3 w-3" : "h-4 w-4"} />
        </button>
      </div>
      <div className={`mt-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-600 ${mini ? "" : "text-center"}`}>
        GitHub & Notion live · more connectors soon
      </div>
      {note && (
        <div className={`text-xs leading-relaxed text-muted ${mini ? "mt-2" : "max-w-md text-center"}`}>
          That connector is coming soon. GitHub & Notion work now — click one to connect. You can also paste a link in the
          chat and Linked Layer will pull it in as context.
        </div>
      )}
      {open === "github" && <GithubConnect onClose={() => setOpen(null)} onChange={(v) => setConn("github", v)} />}
      {open === "notion" && <NotionConnect onClose={() => setOpen(null)} onChange={(v) => setConn("notion", v)} />}
    </div>
  );
}
