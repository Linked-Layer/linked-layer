import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { CTA } from "@/sections/CTA";
import { HowItWorks } from "@/sections/HowItWorks";
import { Integrations } from "@/sections/Integrations";
import { Journey } from "@/sections/Journey";

export function Home() {
  return (
    <>
      <Header />
      <main>
        <Journey />
        <HowItWorks />
        <Integrations />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
