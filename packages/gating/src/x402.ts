import { config } from "@recall/core";

export interface X402Challenge {
  /** Asset/price the caller must pay to proceed. */
  priceUsdc: number;
  /** Destination address (treasury). */
  payTo: string;
  scheme: "exact";
  network: string;
  /** Human hint for how to satisfy the stub. */
  hint: string;
}

export interface X402Verification {
  settled: boolean;
  amountUsdc: number;
  txRef: string | null;
}

/**
 * x402 pay-per-call gateway for agents. Real implementation will verify an
 * on-chain USDC (or $LINKED) settlement on Solana from the `X-PAYMENT` header.
 * This stub accepts any header of the form `mock <ref>`.
 */
export interface PaymentGate {
  enabled: boolean;
  challenge(): X402Challenge;
  verify(paymentHeader: string | undefined): Promise<X402Verification>;
}

export class StubX402Gate implements PaymentGate {
  get enabled(): boolean {
    return config.x402.enabled;
  }

  challenge(): X402Challenge {
    return {
      priceUsdc: config.x402.priceUsdc,
      payTo: config.x402.payTo,
      scheme: "exact",
      network: "solana-stub",
      hint: 'send header `X-PAYMENT: mock <any-ref>` to simulate a settled payment',
    };
  }

  async verify(paymentHeader: string | undefined): Promise<X402Verification> {
    if (paymentHeader && /^mock\s+\S+/i.test(paymentHeader)) {
      const ref = paymentHeader.trim().split(/\s+/)[1] ?? null;
      return { settled: true, amountUsdc: config.x402.priceUsdc, txRef: ref };
    }
    return { settled: false, amountUsdc: 0, txRef: null };
  }
}

let instance: PaymentGate | null = null;
export function getPaymentGate(): PaymentGate {
  instance ??= new StubX402Gate();
  return instance;
}
