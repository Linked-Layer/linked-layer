import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { AskCompanyDemo } from "@/sections/AskCompanyDemo";
import { CTA } from "@/sections/CTA";
import { HowItWorks } from "@/sections/HowItWorks";
import { Integrations } from "@/sections/Integrations";
import { Journey } from "@/sections/Journey";
import { LiveStats } from "@/sections/LiveStats";
import { Roadmap } from "@/sections/Roadmap";
import { Tokenomics } from "@/sections/Tokenomics";

export function Home() {
  return (
    <>
      <Header />
      <main>
        <Journey />
        <LiveStats />
        <AskCompanyDemo />
        <HowItWorks />
        <Integrations />
        <Tokenomics />
        <Roadmap />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
