import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}

const variantStyles = {
  default: {
    border: 'border-l-4 border-l-primary',
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    valueColor: 'text-primary',
  },
  success: {
    border: 'border-l-4 border-l-success',
    iconBg: 'bg-success/10',
    iconColor: 'text-success',
    valueColor: 'text-success',
  },
  warning: {
    border: 'border-l-4 border-l-warning',
    iconBg: 'bg-warning/10',
    iconColor: 'text-warning',
    valueColor: 'text-warning',
  },
  danger: {
    border: 'border-l-4 border-l-destructive',
    iconBg: 'bg-destructive/10',
    iconColor: 'text-destructive',
    valueColor: 'text-destructive',
  },
  info: {
    border: 'border-l-4 border-l-info',
    iconBg: 'bg-info/10',
    iconColor: 'text-info',
    valueColor: 'text-info',
  },
};

export function StatCard({ title, value, icon: Icon, variant = 'default', className }: StatCardProps) {
  const styles = variantStyles[variant];
  
  return (
    <div 
      className={cn(
        "relative bg-card rounded-xl p-5 shadow-elevation-1 transition-all duration-300 hover:shadow-elevation-3 hover:-translate-y-1 overflow-hidden",
        styles.border,
        className
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">{title}</h3>
          <p className={cn("text-3xl font-bold mt-2 tabular-nums", styles.valueColor)}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
        </div>
        {Icon && (
          <div className={cn("p-3 rounded-xl shrink-0", styles.iconBg)}>
            <Icon className={cn("w-6 h-6", styles.iconColor)} />
          </div>
        )}
      </div>
    </div>
  );
}
