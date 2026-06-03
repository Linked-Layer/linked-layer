import { LogoMark } from "@/components/Logo";

/**
 * Interactive snapshot of the team's permission-aware context graph. Nodes are real
 * memory entries (decisions/docs/threads/actions); clicking one recalls it. Edges
 * "flow" toward the hub to suggest live retrieval. Purely presentational + clickable.
 */
interface GraphNode {
  x: number; // % of container
  y: number;
  kind: string;
  label: string;
  prompt: string;
}

const NODES: GraphNode[] = [
  { x: 15, y: 18, kind: "Decision", label: "Solana for x402", prompt: "Why did the team pick Solana?" },
  { x: 85, y: 18, kind: "Thread", label: "Agent pricing", prompt: "How is agent pricing set?" },
  { x: 8, y: 52, kind: "Doc", label: "Architecture", prompt: "What is the architecture?" },
  { x: 92, y: 54, kind: "Action", label: "MCP server", prompt: "What's the status of the MCP server?" },
  { x: 26, y: 86, kind: "Doc", label: "$LINKED token", prompt: "How does the $LINKED token work?" },
  { x: 74, y: 86, kind: "Doc", label: "Getting access", prompt: "How do I get access?" },
];

export function MemoryGraph({ onPick }: { onPick: (prompt: string) => void }) {
  return (
    <div className="relative mx-auto aspect-[16/9] w-full max-w-2xl">
      {/* edges */}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        {NODES.map((n, i) => (
          <line
            key={i}
            x1="50"
            y1="50"
            x2={n.x}
            y2={n.y}
            stroke="#7c5cff"
            strokeOpacity="0.35"
            strokeWidth="0.4"
            strokeDasharray="1.6 2.2"
            vectorEffect="non-scaling-stroke"
          >
            <animate attributeName="stroke-dashoffset" from="7.6" to="0" dur="2.4s" repeatCount="indefinite" />
          </line>
        ))}
      </svg>

      {/* hub */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-violet/50 bg-panel-2 shadow-glow">
          <span className="absolute inset-0 -z-10 animate-ping rounded-2xl bg-violet/10" />
          <LogoMark className="h-7 w-auto" />
        </div>
      </div>

      {/* nodes */}
      {NODES.map((n, i) => (
        <button
          key={i}
          onClick={() => onPick(n.prompt)}
          style={{ left: `${n.x}%`, top: `${n.y}%` }}
          className="group absolute max-w-[150px] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-panel/80 px-2.5 py-1.5 text-left backdrop-blur transition-colors hover:border-violet/70 hover:bg-panel-2"
        >
          <div className="font-mono text-[9px] uppercase tracking-wider text-violet">{n.kind}</div>
          <div className="whitespace-nowrap text-xs text-slate-300 group-hover:text-white">{n.label}</div>
        </button>
      ))}
    </div>
  );
}
