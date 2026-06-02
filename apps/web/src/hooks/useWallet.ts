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
/** Remembers which wallet the user connected with, so reload reconnects the right one. */
const LAST_WALLET = "linked.wallet";
const readLast = () => {
  try {
    return localStorage.getItem(LAST_WALLET);
  } catch {
    return null;
  }
};

export function useWallet() {
  const [wallets, setWallets] = useState<DetectedWallet[]>([]);
  const [address, setAddress] = useState<string | null>(null);
  const [active, setActive] = useState<SolanaProvider | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    // Eagerly reconnect a previously-approved wallet (no prompt) so the connection —
    // and the verified session keyed to it — survive a page reload. Phantom can inject
    // after first paint, so retry on a schedule until it connects (or attempts run out).
    let cancelled = false;
    let done = false;

    const tryEager = async () => {
      if (cancelled || done) return;
      const found = detect();
      setWallets(found);
      if (found.length === 0) return;
      // Reconnect the SAME wallet the user chose last time (Phantom/Solflare/Backpack),
      // not just whichever injected first.
      const lastName = readLast();
      const target = (lastName && found.find((d) => d.name === lastName)) || found[0]!;
      const provider = target.provider;
      try {
        // Phantom may have already restored the session — use it without a round-trip.
        const res = provider.publicKey
          ? { publicKey: provider.publicKey }
          : await provider.connect({ onlyIfTrusted: true });
        if (cancelled || done || !res?.publicKey) return;
        done = true;
        setAddress(res.publicKey.toString());
        setActive(provider);
        provider.on?.("disconnect", () => {
          setAddress(null);
          setActive(null);
        });
        provider.on?.("accountChanged", () => {
          const pk = provider.publicKey;
          setAddress(pk ? pk.toString() : null);
        });
      } catch {
        /* not trusted yet — stay disconnected, no prompt */
      }
    };

    setWallets(detect());
    const timers = [80, 300, 700, 1400, 2500].map((d) => setTimeout(tryEager, d));
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, []);

  const connect = useCallback(async (provider: SolanaProvider) => {
    setConnecting(true);
    try {
      const res = await provider.connect();
      setAddress(res.publicKey.toString());
      setActive(provider);
      // Remember which wallet this is so a reload reconnects the same one.
      try {
        const name = detect().find((d) => d.provider === provider)?.name;
        if (name) localStorage.setItem(LAST_WALLET, name);
      } catch {
        /* storage unavailable */
      }
      const onDisc = () => {
        setAddress(null);
        setActive(null);
      };
      provider.on?.("disconnect", onDisc);
      provider.on?.("accountChanged", () => setAddress(provider.publicKey ? provider.publicKey.toString() : null));
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
    try {
      localStorage.removeItem(LAST_WALLET); // explicit disconnect → don't auto-reconnect
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
