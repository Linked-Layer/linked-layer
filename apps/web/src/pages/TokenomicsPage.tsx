import { PageShell } from "@/components/PageShell";
import { LiveStats } from "@/sections/LiveStats";
import { Tokenomics } from "@/sections/Tokenomics";

export function TokenomicsPage() {
  return (
    <PageShell>
      <div className="pt-10">
        <LiveStats />
      </div>
      <Tokenomics />
    </PageShell>
  );
}
