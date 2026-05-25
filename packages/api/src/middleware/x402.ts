import { PaymentRequiredError } from "@recall/core";
import { getPaymentGate, getTreasury } from "@recall/gating";
import type { FastifyReply, FastifyRequest } from "fastify";
import { getHolder } from "./gating";

/**
 * x402 pay-per-call preHandler for agent endpoints. When enabled, requires a
 * settled `X-PAYMENT` header; otherwise responds 402 with a payment challenge.
 * On success, records the fee with the treasury (→ buyback&burn, stubbed).
 */
export async function requirePayment(req: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const gate = getPaymentGate();
  if (!gate.enabled) return;

  const header = req.headers["x-payment"];
  const paymentHeader = Array.isArray(header) ? header[0] : header;
  const result = await gate.verify(paymentHeader);

  if (!result.settled) {
    throw new PaymentRequiredError("Payment required for agent context call", gate.challenge());
  }

  await getTreasury().recordUsage({
    endpoint: req.url,
    holder: getHolder(req) ?? null,
    feeUsdc: result.amountUsdc,
    txRef: result.txRef,
  });
}
