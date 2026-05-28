import { AnimatePresence, motion } from "framer-motion";
import { BadgeCheck, Loader2, LogOut, ShieldCheck, Wallet } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";
import { config, isLive } from "@/lib/config";
import { useWalletCtx } from "@/providers/Wallet";

export function WalletButton() {
  const { wallets, connected, short, connecting, connect, disconnect, verified, session, verifying, verifyError, verify } =
    useWalletCtx();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const handleDisconnect = () => {
    disconnect();
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <Button variant={connected ? "outline" : "primary"} size="sm" onClick={() => setOpen((v) => !v)}>
        {verified ? <BadgeCheck className="h-4 w-4 text-emerald-400" /> : <Wallet className="h-4 w-4" />}
        {connecting ? "Connecting…" : connected ? short : "Connect Wallet"}
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 z-50 mt-2 w-60 rounded-xl border border-border bg-panel p-2 shadow-glow backdrop-blur"
          >
            {connected ? (
              <div className="space-y-1">
                <div className="px-3 py-1.5 text-xs uppercase tracking-wider text-muted">Wallet</div>
                <div className="truncate px-3 pb-1 text-sm text-slate-200">{short}</div>

                {!config.softLaunch &&
                  isLive.api() &&
                  (verified ? (
                    <div className="flex items-center gap-2 rounded-lg bg-panel-2 px-3 py-2 text-sm text-emerald-400">
                      <BadgeCheck className="h-4 w-4 shrink-0" />
                      Verified · {session!.balance.toLocaleString()} {BRAND.symbol}
                    </div>
                  ) : (
                    <button
                      onClick={verify}
                      disabled={verifying}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-panel-2 disabled:opacity-60"
                    >
                      {verifying ? (
                        <Loader2 className="h-4 w-4 animate-spin text-violet" />
                      ) : (
                        <ShieldCheck className="h-4 w-4 text-violet" />
                      )}
                      {verifying ? "Check your wallet…" : `Verify ${BRAND.symbol} ownership`}
                    </button>
                  ))}
                {verifyError && <div className="px-3 py-1 text-xs leading-snug text-rose-400">{verifyError}</div>}

                <button
                  onClick={handleDisconnect}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-panel-2"
                >
                  <LogOut className="h-4 w-4 text-violet" /> Disconnect
                </button>
              </div>
            ) : wallets.length > 0 ? (
              <>
                <div className="px-3 py-1.5 text-xs uppercase tracking-wider text-muted">Connect a wallet</div>
                {wallets.map((w) => (
                  <button
                    key={w.name}
                    onClick={() => {
                      void connect(w.provider);
                      setOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-panel-2"
                  >
                    <Wallet className="h-4 w-4 text-violet" /> {w.name}
                  </button>
                ))}
              </>
            ) : (
              <div className="px-3 py-3 text-sm text-muted">
                No Solana wallet found.{" "}
                <a
                  href="https://phantom.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-violet hover:underline"
                >
                  Install Phantom
                </a>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
