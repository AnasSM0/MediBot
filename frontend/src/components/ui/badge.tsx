import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "outline" | "warning";

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant;
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const styles = {
    default: "bg-primary/20 text-primary",
    outline: "border border-primary/60 text-primary",
    warning: "bg-amber-500/20 text-amber-300",
  } satisfies Record<BadgeVariant, string>;

  return (
    <div
      className={cn("inline-flex items-center rounded-full px-3 py-1 text-xs font-medium", styles[variant], className)}
      {...props}
    />
  );
}

