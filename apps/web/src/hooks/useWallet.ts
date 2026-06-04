import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  // Set when the user explicitly disconnects. Blocks the eager-reconnect retries
  // AND the 'connect' event some wallets (Backpack) re-emit right after disconnect,
  // which would otherwise silently reconnect them.
  const suppressReconnect = useRef(false);

  useEffect(() => {
    // Eagerly reconnect a previously-approved wallet (no prompt) so the connection —
    // and the verified session keyed to it — survive a page reload. Wallets inject at
    // different times and reconnect differently (Phantom answers onlyIfTrusted;
    // Backpack tends to AUTO-connect and emit a 'connect' event), so we both retry the
    // silent connect AND listen for the auto-connect event.
    let cancelled = false;
    let done = false;
    let listening = false;

    const onConnected = (provider: SolanaProvider, pk?: { toString(): string } | null) => {
      if (cancelled || done || !pk || suppressReconnect.current) return;
      done = true;
      setAddress(pk.toString());
      setActive(provider);
      provider.on?.("disconnect", () => {
        setAddress(null);
        setActive(null);
      });
      provider.on?.("accountChanged", () => {
        // Ignore wallet-driven account events after an explicit disconnect — some
        // wallets (Backpack) keep publicKey set and fire accountChanged, which would
        // otherwise silently reconnect us right after the user disconnected.
        if (suppressReconnect.current) return;
        setAddress(provider.publicKey ? provider.publicKey.toString() : null);
      });
    };

    const tryEager = async () => {
      if (cancelled || done || suppressReconnect.current) return;
      const found = detect();
      setWallets(found);
      if (found.length === 0) return;
      // Reconnect the SAME wallet the user chose last time (Phantom/Solflare/Backpack),
      // not just whichever injected first.
      const lastName = readLast();
      const target = (lastName && found.find((d) => d.name === lastName)) || found[0]!;
      const provider = target.provider;

      // Catch wallets that auto-connect on load (Backpack) and emit 'connect'.
      if (!listening) {
        listening = true;
        provider.on?.("connect", () => onConnected(provider, provider.publicKey));
      }
      // Session already restored by the wallet?
      if (provider.publicKey) {
        onConnected(provider, provider.publicKey);
        return;
      }
      // Otherwise ask for a silent reconnect (no prompt). Unsupported/untrusted → ignore.
      try {
        const res = await provider.connect({ onlyIfTrusted: true });
        onConnected(provider, res?.publicKey ?? provider.publicKey);
      } catch {
        /* not trusted / not supported — the 'connect' listener may still fire */
      }
    };

    setWallets(detect());
    const timers = [80, 300, 700, 1400, 2500, 4000].map((d) => setTimeout(tryEager, d));
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, []);

  const connect = useCallback(async (provider: SolanaProvider) => {
    suppressReconnect.current = false; // user is explicitly connecting again
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
      provider.on?.("accountChanged", () => {
        if (suppressReconnect.current) return;
        setAddress(provider.publicKey ? provider.publicKey.toString() : null);
      });
    } catch {
      /* user rejected */
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    suppressReconnect.current = true; // block eager + 'connect'-event auto-reconnect
    // Drop UI state first so the button flips immediately, even if the wallet's
    // own disconnect() is slow or a no-op (some wallets keep the session alive).
    setAddress(null);
    setActive(null);
    try {
      localStorage.removeItem(LAST_WALLET); // explicit disconnect → don't auto-reconnect on reload
    } catch {
      /* ignore */
    }
    try {
      await active?.disconnect();
    } catch {
      /* ignore */
    }
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
