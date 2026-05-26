import { useQuery } from "@tanstack/react-query";
import { config } from "@/lib/config";

export interface SolanaStats {
  slot: number;
  epoch: number;
  slotInEpoch: number;
  slotsInEpoch: number;
  epochProgress: number; // 0..1
  tps: number;
}

async function rpc<T>(method: string, params: unknown[] = []): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(config.solanaRpc, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`RPC ${method} ${res.status}`);
    const json = (await res.json()) as { result?: T; error?: { message: string } };
    if (json.error) throw new Error(json.error.message);
    return json.result as T;
  } finally {
    clearTimeout(timer);
  }
}

/** Live Solana network stats (slot, epoch progress, TPS). */
export function useSolanaStats() {
  return useQuery<SolanaStats>({
    queryKey: ["solana-stats", config.solanaRpc],
    refetchInterval: 10_000,
    retry: 1,
    queryFn: async () => {
      const [epoch, perf] = await Promise.all([
        rpc<{ epoch: number; slotIndex: number; slotsInEpoch: number; absoluteSlot: number }>("getEpochInfo"),
        rpc<Array<{ numTransactions: number; samplePeriodSecs: number }>>("getRecentPerformanceSamples", [1]),
      ]);

      const sample = perf[0];
      const tps = sample && sample.samplePeriodSecs > 0 ? sample.numTransactions / sample.samplePeriodSecs : 0;

      return {
        slot: epoch.absoluteSlot,
        epoch: epoch.epoch,
        slotInEpoch: epoch.slotIndex,
        slotsInEpoch: epoch.slotsInEpoch,
        epochProgress: epoch.slotsInEpoch > 0 ? epoch.slotIndex / epoch.slotsInEpoch : 0,
        tps: Math.round(tps),
      };
    },
  });
}
