import { Flame, KeyRound, Zap } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Reveal } from "@/components/Reveal";
import { Section } from "@/components/Section";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { BRAND } from "@/lib/brand";

const ALLOCATION = [
  { name: "Liquidity", value: 50, color: "#7c5cff" },
  { name: "Community & airdrops", value: 20, color: "#22d3ee" },
  { name: "Treasury (buyback & burn)", value: 15, color: "#a78bfa" },
  { name: "Team (vested)", value: 10, color: "#38bdf8" },
  { name: "Ecosystem", value: 5, color: "#818cf8" },
];

const UTILITY = [
  {
    icon: <KeyRound className="h-5 w-5" />,
    title: "Hold to use",
    desc: `Hold ${BRAND.symbol} to unlock access, capacity tiers and private namespaces. Your balance is your key.`,
  },
  {
    icon: <Zap className="h-5 w-5" />,
    title: "Pay per context call",
    desc: "External agents pay per recall() via x402 (USDC / $LINKED) — usage-based, no plans, no friction.",
  },
  {
    icon: <Flame className="h-5 w-5" />,
    title: "Buyback & burn",
    desc: "Protocol usage and fees route to the treasury, which buys back and burns $LINKED over time.",
  },
];

export function Tokenomics() {
  return (
    <Section
      eyebrow="Tokenomics"
      title={<>The {BRAND.symbol} flywheel</>}
      subtitle="Access is gated by holding the token; agents pay to use it; fees fuel buyback & burn."
    >
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <Reveal variant="left">
          <div className="panel p-6">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ALLOCATION}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={3}
                    stroke="none"
                  >
                    {ALLOCATION.map((a) => (
                      <Cell key={a.name} fill={a.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "#0d0d16", border: "1px solid #1d1d2b", borderRadius: 12, color: "#fff" }}
                    formatter={(v: number, n: string) => [`${v}%`, n]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {ALLOCATION.map((a) => (
                <div key={a.name} className="flex items-center gap-2 text-sm">
                  <span className="h-3 w-3 rounded-full" style={{ background: a.color }} />
                  <span className="text-slate-300">{a.name}</span>
                  <span className="ml-auto font-medium text-white">{a.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </Reveal>

        <div className="space-y-4">
          {UTILITY.map((u, i) => (
            <Reveal key={u.title} delay={i * 0.08} variant="right">
              <Card className="flex gap-4">
                <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet/15 text-violet">
                  {u.icon}
                </div>
                <div>
                  <CardTitle>{u.title}</CardTitle>
                  <CardDescription>{u.desc}</CardDescription>
                </div>
              </Card>
            </Reveal>
          ))}
        </div>
      </div>
    </Section>
  );
}
