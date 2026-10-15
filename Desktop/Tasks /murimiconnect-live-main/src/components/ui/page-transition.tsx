import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export const PageTransition = ({ children, className }: PageTransitionProps) => {
  return (
    <div className={cn("animate-fade-in", className)}>
      {children}
    </div>
  );
};

interface StaggeredListProps {
  children: ReactNode[];
  className?: string;
  staggerDelay?: number;
}

export const StaggeredList = ({ children, className, staggerDelay = 50 }: StaggeredListProps) => {
  return (
    <div className={className}>
      {children.map((child, index) => (
        <div 
          key={index}
          className="animate-slide-up opacity-0"
          style={{ 
            animationDelay: `${index * staggerDelay}ms`,
            animationFillMode: 'forwards'
          }}
        >
          {child}
        </div>
      ))}
    </div>
  );
};

/* Reusable page header with back arrow */
interface PageHeaderProps {
  title: string;
  backTo?: string;
  action?: ReactNode;
  className?: string;
}

export const PageHeader = ({ title, backTo, action, className }: PageHeaderProps) => {
  return (
    <div className={cn("sticky top-0 z-40 flex items-center h-12 px-3 gap-3 bg-background/95 backdrop-blur-md border-b border-border", className)}>
      {backTo && (
        <Link to={backTo} className="p-1.5 -ml-1.5 rounded-lg hover:bg-muted transition-colors press-effect touch-target flex items-center justify-center">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </Link>
      )}
      <h1 className="text-base font-semibold text-foreground flex-1 truncate">{title}</h1>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
};

/* Empty state component */
interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export const EmptyState = ({ icon, title, description, action, className }: EmptyStateProps) => {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 px-6 text-center", className)}>
      {icon && (
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-xs mb-4">{description}</p>
      )}
      {action}
    </div>
  );
};
