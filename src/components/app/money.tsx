import { cn } from "@/lib/utils";
import { BRL, signedCurrency, signedPercent } from "@/lib/format";
import { useTheme } from "./theme-provider";

type Props = {
  value: number;
  currency?: string;
  signed?: boolean;
  /** força o tom independentemente do sinal (ex.: despesas sempre negativas) */
  tone?: "auto" | "neutral" | "positive" | "negative";
  className?: string;
};

export function Money({ value, currency = "BRL", signed = true, tone = "auto", className }: Props) {
  const { privacy } = useTheme();
  const effectiveTone =
    tone === "auto" ? (value > 0 ? "positive" : value < 0 ? "negative" : "neutral") : tone;

  return (
    <span
      className={cn(
        "numeric",
        privacy && "privacy-blur",
        effectiveTone === "positive" && "text-positive",
        effectiveTone === "negative" && "text-negative",
        className,
      )}
    >
      {signed ? signedCurrency(value, currency) : BRL(value, currency)}
    </span>
  );
}

export function Delta({ value, className }: { value: number | null | undefined; className?: string }) {
  const tone = value == null || value === 0 ? "neutral" : value > 0 ? "positive" : "negative";
  return (
    <span
      className={cn(
        "numeric text-xs font-medium",
        tone === "positive" && "text-positive",
        tone === "negative" && "text-negative",
        tone === "neutral" && "text-muted-foreground",
        className,
      )}
    >
      {signedPercent(value)}
    </span>
  );
}