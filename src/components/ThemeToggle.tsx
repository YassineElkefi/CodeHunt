"use client";

import { useTheme } from "@/context/ThemeContext";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  const nextTheme = resolvedTheme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      title="Toggle theme"
      onClick={() => setTheme(nextTheme)}
      className="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border-secondary)] bg-[var(--color-background-primary)] px-3 py-1.5 text-xs text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-background-secondary)]"
    >
      <span>{resolvedTheme === "dark" ? "🌙" : "☀️"}</span>
      <span suppressHydrationWarning>{resolvedTheme}</span>
    </button>
  );
}