import { motion } from "framer-motion";
import { ArrowRight, FileText, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Parallax } from "@/components/motion";
import { BRAND } from "@/lib/brand";
import { config } from "@/lib/config";

export function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pb-20 pt-32 sm:px-6 md:pt-40">
      <HeroBackground />
      <div className="relative mx-auto max-w-4xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex justify-center"
        >
          <Badge>
            <Sparkles className="h-3.5 w-3.5 text-violet" />
            {BRAND.symbol} · context layer on {BRAND.chain}
          </Badge>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.05 }}
          className="mt-6 text-4xl font-semibold leading-[1.1] tracking-tight text-white sm:text-5xl md:text-6xl"
        >
          The <span className="gradient-text">shared memory</span> layer for teams &amp; agents
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.12 }}
          className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted"
        >
          {BRAND.name} unifies Slack, docs, GitHub, trackers and calls into one permission-aware
          context graph — then serves it to people (“ask the company”) and to AI agents via MCP and a
          single <code className="rounded bg-panel px-1.5 py-0.5 text-violet">recall()</code> call.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.18 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-3"
        >
          <a href="#demo">
            <Button size="lg">
              Try the live demo <ArrowRight className="h-4 w-4" />
            </Button>
          </a>
          <Link to="/whitepaper">
            <Button variant="outline" size="lg">
              <FileText className="h-4 w-4" /> Whitepaper
            </Button>
          </Link>
          <a href={config.links.dexscreener} target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="lg">
              Buy {BRAND.symbol}
            </Button>
          </a>
        </motion.div>
      </div>
    </section>
  );
}

/** Animated SVG backdrop: drifting node graph + gradient glow. */
function HeroBackground() {
  const nodes = [
    [120, 90],
    [320, 60],
    [520, 130],
    [220, 240],
    [430, 260],
    [620, 220],
  ];
  const edges = [
    [0, 1],
    [1, 2],
    [0, 3],
    [3, 4],
    [4, 2],
    [4, 5],
    [2, 5],
  ];
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-radial-fade" />
      <div className="absolute -left-32 top-10 h-72 w-72 animate-float rounded-full bg-violet/20 blur-3xl" />
      <div className="absolute -right-24 top-40 h-80 w-80 animate-float rounded-full bg-cyan/15 blur-3xl [animation-delay:2s]" />
      <Parallax amount={70}>
        <svg viewBox="0 0 720 360" className="absolute left-1/2 top-10 h-[420px] w-[1100px] -translate-x-1/2 opacity-50">
        <defs>
          <linearGradient id="hero-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#7c5cff" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
        </defs>
        {edges.map(([a, b], i) => (
          <motion.line
            key={i}
            x1={nodes[a][0]}
            y1={nodes[a][1]}
            x2={nodes[b][0]}
            y2={nodes[b][1]}
            stroke="url(#hero-g)"
            strokeWidth="1.2"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.5 }}
            transition={{ duration: 1.4, delay: 0.4 + i * 0.12 }}
          />
        ))}
        {nodes.map(([cx, cy], i) => (
          <motion.circle
            key={i}
            cx={cx}
            cy={cy}
            r="5"
            fill="url(#hero-g)"
            animate={{ opacity: [0.5, 1, 0.5], r: [4, 6, 4] }}
            transition={{ duration: 3, repeat: Infinity, delay: i * 0.3 }}
          />
        ))}
        </svg>
      </Parallax>
    </div>
  );
}
