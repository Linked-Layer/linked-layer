import { BRAND } from "@recall/core";

export interface UsageRecord {
  endpoint: string;
  holder: string | null;
  feeUsdc: number;
  txRef: string | null;
}

/**
 * Treasury / fee sink. Real implementation routes collected fees to buyback &
 * burn of `$LINKED`. This stub just accumulates and logs.
 */
export interface Treasury {
  recordUsage(record: UsageRecord): Promise<void>;
  totalCollectedUsdc(): number;
}

export class StubTreasury implements Treasury {
  private total = 0;

  async recordUsage(record: UsageRecord): Promise<void> {
    this.total += record.feeUsdc;
    console.log(
      `[treasury] +$${record.feeUsdc.toFixed(4)} from ${record.holder ?? "agent"} via ${record.endpoint} ` +
        `(tx=${record.txRef ?? "n/a"}) → buyback&burn ${BRAND.symbol} [STUB]. total=$${this.total.toFixed(4)}`,
    );
  }

  totalCollectedUsdc(): number {
    return this.total;
  }
}

let instance: Treasury | null = null;
export function getTreasury(): Treasury {
  instance ??= new StubTreasury();
  return instance;
}
