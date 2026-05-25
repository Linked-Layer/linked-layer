import { GatingError, config } from "@recall/core";

/**
 * Hold-to-use gating. Real implementation will read an SPL token balance for the
 * `$RECALL` mint on Solana; this stub reads balances from config.
 */
export interface TokenGate {
  /** $RECALL balance held by a subject. */
  balanceOf(holder: string): Promise<number>;
  /** Throw {@link GatingError} unless the holder meets `minBalance`. Returns the balance. */
  requireBalance(holder: string | undefined, minBalance: number): Promise<number>;
}

export class StubTokenGate implements TokenGate {
  private readonly balances = new Map<string, number>();

  constructor(stubBalances = config.gating.stubBalances) {
    for (const pair of stubBalances.split(",")) {
      const [holder, amount] = pair.split(":");
      if (holder && amount) this.balances.set(holder.trim(), Number.parseInt(amount.trim(), 10) || 0);
    }
  }

  async balanceOf(holder: string): Promise<number> {
    return this.balances.get(holder) ?? 0;
  }

  async requireBalance(holder: string | undefined, minBalance: number): Promise<number> {
    if (!holder) {
      throw new GatingError("Missing holder identity (x-recall-holder)", { minBalance });
    }
    const balance = await this.balanceOf(holder);
    if (balance < minBalance) {
      throw new GatingError(`Hold at least ${minBalance} ${config.gating ? "$RECALL" : ""} to use this endpoint`, {
        holder,
        balance,
        minBalance,
      });
    }
    return balance;
  }
}

let instance: TokenGate | null = null;
export function getTokenGate(): TokenGate {
  instance ??= new StubTokenGate();
  return instance;
}
