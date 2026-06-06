import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import type { IconType } from "react-icons";
import { SiConfluence, SiGithub, SiGoogledrive, SiJira, SiLinear, SiNotion, SiSlack } from "react-icons/si";
import { GithubConnect } from "@/components/GithubConnect";
import { githubStatus } from "@/lib/api";
import { useWalletCtx } from "@/providers/Wallet";

interface Source {
  name: string;
  Icon: IconType;
  /** GitHub is a real per-user connector; the rest are still coming soon. */
  live?: boolean;
}

const SOURCES: Source[] = [
  { name: "Slack", Icon: SiSlack },
  { name: "GitHub", Icon: SiGithub, live: true },
  { name: "Notion", Icon: SiNotion },
  { name: "Google Drive", Icon: SiGoogledrive },
  { name: "Linear", Icon: SiLinear },
  { name: "Jira", Icon: SiJira },
  { name: "Confluence", Icon: SiConfluence },
];

/**
 * Supported sources. GitHub is live — click it to connect your own repos (scoped to
 * your wallet). The rest are greyed-out "coming soon" tiles.
 */
export function ConnectSources({ variant = "strip" }: { variant?: "strip" | "mini" }) {
  const { verified } = useWalletCtx();
  const [note, setNote] = useState(false);
  const [ghOpen, setGhOpen] = useState(false);
  const [ghConnected, setGhConnected] = useState(false);
  const mini = variant === "mini";
  const tile = mini ? "h-7 w-7" : "h-10 w-10";
  const ic = mini ? "h-3.5 w-3.5" : "h-5 w-5";

  useEffect(() => {
    if (!verified) {
      setGhConnected(false);
      return;
    }
    let alive = true;
    githubStatus()
      .then((s) => alive && setGhConnected(s.connected))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [verified, ghOpen]);

  return (
    <div className={mini ? "" : "flex flex-col items-center gap-3"}>
      {!mini && (
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">Connect your tools → one context</div>
      )}
      <div className={`flex flex-wrap ${mini ? "gap-1.5" : "justify-center gap-2.5"}`}>
        {SOURCES.map((s) =>
          s.live ? (
            <button
              key={s.name}
              title={ghConnected ? "GitHub · connected" : "Connect GitHub"}
              onClick={() => setGhOpen(true)}
              className={`relative flex ${tile} items-center justify-center rounded-lg bg-[#1F2328] ring-1 ring-white/10 transition hover:ring-violet/70`}
            >
              <s.Icon className={`${ic} text-white`} />
              {ghConnected && (
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-bg" />
              )}
            </button>
          ) : (
            <button
              key={s.name}
              title={`${s.name} · coming soon`}
              onClick={() => setNote(true)}
              className={`relative flex ${tile} items-center justify-center rounded-lg bg-panel-2 ring-1 ring-white/10 grayscale transition hover:text-slate-300 hover:ring-violet/40`}
            >
              <s.Icon className={`${ic} text-slate-500`} />
            </button>
          ),
        )}
        <button
          onClick={() => setNote(true)}
          title="Add a source"
          className={`flex ${tile} items-center justify-center rounded-lg border border-dashed border-border text-muted transition hover:border-violet/60 hover:text-white`}
        >
          <Plus className={mini ? "h-3.5 w-3.5" : "h-4 w-4"} />
        </button>
      </div>
      <div className={`mt-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-600 ${mini ? "" : "text-center"}`}>
        GitHub live · more connectors soon
      </div>
      {note && (
        <div className={`text-xs leading-relaxed text-muted ${mini ? "mt-2" : "max-w-md text-center"}`}>
          That connector is coming soon. GitHub works now — click it to connect your repos. You can also paste a link in
          the chat and Linked Layer will pull it in as context.
        </div>
      )}
      {ghOpen && <GithubConnect onClose={() => setGhOpen(false)} onChange={setGhConnected} />}
    </div>
  );
}
