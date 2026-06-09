import { Calendar, FileText, Github, Hash, MessageSquare, Trello } from "lucide-react";
import type { ReactNode } from "react";
import { Section } from "@/components/Section";
import { Marquee } from "@/components/motion";

const SOURCES: { name: string; icon: ReactNode }[] = [
  { name: "Slack", icon: <Hash className="h-5 w-5" /> },
  { name: "GitHub", icon: <Github className="h-5 w-5" /> },
  { name: "Notion", icon: <FileText className="h-5 w-5" /> },
  { name: "Linear", icon: <Trello className="h-5 w-5" /> },
  { name: "Drive", icon: <FileText className="h-5 w-5" /> },
  { name: "Calls", icon: <Calendar className="h-5 w-5" /> },
  { name: "Jira", icon: <Trello className="h-5 w-5" /> },
  { name: "CRM", icon: <MessageSquare className="h-5 w-5" /> },
];

export function Integrations() {
  return (
    <Section
      eyebrow="Connectors"
      title="Plugs into the tools you already use"
      subtitle="Permissions mirror the source — Linked Layer never shows anyone what they couldn't already see."
    >
      <Marquee speed={28}>
        {SOURCES.map((s) => (
          <div
            key={s.name}
            className="flex items-center gap-2.5 rounded-xl border border-border bg-panel px-6 py-4 text-muted shadow-sm transition-colors hover:border-stone-300 hover:text-ink"
          >
            <span className="text-accent">{s.icon}</span>
            <span className="whitespace-nowrap text-sm font-medium">{s.name}</span>
          </div>
        ))}
      </Marquee>
    </Section>
  );
}
