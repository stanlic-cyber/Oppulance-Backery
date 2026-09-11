import { Link } from 'react-router-dom';
import { Zap, ShoppingCart } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { useHomeFeed } from '@/hooks/useHomeFeed';

export const DealsSection = () => {
  const { data, isLoading: loading } = useHomeFeed();
  const items = data?.deals ?? [];
  const { addItem } = useCart();

  if (loading) {
    return (
      <section className="px-4 mt-6">
        <Skeleton className="h-5 w-32 mb-3 rounded-lg" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2].map(i => <Skeleton key={i} className="h-[180px] rounded-2xl" />)}
        </div>
      </section>
    );
  }

  if (items.length === 0) return null;

  return (
    <section className="px-4 mt-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-accent/10 flex items-center justify-center">
            <Zap className="h-3.5 w-3.5 text-accent" />
          </div>
          <h2 className="text-base font-semibold text-foreground">Special Deals</h2>
        </div>
        <Link to="/marketplace" className="text-xs font-medium text-primary press-effect">View All</Link>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {items.slice(0, 4).map((item, i) => (
          <Link
            key={item.id}
            to={`/listing/${item.id}`}
            className="bg-card rounded-2xl overflow-hidden border border-border shadow-sm press-effect hover:shadow-md transition-all duration-200 animate-slide-up opacity-0"
            style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'forwards' }}
          >
            <div className="aspect-[4/3] bg-muted relative overflow-hidden">
              {item.photos && item.photos[0] ? (
                <img src={item.photos[0]} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl">🌿</div>
              )}
              <div className="absolute top-2 left-2 px-2 py-0.5 bg-accent text-accent-foreground text-[10px] font-bold rounded-lg shadow-sm">
                Negotiable
              </div>
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
                    maxQuantity: item.quantity,
                    farmerId: '',
                    photo: item.photos?.[0],
                    province: item.province,
                  });
                  toast.success('Added to cart');
                }}
                className="absolute bottom-2 right-2 h-8 w-8 bg-primary text-primary-foreground rounded-xl flex items-center justify-center shadow-md press-effect"
              >
                <ShoppingCart className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="p-2.5">
              <h3 className="text-xs font-medium text-foreground line-clamp-1 mb-0.5">{item.title}</h3>
              <p className="text-sm font-bold text-primary">
                ${item.price_per_unit.toFixed(2)}
                <span className="text-[10px] font-normal text-muted-foreground ml-0.5">/{item.unit}</span>
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};
