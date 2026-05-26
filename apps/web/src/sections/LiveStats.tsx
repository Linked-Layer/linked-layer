import { Activity, Boxes, Coins, Layers, LineChart, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useSolanaStats } from "@/hooks/useSolanaStats";
import { useTokenStats } from "@/hooks/useTokenStats";
import { BRAND } from "@/lib/brand";
import { compact, group, pct, usd } from "@/lib/format";
import { cn } from "@/lib/utils";

export function LiveStats() {
  const token = useTokenStats();
  const sol = useSolanaStats();
  const t = token.data;
  const s = sol.data;

  return (
    <section className="mx-auto -mt-6 max-w-7xl px-4 sm:px-6">
      <div className="panel p-6 md:p-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted">
            <Activity className="h-4 w-4 text-violet" /> Live stats
          </h3>
          {t?.isPlaceholder ? (
            <Badge className="border-violet/40 text-violet">{BRAND.symbol} · pre-launch</Badge>
          ) : (
            <Badge className="border-cyan/40 text-cyan">{BRAND.symbol} · live</Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <Stat
            icon={<Coins className="h-4 w-4" />}
            label="Price"
            loading={token.isLoading}
            value={t?.isPlaceholder ? "TBA" : usd(t?.priceUsd)}
          />
          <Stat
            icon={<TrendingUp className="h-4 w-4" />}
            label="24h"
            loading={token.isLoading}
            value={t?.isPlaceholder ? "—" : pct(t?.priceChange24h)}
            valueClass={(t?.priceChange24h ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"}
          />
          <Stat
            icon={<LineChart className="h-4 w-4" />}
            label="Market cap"
            loading={token.isLoading}
            value={t?.isPlaceholder ? "TBA" : `$${compact(t?.marketCap)}`}
          />
          <Stat
            icon={<Layers className="h-4 w-4" />}
            label="Solana epoch"
            loading={sol.isLoading}
            value={s ? `#${s.epoch}` : undefined}
            sub={s ? `${Math.round(s.epochProgress * 100)}% complete` : undefined}
          />
          <Stat
            icon={<Boxes className="h-4 w-4" />}
            label="Current slot"
            loading={sol.isLoading}
            value={s ? group(s.slot) : undefined}
          />
          <Stat
            icon={<Activity className="h-4 w-4" />}
            label="Network TPS"
            loading={sol.isLoading}
            value={s ? group(s.tps) : undefined}
          />
        </div>
      </div>
    </section>
  );
}

function Stat({
  icon,
  label,
  value,
  sub,
  loading,
  valueClass,
}: {
  icon: ReactNode;
  label: string;
  value?: string;
  sub?: string;
  loading?: boolean;
  valueClass?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-panel-2/60 p-4">
      <div className="flex items-center gap-2 text-xs text-muted">
        <span className="text-violet">{icon}</span>
        {label}
      </div>
      {loading || value == null ? (
        <Skeleton className="mt-3 h-6 w-20" />
      ) : (
        <div className={cn("mt-2 text-xl font-semibold text-white", valueClass)}>{value}</div>
      )}
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </div>
  );
}
