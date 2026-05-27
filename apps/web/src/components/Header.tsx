import { motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { LogoWord } from "@/components/Logo";
import { WalletButton } from "@/components/WalletButton";
import { XIcon } from "@/components/icons";
import { config } from "@/lib/config";

const NAV = [
  { label: "Home", href: "/" },
  { label: "Demo", href: "/demo" },
  { label: "Tokenomics", href: "/tokenomics" },
  { label: "Roadmap", href: "/roadmap" },
  { label: "Whitepaper", href: "/whitepaper" },
];

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-bg/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="text-base">
          <LogoWord />
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {NAV.map((n) =>
            n.href.startsWith("/#") ? (
              <a key={n.label} href={n.href} className="text-sm text-muted transition-colors hover:text-white">
                {n.label}
              </a>
            ) : (
              <Link key={n.label} to={n.href} className="text-sm text-muted transition-colors hover:text-white">
                {n.label}
              </Link>
            ),
          )}
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
              <Link
                key={n.label}
                to={n.href}
                onClick={() => setOpen(false)}
                className="py-1 text-sm text-slate-200"
              >
                {n.label}
              </Link>
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
