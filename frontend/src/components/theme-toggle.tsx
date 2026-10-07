"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const STORAGE_KEY = "atool-theme";

/**
 * Day/night switch. Renders a fixed-size placeholder until mounted so the
 * server and client markup match, then mirrors the <html class="dark"> state.
 * The choice is persisted to localStorage and restored pre-paint by the
 * inline script in app/layout.tsx.
 */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [dark, setDark] = useState<boolean | null>(null);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !(dark ?? false);
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    } catch {
      /* storage unavailable (private mode) — theme just won't persist */
    }
  }

  return (
    <button
      onClick={toggle}
      title={dark ? "Switch to day mode" : "Switch to night mode"}
      aria-label="Toggle day/night theme"
      className={`rounded-lg p-2 text-muted transition hover:bg-foreground/5 hover:text-foreground ${className}`}
    >
      <span className="flex h-4 w-4 items-center justify-center">
        {dark === null ? null : dark ? (
          <Sun className="h-4 w-4" />
        ) : (
          <Moon className="h-4 w-4" />
        )}
      </span>
    </button>
  );
}
