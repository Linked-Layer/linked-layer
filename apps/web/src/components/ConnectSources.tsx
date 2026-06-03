import { Plus } from "lucide-react";
import { useState } from "react";
import type { IconType } from "react-icons";
import { SiConfluence, SiGithub, SiGoogledrive, SiJira, SiLinear, SiNotion, SiSlack } from "react-icons/si";

interface Source {
  name: string;
  color: string;
  Icon: IconType;
  live?: boolean;
}

// Tools Linked Layer ingests into the shared context graph. Slack + GitHub are live;
// the rest are on the roadmap (shown so it's clear you link your own tools).
const SOURCES: Source[] = [
  { name: "Slack", color: "#4A154B", Icon: SiSlack, live: true },
  { name: "GitHub", color: "#1F2328", Icon: SiGithub, live: true },
  { name: "Notion", color: "#000000", Icon: SiNotion },
  { name: "Google Drive", color: "#1A73E8", Icon: SiGoogledrive },
  { name: "Linear", color: "#5E6AD2", Icon: SiLinear },
  { name: "Jira", color: "#0052CC", Icon: SiJira },
  { name: "Confluence", color: "#172B4D", Icon: SiConfluence },
];

/**
 * Supported sources, shown as real service tiles — signals that you link your own
 * tools to build a shared context graph. Connectors are stubbed for now ("coming soon").
 */
export function ConnectSources({ variant = "strip" }: { variant?: "strip" | "mini" }) {
  const [note, setNote] = useState(false);
  const mini = variant === "mini";
  const tile = mini ? "h-7 w-7" : "h-10 w-10";
  const ic = mini ? "h-3.5 w-3.5" : "h-5 w-5";

  return (
    <div className={mini ? "" : "flex flex-col items-center gap-3"}>
      {!mini && (
        <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted">
          Connect your tools → one context
        </div>
      )}
      <div className={`flex flex-wrap ${mini ? "gap-1.5" : "justify-center gap-2.5"}`}>
        {SOURCES.map((s) => (
          <button
            key={s.name}
            title={`${s.name}${s.live ? " · live" : " · coming soon"}`}
            onClick={() => setNote(true)}
            className={`relative flex ${tile} items-center justify-center rounded-lg ring-1 ring-white/10 transition hover:ring-violet/70`}
            style={{ background: s.color }}
          >
            <s.Icon className={`${ic} text-white`} />
            {s.live && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-bg" />}
          </button>
        ))}
        <button
          onClick={() => setNote(true)}
          title="Add a source"
          className={`flex ${tile} items-center justify-center rounded-lg border border-dashed border-border text-muted transition hover:border-violet/60 hover:text-white`}
        >
          <Plus className={mini ? "h-3.5 w-3.5" : "h-4 w-4"} />
        </button>
      </div>
      {note && (
        <div className={`text-xs leading-relaxed text-muted ${mini ? "mt-2" : "max-w-md text-center"}`}>
          One-click connectors are coming soon. To connect now, paste a link (GitHub repo, doc, or page)
          in the chat and Linked Layer will pull it in as context.
        </div>
      )}
    </div>
  );
}
