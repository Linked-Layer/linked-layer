import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { config, isLive } from "@/lib/config";

function short(addr: string): string {
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}

function WalletButtonLive() {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  return (
    <Button variant={isConnected ? "outline" : "primary"} size="sm" onClick={() => open()}>
      <Wallet className="h-4 w-4" />
      {isConnected && address ? short(address) : "Connect Wallet"}
    </Button>
  );
}

function WalletButtonFallback() {
  return (
    <Button
      variant="outline"
      size="sm"
      title="Wallet connect activates once VITE_REOWN_PROJECT_ID is set"
      onClick={() => window.open(config.links.dexscreener, "_blank", "noopener")}
    >
      <Wallet className="h-4 w-4" />
      Connect Wallet
    </Button>
  );
}

export function WalletButton() {
  return isLive.wallet() ? <WalletButtonLive /> : <WalletButtonFallback />;
}
