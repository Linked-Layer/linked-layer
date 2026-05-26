import { createAppKit } from "@reown/appkit/react";
import { solana, solanaDevnet } from "@reown/appkit/networks";
import { SolanaAdapter } from "@reown/appkit-adapter-solana/react";
import { BRAND } from "@/lib/brand";
import { config } from "@/lib/config";

/**
 * Initialize Reown AppKit for Solana. Runs once, only when a project id is set
 * (so the build/app never crashes in a pre-config state).
 */
let initialized = false;

export function initAppKit(): boolean {
  if (initialized) return true;
  if (!config.reownProjectId) return false;

  createAppKit({
    adapters: [new SolanaAdapter()],
    networks: [solana, solanaDevnet],
    projectId: config.reownProjectId,
    metadata: {
      name: BRAND.name,
      description: BRAND.oneLiner,
      url: typeof window !== "undefined" ? window.location.origin : "https://linkedlayer.xyz",
      icons: ["/favicon.svg"],
    },
    themeMode: "dark",
    themeVariables: {
      "--w3m-accent": "#7c5cff",
    },
    features: { analytics: false, email: false, socials: [] },
  });

  initialized = true;
  return true;
}
