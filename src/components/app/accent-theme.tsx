import { useEffect } from "react";
import { useWorkspace } from "./workspace";

/** Paletas prontas de cor de destaque da plataforma. */
export const ACCENT_PRESETS = [
  { id: "roxo", label: "Roxo Nexus", color: "#8B5CF6" },
  { id: "indigo", label: "Índigo", color: "#6366F1" },
  { id: "azul", label: "Azul corporativo", color: "#3B82F6" },
  { id: "ciano", label: "Ciano", color: "#06B6D4" },
  { id: "esmeralda", label: "Esmeralda", color: "#10B981" },
  { id: "ambar", label: "Âmbar", color: "#F59E0B" },
  { id: "coral", label: "Coral", color: "#F43F5E" },
  { id: "grafite", label: "Grafite", color: "#64748B" },
];

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Aplica a cor de destaque da empresa ativa às variáveis do tema. */
export function AccentTheme() {
  const { tenant } = useWorkspace();
  const accent = tenant?.accent_color ?? null;

  useEffect(() => {
    const root = document.documentElement;
    const vars = ["--primary", "--ring", "--sidebar-primary", "--sidebar-ring", "--chart-1", "--accent", "--sidebar-accent", "--accent-foreground", "--sidebar-accent-foreground"];

    if (!accent || !HEX.test(accent)) {
      vars.forEach((v) => root.style.removeProperty(v));
      return;
    }

    root.style.setProperty("--primary", accent);
    root.style.setProperty("--ring", accent);
    root.style.setProperty("--sidebar-primary", accent);
    root.style.setProperty("--sidebar-ring", accent);
    root.style.setProperty("--chart-1", accent);
    root.style.setProperty("--accent", `color-mix(in oklab, ${accent} 24%, var(--surface-2))`);
    root.style.setProperty("--sidebar-accent", `color-mix(in oklab, ${accent} 22%, var(--surface-2))`);
    root.style.setProperty("--accent-foreground", "var(--foreground)");
    root.style.setProperty("--sidebar-accent-foreground", "var(--foreground)");

    return () => vars.forEach((v) => root.style.removeProperty(v));
  }, [accent]);

  return null;
}
