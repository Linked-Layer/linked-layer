import { useCallback, useEffect, useMemo, useState } from "react";

/** Minimal shape of an injected Solana wallet provider. */
interface SolanaProvider {
  publicKey?: { toString(): string } | null;
  isPhantom?: boolean;
  isSolflare?: boolean;
  isBackpack?: boolean;
  connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toString(): string } }>;
  disconnect: () => Promise<void>;
  signMessage?: (message: Uint8Array, display?: string) => Promise<{ signature: Uint8Array } | Uint8Array>;
  on?: (event: string, cb: () => void) => void;
  off?: (event: string, cb: () => void) => void;
}

interface DetectedWallet {
  name: string;
  provider: SolanaProvider;
}

function detect(): DetectedWallet[] {
  if (typeof window === "undefined") return [];
  const w = window as unknown as Record<string, unknown> & {
    phantom?: { solana?: SolanaProvider };
    solana?: SolanaProvider;
    solflare?: SolanaProvider;
    backpack?: SolanaProvider;
  };
  const out: DetectedWallet[] = [];
  const phantom = w.phantom?.solana ?? (w.solana?.isPhantom ? w.solana : undefined);
  if (phantom) out.push({ name: "Phantom", provider: phantom });
  if (w.solflare?.isSolflare) out.push({ name: "Solflare", provider: w.solflare });
  if (w.backpack) out.push({ name: "Backpack", provider: w.backpack });
  return out;
}

/**
 * Connect to an injected Solana wallet (Phantom / Solflare / Backpack) directly
 * via the wallet's provider — no WalletConnect project id required.
 */
export function useWallet() {
  const [wallets, setWallets] = useState<DetectedWallet[]>([]);
  const [address, setAddress] = useState<string | null>(null);
  const [active, setActive] = useState<SolanaProvider | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    // Wallets may inject slightly after load; re-scan a few times.
    let cancelled = false;
    const scan = () => setWallets(detect());

    // Eagerly reconnect a previously-approved wallet (no prompt) so the connection
    // — and the verified session keyed to it — survive a page reload.
    const tryEager = async () => {
      const found = detect();
      if (cancelled || found.length === 0) return;
      const provider = found[0]!.provider;
      try {
        const res = await provider.connect({ onlyIfTrusted: true });
        if (cancelled || !res?.publicKey) return;
        setAddress(res.publicKey.toString());
        setActive(provider);
        provider.on?.("disconnect", () => {
          setAddress(null);
          setActive(null);
        });
      } catch {
        /* not trusted yet — stay disconnected, no prompt */
      }
    };

    scan();
    const t0 = setTimeout(tryEager, 250);
    const t1 = setTimeout(scan, 600);
    const t2 = setTimeout(scan, 1400);
    return () => {
      cancelled = true;
      clearTimeout(t0);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const connect = useCallback(async (provider: SolanaProvider) => {
    setConnecting(true);
    try {
      const res = await provider.connect();
      setAddress(res.publicKey.toString());
      setActive(provider);
      const onDisc = () => {
        setAddress(null);
        setActive(null);
      };
      provider.on?.("disconnect", onDisc);
    } catch {
      /* user rejected */
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      await active?.disconnect();
    } catch {
      /* ignore */
    }
    setAddress(null);
    setActive(null);
  }, [active]);

  /** Ask the connected wallet to sign a UTF-8 message; returns the raw signature bytes. */
  const signMessage = useCallback(
    async (message: string): Promise<Uint8Array> => {
      if (!active?.signMessage) throw new Error("This wallet does not support message signing");
      const res = await active.signMessage(new TextEncoder().encode(message), "utf8");
      // Phantom/Solflare return { signature }; Backpack may return the bytes directly.
      const sig = (res as { signature?: Uint8Array }).signature ?? (res as Uint8Array);
      return sig;
    },
    [active],
  );

  const short = useMemo(
    () => (address ? `${address.slice(0, 4)}…${address.slice(-4)}` : null),
    [address],
  );

  return { wallets, address, short, connecting, connect, disconnect, signMessage, connected: !!address };
}
