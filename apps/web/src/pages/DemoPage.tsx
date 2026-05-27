import { PageShell } from "@/components/PageShell";
import { AskCompanyDemo } from "@/sections/AskCompanyDemo";
import { LiveStats } from "@/sections/LiveStats";

export function DemoPage() {
  return (
    <PageShell>
      <div className="pt-10">
        <LiveStats />
      </div>
      <AskCompanyDemo />
    </PageShell>
  );
}
