import { BRAND, GatingError, RecallError } from "@recall/core";
import type { TokenGate } from "./tokenGate";

interface ParsedTokenAccount {
  account: {
    data: {
      parsed: { info: { tokenAmount: { uiAmount: number | null; amount: string; decimals: number } } };
    };
  };
}

interface RpcResponse {
  error?: { message: string };
  result?: { value: ParsedTokenAccount[] };
}

/**
 * Real hold-to-use gating: reads the on-chain SPL balance of the configured
 * `$LINKED` mint for a holder's Solana address via JSON-RPC (`getTokenAccountsByOwner`).
 * Balances are compared as UI amounts (decimal-adjusted), so `GATING_MIN_BALANCE`
 * is expressed in whole tokens.
 *
 * Fails CLOSED: if the chain can't be queried (bad address, RPC down), access is
 * denied rather than granted.
 */
export class SolanaTokenGate implements TokenGate {
  constructor(
    private readonly rpcUrl: string,
    private readonly mint: string,
  ) {
    if (!mint || mint === "stub-mint-address") {
      throw new Error("SolanaTokenGate requires a real token mint — set MNEMO_TOKEN_MINT");
    }
  }

  async balanceOf(holder: string): Promise<number> {
    // Filter by `mint` (NOT by programId): this is program-agnostic, so it works for
    // both classic SPL Token and **Token-2022** mints — the RPC resolves the mint's
    // owning program automatically. Token-2022 program: TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb.
    const res = await fetch(this.rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTokenAccountsByOwner",
        params: [holder, { mint: this.mint }, { encoding: "jsonParsed" }],
      }),
    });
    if (!res.ok) {
      throw new Error(`Solana RPC ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }
    const json = (await res.json()) as RpcResponse;
    if (json.error) throw new Error(`Solana RPC error: ${json.error.message}`);

    // Sum across all the holder's token accounts for this mint (usually one ATA).
    let total = 0;
    for (const acc of json.result?.value ?? []) {
      const amt = acc.account.data.parsed.info.tokenAmount;
      total += amt.uiAmount ?? Number(amt.amount) / 10 ** amt.decimals;
    }
    return total;
  }

  async requireBalance(holder: string | undefined, minBalance: number): Promise<number> {
    if (!holder) {
      throw new GatingError("Missing holder wallet address", { minBalance });
    }

    let balance: number;
    try {
      balance = await this.balanceOf(holder);
    } catch (err) {
      // Can't verify on-chain → deny (fail closed), but as a 502 so it's not
      // mistaken for a real "insufficient balance" verdict.
      throw new RecallError(`Could not verify ${BRAND.symbol} balance on-chain`, {
        status: 502,
        code: "gating_verification_failed",
        details: { holder, minBalance, reason: (err as Error).message },
      });
    }

    if (balance < minBalance) {
      throw new GatingError(`Hold at least ${minBalance} ${BRAND.symbol} to use this endpoint`, {
        holder,
        balance,
        minBalance,
      });
    }
    return balance;
  }
}
