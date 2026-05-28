import { type ReactNode, createContext, useCallback, useContext, useEffect, useState } from "react";
import { useWallet } from "@/hooks/useWallet";
import { type StoredSession, clearSession, getSession, verifyOwnership } from "@/lib/walletAuth";

type WalletHook = ReturnType<typeof useWallet>;

interface WalletCtx extends Pick<WalletHook, "wallets" | "address" | "short" | "connected" | "connecting" | "connect"> {
  /** Disconnect AND drop the verified session. */
  disconnect: () => void;
  /** A valid Sign-In-with-Solana session exists for the connected wallet. */
  verified: boolean;
  session: StoredSession | null;
  verifying: boolean;
  verifyError: string | null;
  /** Run the ownership + balance check for the connected wallet. */
  verify: () => Promise<void>;
}

const Ctx = createContext<WalletCtx | null>(null);

export function useWalletCtx(): WalletCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useWalletCtx must be used within <WalletProvider>");
  return c;
}

/** App-wide wallet + verification state (single source of truth). */
export function WalletProvider({ children }: { children: ReactNode }) {
  const w = useWallet();
  const [session, setSession] = useState<StoredSession | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Reflect any stored session for the currently-connected wallet.
  useEffect(() => {
    const s = getSession();
    setSession(s && s.holder === w.address ? s : null);
    setVerifyError(null);
  }, [w.address]);

  const verify = useCallback(async () => {
    if (!w.address) return;
    setVerifying(true);
    setVerifyError(null);
    try {
      setSession(await verifyOwnership(w.address, w.signMessage));
    } catch (err) {
      setVerifyError((err as Error).message);
    } finally {
      setVerifying(false);
    }
  }, [w.address, w.signMessage]);

  const disconnect = useCallback(() => {
    clearSession();
    setSession(null);
    void w.disconnect();
  }, [w]);

  const verified = !!session && session.holder === w.address;

  return (
    <Ctx.Provider
      value={{
        wallets: w.wallets,
        address: w.address,
        short: w.short,
        connected: w.connected,
        connecting: w.connecting,
        connect: w.connect,
        disconnect,
        verified,
        session,
        verifying,
        verifyError,
        verify,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
