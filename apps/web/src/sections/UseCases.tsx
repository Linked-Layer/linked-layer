import { Archive, GitPullRequest, GraduationCap, LifeBuoy, Bot } from "lucide-react";
import type { ReactNode } from "react";
import { Reveal } from "@/components/Reveal";
import { Section } from "@/components/Section";

interface UseCase {
  icon: ReactNode;
  title: string;
  desc: string;
}

const CASES: UseCase[] = [
  {
    icon: <GraduationCap className="h-5 w-5" />,
    title: "Onboarding without the archaeology",
    desc: "New hires ask “how does billing work?” or “why did we choose this stack?” and get a cited answer in seconds — instead of spending weeks reconstructing context from scrollback and asking around.",
  },
  {
    icon: <GitPullRequest className="h-5 w-5" />,
    title: "Decisions that stay decided",
    desc: "Settled choices stop getting silently re-litigated. The original rationale, trade-offs and owner are one query away, so the team builds forward instead of re-arguing the past.",
  },
  {
    icon: <Bot className="h-5 w-5" />,
    title: "Context for your agents",
    desc: "Autonomous agents call recall() before they act and pull the exact, permission-bounded context they need — rather than hallucinating, over-reaching, or seeing data the caller never could.",
  },
  {
    icon: <LifeBuoy className="h-5 w-5" />,
    title: "Internal support, self-served",
    desc: "Recurring “who owns X / what's the status of Y” questions are answered by the memory layer — not by interrupting a teammate and breaking their focus.",
  },
  {
    icon: <Archive className="h-5 w-5" />,
    title: "Continuity when people leave",
    desc: "When someone moves on, their reasoning stays. The institution remembers even as the team changes — your memory is infrastructure, not a person's inbox.",
  },
];

export function UseCases() {
  return (
    <Section
      eyebrow="Use cases"
      title="One memory, many jobs"
      subtitle="Anywhere a team's knowledge is scattered and needs to be recalled with the right permissions, Linked fits."
    >
      <div className="mx-auto max-w-3xl divide-y divide-border rounded-2xl border border-border bg-panel shadow-card">
        {CASES.map((u, i) => (
          <Reveal key={u.title} delay={i * 0.05} variant="up">
            <div className="group flex items-start gap-4 p-6 transition-colors hover:bg-panel-2/60">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent transition-transform duration-300 group-hover:scale-110">
                {u.icon}
              </div>
              <div>
                <h3 className="text-base font-semibold text-ink">{u.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{u.desc}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
