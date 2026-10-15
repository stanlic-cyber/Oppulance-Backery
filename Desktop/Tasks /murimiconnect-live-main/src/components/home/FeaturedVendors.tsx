import { Link } from 'react-router-dom';
import { Star, ChevronRight, MapPin } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useHomeFeed } from '@/hooks/useHomeFeed';

export const FeaturedVendors = () => {
  const { data, isLoading: loading } = useHomeFeed();
  const vendors = data?.vendors ?? [];

  if (loading) {
    return (
      <section className="px-4 mt-6">
        <Skeleton className="h-5 w-36 mb-3 rounded-lg" />
        <div className="flex gap-3 overflow-x-auto scrollbar-hide">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="w-[190px] h-[90px] rounded-2xl flex-shrink-0" />
          ))}
        </div>
      </section>
    );
  }

  if (vendors.length === 0) return null;

  return (
    <section className="px-4 mt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-foreground">Top Vendors</h2>
        <Link to="/marketplace" className="text-xs font-medium text-primary press-effect">See All</Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory -mx-4 px-4">
        {vendors.map((vendor, i) => (
          <Link
            key={vendor.id}
            to={`/marketplace?farmer=${vendor.id}`}
            className="w-[190px] flex-shrink-0 snap-start bg-card rounded-2xl p-3.5 border border-border shadow-sm press-effect hover:shadow-md hover:border-primary/20 transition-all duration-200 animate-slide-up opacity-0"
            style={{ animationDelay: `${i * 70}ms`, animationFillMode: 'forwards' }}
          >
            <div className="flex items-center gap-3 mb-2.5">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                {vendor.avatar_url ? (
                  <img src={vendor.avatar_url} alt={vendor.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-primary">
                    {vendor.name?.charAt(0)?.toUpperCase() || 'V'}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-foreground truncate">{vendor.farm_name || vendor.name}</h3>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
                  <span className="truncate">{vendor.province || 'Zimbabwe'}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-accent text-accent" />
                <span className="text-xs font-medium text-foreground">4.5</span>
                <span className="text-[10px] text-muted-foreground">• {vendor.listing_count} items</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};
