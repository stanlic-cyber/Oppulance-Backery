import { Link } from 'react-router-dom';
import { TrendingUp, ShoppingCart, MapPin } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { useHomeFeed } from '@/hooks/useHomeFeed';

export const TrendingSection = () => {
  const { data, isLoading: loading } = useHomeFeed();
  const items = data?.trending ?? [];
  const { addItem } = useCart();

  if (loading) {
    return (
      <section className="px-4 mt-6">
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-32 rounded-lg" />
        </div>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide">
          {[1, 2, 3].map(i => (
            <div key={i} className="w-[155px] flex-shrink-0">
              <Skeleton className="aspect-square rounded-2xl mb-2" />
              <Skeleton className="h-3 w-[80%] rounded mb-1.5" />
              <Skeleton className="h-4 w-[50%] rounded" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (items.length === 0) return null;

  return (
    <section className="px-4 mt-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
          </div>
          <h2 className="text-base font-semibold text-foreground">Trending Near You</h2>
        </div>
        <Link to="/marketplace" className="text-xs font-medium text-primary press-effect">
          View All
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory -mx-4 px-4">
        {items.map((item, i) => (
          <Link
            key={item.id}
            to={`/listing/${item.id}`}
            className="w-[155px] flex-shrink-0 snap-start bg-card rounded-2xl overflow-hidden shadow-sm border border-border press-effect hover:shadow-md transition-all duration-200 animate-slide-up opacity-0"
            style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'forwards' }}
          >
            <div className="aspect-square bg-muted relative overflow-hidden">
              {item.photos && item.photos[0] ? (
                <img src={item.photos[0]} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl">🌿</div>
              )}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  addItem({
                    listingId: item.id,
                    title: item.title,
                    price_per_unit: item.price_per_unit,
                    unit: item.unit,
                    quantity: 1,
                    maxQuantity: 999,
                    farmerId: '',
                    photo: item.photos?.[0],
                    province: item.province,
                  });
                  toast.success('Added to cart');
                }}
                className="absolute bottom-2 right-2 h-8 w-8 bg-primary text-primary-foreground rounded-xl flex items-center justify-center shadow-md touch-target press-effect hover:bg-primary/90 transition-colors"
              >
                <ShoppingCart className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="p-2.5">
              <h3 className="text-xs font-medium text-foreground line-clamp-2 leading-snug mb-1">{item.title}</h3>
              <p className="text-sm font-bold text-primary">
                ${item.price_per_unit.toFixed(2)}
                <span className="text-[10px] font-normal text-muted-foreground ml-0.5">/{item.unit}</span>
              </p>
              <div className="flex items-center gap-1 mt-1.5 text-[10px] text-muted-foreground">
                <MapPin className="h-2.5 w-2.5 flex-shrink-0" />
                <span className="truncate">{item.nearest_town || item.province}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};
