import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Money, Delta } from "./money";

export function KpiCard({
  label,
  value,
  delta,
  hint,
  tone = "auto",
  signed = true,
  icon: Icon,
}: {
  label: string;
  value: number;
  delta?: number | null;
  hint?: string;
  tone?: "auto" | "neutral" | "positive" | "negative";
  signed?: boolean;
  icon?: React.ElementType;
}) {
  return (
    <Card className="border-border/60 bg-surface/60">
      <CardContent className="space-y-2 p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
          {Icon && <Icon className="size-4 text-muted-foreground" />}
        </div>
        <Money value={value} tone={tone} signed={signed} className="block text-2xl font-semibold" />
        <div className={cn("flex items-center gap-2 text-xs text-muted-foreground")}>
          {delta !== undefined && <Delta value={delta} />}
          {hint && <span className="truncate">{hint}</span>}
        </div>
      </CardContent>
    </Card>
  );
}