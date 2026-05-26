import { useQuery } from "@tanstack/react-query";
import { config, isLive } from "@/lib/config";

export interface TokenStats {
  priceUsd: number | null;
  marketCap: number | null;
  volume24h: number | null;
  priceChange24h: number | null;
  liquidityUsd: number | null;
  pairUrl: string | null;
  isPlaceholder: boolean;
}

interface DexPair {
  priceUsd?: string;
  marketCap?: number;
  fdv?: number;
  url?: string;
  volume?: { h24?: number };
  priceChange?: { h24?: number };
  liquidity?: { usd?: number };
}

const PLACEHOLDER: TokenStats = {
  priceUsd: null,
  marketCap: null,
  volume24h: null,
  priceChange24h: null,
  liquidityUsd: null,
  pairUrl: null,
  isPlaceholder: true,
};

/** Live $LINKED market stats from DexScreener; placeholder until the CA is set. */
export function useTokenStats() {
  return useQuery<TokenStats>({
    queryKey: ["token-stats", config.tokenCa],
    refetchInterval: 30_000,
    queryFn: async () => {
      if (!isLive.token()) return PLACEHOLDER;
      const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${config.tokenCa}`);
      if (!res.ok) throw new Error(`DexScreener ${res.status}`);
      const json = (await res.json()) as { pairs?: DexPair[] };
      const pairs = json.pairs ?? [];
      if (pairs.length === 0) return PLACEHOLDER;
      // Pick the deepest-liquidity pair.
      const best = pairs.reduce((a, b) => ((b.liquidity?.usd ?? 0) > (a.liquidity?.usd ?? 0) ? b : a));
      return {
        priceUsd: best.priceUsd ? Number(best.priceUsd) : null,
        marketCap: best.marketCap ?? best.fdv ?? null,
        volume24h: best.volume?.h24 ?? null,
        priceChange24h: best.priceChange?.h24 ?? null,
        liquidityUsd: best.liquidity?.usd ?? null,
        pairUrl: best.url ?? null,
        isPlaceholder: false,
      };
    },
  });
}
