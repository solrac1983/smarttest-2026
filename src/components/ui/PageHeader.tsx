import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  badge?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  icon: Icon,
  badge,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn(
      "relative overflow-hidden rounded-[2rem] bg-primary px-6 py-4 text-primary-foreground shadow-lg shadow-primary/20",
      "md:px-8 md:py-5", 
      className
    )}>
      {/* Background Decorations */}
      <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-accent/20 blur-2xl" />
      
      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
        <div className="space-y-1">
          {badge && (
            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md">
              {Icon && <Icon className="h-3 w-3" />}
              {badge}
            </div>
          )}
          <div className="flex items-center gap-3">
            {!badge && Icon && <Icon className="h-6 w-6 text-white/90" />}
            <h1 className="text-xl md:text-2xl lg:text-3xl font-black font-display tracking-tight leading-tight">
              {title}
            </h1>
          </div>
          {description && (
            <p className="text-primary-foreground/80 max-w-2xl text-[11px] md:text-xs font-medium leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-3 self-start md:self-center">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
