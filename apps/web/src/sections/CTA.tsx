import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Reveal } from "@/components/Reveal";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";
import { config } from "@/lib/config";
import { useNav } from "@/providers/Nav";

export function CTA() {
  const { navigate } = useNav();
  const routerNavigate = useNavigate();
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <Reveal variant="scale">
        <div className="panel relative overflow-hidden p-10 text-center md:p-16">
          <div className="absolute inset-0 -z-10 bg-radial-fade" />
          <h2 className="mx-auto max-w-2xl text-4xl font-semibold tracking-tight text-ink md:text-5xl">
            Give your team and agents a <span className="gradient-text">shared memory</span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted">
            Hold {BRAND.symbol} to use it. Let agents pay per call. Fees fuel buyback &amp; burn.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a href={config.links.dexscreener} target="_blank" rel="noopener noreferrer">
              <Button size="lg">
                Buy {BRAND.symbol} <ArrowRight className="h-4 w-4" />
              </Button>
            </a>
            <Button variant="outline" size="lg" onClick={() => routerNavigate("/app")}>
              Open the chat
            </Button>
            <Button variant="ghost" size="lg" onClick={() => navigate("whitepaper")}>
              Read whitepaper
            </Button>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
