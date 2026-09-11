import { Skeleton } from "@/components/ui/skeleton";

export const ListingSkeleton = () => {
  return (
    <div className="bg-card rounded-2xl overflow-hidden shadow-sm border border-border">
      {/* Image skeleton with shimmer */}
      <div className="aspect-square bg-muted relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-background/20 to-transparent animate-shimmer" 
             style={{ transform: 'translateX(-100%)' }} />
      </div>
      
      {/* Content skeleton */}
      <div className="p-3 space-y-2.5">
        <Skeleton className="h-3.5 w-[85%] rounded-lg" />
        <Skeleton className="h-3.5 w-[55%] rounded-lg" />
        <Skeleton className="h-4.5 w-[35%] rounded-lg" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-[45%] rounded-lg" />
          <Skeleton className="h-3 w-[20%] rounded-lg" />
        </div>
        <div className="flex gap-2 pt-0.5">
          <Skeleton className="h-9 flex-1 rounded-xl" />
          <Skeleton className="h-9 flex-1 rounded-xl" />
        </div>
      </div>
    </div>
  );
};

export const ListingGridSkeleton = ({ count = 8 }: { count?: number }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <ListingSkeleton key={i} />
      ))}
    </div>
  );
};
