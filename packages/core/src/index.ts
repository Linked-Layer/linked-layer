export * from "./brand";
export * from "./errors";
export * from "./types";
export * from "./schemas";
export * from "./auth";
export { config } from "./config";
export type { Config } from "./config";

/** Stable id helper (no external deps; sortable-ish). */
export function newId(prefix = "n"): string {
  const rand = Array.from({ length: 16 }, () => Math.floor(Math.random() * 36).toString(36)).join("");
  return `${prefix}_${rand}`;
}
