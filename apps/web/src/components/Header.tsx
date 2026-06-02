import { motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogoWord } from "@/components/Logo";
import { WalletButton } from "@/components/WalletButton";
import { XIcon } from "@/components/icons";
import { config } from "@/lib/config";
import { type View, useNav } from "@/providers/Nav";

interface NavItem {
  label: string;
  view?: View;
  /** Router path — used for the standalone chat app. */
  to?: string;
}

const NAV: NavItem[] = [
  { label: "Home", view: "home" },
  { label: "Chat", to: "/app" },
  { label: "Whitepaper", view: "whitepaper" },
];

export function Header() {
  const { view, navigate } = useNav();
  const routerNavigate = useNavigate();
  const [open, setOpen] = useState(false);

  const go = (item: NavItem) => {
    if (item.to) routerNavigate(item.to);
    else if (item.view) navigate(item.view);
    setOpen(false);
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-bg/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <button onClick={() => navigate("home")} className="text-base" aria-label="Home">
          <LogoWord />
        </button>

        <nav className="hidden items-center gap-7 md:flex">
          {NAV.map((n) => (
            <button
              key={n.label}
              onClick={() => go(n)}
              className={`text-sm transition-colors hover:text-white ${
                n.view && view === n.view ? "text-white" : "text-muted"
              }`}
            >
              {n.label}
            </button>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <a
            href={config.links.twitter}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted transition-colors hover:text-white"
            aria-label="X (Twitter)"
          >
            <XIcon />
          </a>
          <WalletButton />
        </div>

        <button className="md:hidden" onClick={() => setOpen((v) => !v)} aria-label="Toggle menu">
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-t border-border bg-panel px-4 py-4 md:hidden"
        >
          <div className="flex flex-col gap-3">
            {NAV.map((n) => (
              <button
                key={n.label}
                onClick={() => go(n)}
                className={`py-1 text-left text-sm ${n.view && view === n.view ? "text-white" : "text-slate-200"}`}
              >
                {n.label}
              </button>
            ))}
            <div className="flex items-center gap-3 pt-2">
              <a href={config.links.twitter} target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)">
                <XIcon />
              </a>
              <WalletButton />
            </div>
          </div>
        </motion.div>
      )}
    </header>
  );
}
