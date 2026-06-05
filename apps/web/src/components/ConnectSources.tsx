import { Plus } from "lucide-react";
import { useState } from "react";
import type { IconType } from "react-icons";
import { SiConfluence, SiGithub, SiGoogledrive, SiJira, SiLinear, SiNotion, SiSlack } from "react-icons/si";

interface Source {
  name: string;
  Icon: IconType;
}

// Tools Linked Layer will ingest into the shared context graph. One-click connectors are
// coming soon, so the tiles are shown greyed-out (you link your own tools here).
const SOURCES: Source[] = [
  { name: "Slack", Icon: SiSlack },
  { name: "GitHub", Icon: SiGithub },
  { name: "Notion", Icon: SiNotion },
  { name: "Google Drive", Icon: SiGoogledrive },
  { name: "Linear", Icon: SiLinear },
  { name: "Jira", Icon: SiJira },
  { name: "Confluence", Icon: SiConfluence },
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
            title={`${s.name} · coming soon`}
            onClick={() => setNote(true)}
            className={`relative flex ${tile} items-center justify-center rounded-lg bg-panel-2 ring-1 ring-white/10 grayscale transition hover:text-slate-300 hover:ring-violet/40`}
          >
            <s.Icon className={`${ic} text-slate-500`} />
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
      <div className={`mt-1.5 font-mono text-[10px] uppercase tracking-wider text-slate-600 ${mini ? "" : "text-center"}`}>
        Connectors · coming soon
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
