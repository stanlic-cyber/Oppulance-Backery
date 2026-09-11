import { Check, Circle, Clock, Package, Truck, MapPin, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DeliveryTimelineProps {
  status: string;
  createdAt: string;
  className?: string;
}

const TIMELINE_STEPS = [
  { key: 'open', label: 'Requested', icon: Package, description: 'Waiting for driver bids' },
  { key: 'assigned', label: 'Driver Assigned', icon: Truck, description: 'Driver accepted the job' },
  { key: 'pickup_confirmed', label: 'Pickup Confirmed', icon: MapPin, description: 'Driver confirmed pickup' },
  { key: 'in_transit', label: 'In Transit', icon: Truck, description: 'On the way to destination' },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle, description: 'Arrived at destination' },
  { key: 'completed', label: 'Completed', icon: Check, description: 'Delivery confirmed' },
];

export const DeliveryTimeline = ({ status, createdAt, className }: DeliveryTimelineProps) => {
  // Find current step index
  const currentStepIndex = TIMELINE_STEPS.findIndex(step => step.key === status);
  const isCancelled = status === 'cancelled' || status === 'failed';

  return (
    <div className={cn("relative", className)}>
      {/* Mobile: Vertical timeline */}
      <div className="flex flex-col gap-0">
        {TIMELINE_STEPS.map((step, index) => {
          const isCompleted = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;
          const isPending = index > currentStepIndex;
          const Icon = step.icon;

          return (
            <div key={step.key} className="relative flex gap-3">
              {/* Vertical line */}
              {index < TIMELINE_STEPS.length - 1 && (
                <div
                  className={cn(
                    "absolute left-4 top-8 w-0.5 h-full -translate-x-1/2",
                    isCompleted ? "bg-primary" : "bg-muted-foreground/20"
                  )}
                />
              )}

              {/* Step indicator */}
              <div
                className={cn(
                  "relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 flex-shrink-0 transition-all",
                  isCompleted && "bg-primary border-primary text-primary-foreground",
                  isCurrent && !isCancelled && "bg-primary/10 border-primary text-primary animate-pulse",
                  isCurrent && isCancelled && "bg-destructive/10 border-destructive text-destructive",
                  isPending && "bg-muted border-muted-foreground/30 text-muted-foreground/50"
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : isCurrent ? (
                  <Icon className="h-4 w-4" />
                ) : (
                  <Circle className="h-3 w-3" />
                )}
              </div>

              {/* Step content */}
              <div className={cn("pb-6 flex-1", index === TIMELINE_STEPS.length - 1 && "pb-0")}>
                <p
                  className={cn(
                    "font-medium text-sm",
                    isCompleted && "text-primary",
                    isCurrent && !isCancelled && "text-primary",
                    isCurrent && isCancelled && "text-destructive",
                    isPending && "text-muted-foreground"
                  )}
                >
                  {step.label}
                </p>
                <p
                  className={cn(
                    "text-xs",
                    isPending ? "text-muted-foreground/50" : "text-muted-foreground"
                  )}
                >
                  {step.description}
                </p>
                {isCurrent && index === 0 && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(createdAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          );
        })}

        {/* Cancelled/Failed state */}
        {isCancelled && (
          <div className="mt-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <p className="text-sm font-medium text-destructive">
              {status === 'cancelled' ? '❌ Delivery Cancelled' : '⚠️ Delivery Failed'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};