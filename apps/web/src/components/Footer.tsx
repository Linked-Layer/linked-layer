import { useNavigate } from "react-router-dom";
import { LogoWord } from "@/components/Logo";
import { XIcon } from "@/components/icons";
import { BRAND } from "@/lib/brand";
import { config } from "@/lib/config";
import { useNav } from "@/providers/Nav";

export function Footer() {
  const { navigate } = useNav();
  const routerNavigate = useNavigate();
  return (
    <footer className="border-t border-border bg-panel/40">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <LogoWord />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">{BRAND.oneLiner}</p>
          <a
            href={config.links.twitter}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 text-muted transition-colors hover:text-white"
          >
            <XIcon className="h-4 w-4" /> Follow on X
          </a>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-white">Product</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li><button onClick={() => navigate("home")} className="hover:text-white">Home</button></li>
            <li><button onClick={() => routerNavigate("/app")} className="hover:text-white">Chat</button></li>
            <li><button onClick={() => navigate("whitepaper")} className="hover:text-white">Whitepaper</button></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-white">Token</h4>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li>
              <a href={config.links.dexscreener} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                Chart (DexScreener)
              </a>
            </li>
            <li><span>Built on {BRAND.chain}</span></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border/60 px-4 py-5 text-center text-xs text-muted sm:px-6">
        © {new Date().getFullYear()} {BRAND.name}. {BRAND.tagline}.
      </div>
    </footer>
  );
}
