/** Compact number, e.g. 1234567 → "1.23M". */
export function compact(n: number | null | undefined, digits = 2): string {
  if (n == null || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: digits }).format(n);
}

/** USD price with adaptive precision for small caps. */
export function usd(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  if (n > 0 && n < 0.01) return `$${n.toPrecision(2)}`;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);
}

/** Signed percentage, e.g. 4.21 → "+4.21%". */
export function pct(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  const s = n >= 0 ? "+" : "";
  return `${s}${n.toFixed(2)}%`;
}

/** Group digits, e.g. 348239123 → "348,239,123". */
export function group(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US").format(n);
}
