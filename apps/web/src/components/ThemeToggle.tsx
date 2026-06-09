import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/providers/Theme";

/** Light/dark theme switch. */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";
  return (
    <button
      onClick={toggle}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      title={dark ? "Light theme" : "Dark theme"}
      className={`flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-panel text-muted transition-colors hover:border-stone-300 hover:text-ink dark:hover:border-stone-600 ${className ?? ""}`}
    >
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
