import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "dark" | "light" | "system";

type ThemeCtx = {
  theme: Theme;
  resolved: "dark" | "light";
  setTheme: (t: Theme) => void;
  privacy: boolean;
  togglePrivacy: () => void;
};

const Ctx = createContext<ThemeCtx | null>(null);

const STORAGE_THEME = "nexus.theme";
const STORAGE_PRIVACY = "nexus.privacy";

function systemTheme(): "dark" | "light" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [resolved, setResolved] = useState<"dark" | "light">("dark");
  const [privacy, setPrivacy] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_THEME) as Theme | null;
    if (stored) setThemeState(stored);
    setPrivacy(window.localStorage.getItem(STORAGE_PRIVACY) === "1");
  }, []);

  useEffect(() => {
    const next = theme === "system" ? systemTheme() : theme;
    setResolved(next);
    const root = document.documentElement;
    root.classList.toggle("dark", next === "dark");
    root.style.colorScheme = next;
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    window.localStorage.setItem(STORAGE_THEME, t);
  }, []);

  const togglePrivacy = useCallback(() => {
    setPrivacy((p) => {
      window.localStorage.setItem(STORAGE_PRIVACY, p ? "0" : "1");
      return !p;
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.shiftKey && (e.key === "P" || e.key === "p") && !e.metaKey && !e.ctrlKey) {
        const target = e.target as HTMLElement | null;
        if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
        e.preventDefault();
        togglePrivacy();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePrivacy]);

  return (
    <Ctx.Provider value={{ theme, resolved, setTheme, privacy, togglePrivacy }}>{children}</Ctx.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTheme deve ser usado dentro de ThemeProvider");
  return ctx;
}