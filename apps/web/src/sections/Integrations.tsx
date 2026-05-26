import { Calendar, FileText, Github, Hash, MessageSquare, Trello } from "lucide-react";
import type { ReactNode } from "react";
import { Reveal } from "@/components/Reveal";
import { Section } from "@/components/Section";

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
      <Reveal>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
          {SOURCES.map((s) => (
            <div
              key={s.name}
              className="flex flex-col items-center gap-2 rounded-xl border border-border bg-panel/50 py-6 text-muted transition-colors hover:border-violet/50 hover:text-white"
            >
              <span className="text-violet">{s.icon}</span>
              <span className="text-sm">{s.name}</span>
            </div>
          ))}
        </div>
      </Reveal>
    </Section>
  );
}
