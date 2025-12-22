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
  default: 'before:bg-primary',
  success: 'before:bg-success',
  warning: 'before:bg-warning',
  danger: 'before:bg-destructive',
  info: 'before:bg-info',
};

const valueStyles = {
  default: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-destructive',
  info: 'text-info',
};

export function StatCard({ title, value, icon: Icon, variant = 'default', className }: StatCardProps) {
  return (
    <div 
      className={cn(
        "relative bg-card rounded-lg p-6 shadow-elevation-1 transition-all duration-300 hover:shadow-elevation-2 hover:-translate-y-1 overflow-hidden",
        "before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:rounded-t-lg",
        variantStyles[variant],
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
          <p className={cn("text-3xl font-bold mt-2", valueStyles[variant])}>
            {value}
          </p>
        </div>
        {Icon && (
          <div className={cn("p-3 rounded-full bg-opacity-10", `bg-${variant === 'default' ? 'primary' : variant}`)}>
            <Icon className={cn("w-6 h-6", valueStyles[variant])} />
          </div>
        )}
      </div>
    </div>
  );
}
