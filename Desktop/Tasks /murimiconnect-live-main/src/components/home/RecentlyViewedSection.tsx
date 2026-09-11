import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';

interface RecentItem {
  id: string;
  title: string;
  price_per_unit: number;
  unit: string;
  photos: string[] | null;
}

export const RecentlyViewedSection = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<RecentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    (async () => {
      const { data: rv } = await supabase
        .from('recently_viewed_listings')
        .select('listing_id, viewed_at')
        .eq('user_id', user.id)
        .order('viewed_at', { ascending: false })
        .limit(8);

      const ids = (rv || []).map(r => r.listing_id);
      if (!ids.length) { setLoading(false); return; }

      const { data: listings } = await supabase
        .from('listings')
        .select('id, title, price_per_unit, unit, photos')
        .in('id', ids)
        .eq('status', 'active');

      // Preserve order
      const map = new Map((listings || []).map(l => [l.id, l]));
      setItems(ids.map(id => map.get(id)).filter(Boolean) as RecentItem[]);
      setLoading(false);
    })();
  }, [user]);

  if (!user || (!loading && items.length === 0)) return null;

  return (
    <section className="px-4 mt-6">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="h-5 w-5 text-primary" />
        <h2 className="font-semibold text-base">Continue browsing</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4">
        {loading ? [1,2,3].map(i => (
          <div key={i} className="w-[140px] flex-shrink-0">
            <Skeleton className="aspect-square rounded-2xl mb-2" />
            <Skeleton className="h-3 w-[80%] rounded" />
          </div>
        )) : items.map(it => (
          <Link key={it.id} to={`/listing/${it.id}`} className="w-[140px] flex-shrink-0 press-effect">
            <div className="aspect-square rounded-2xl overflow-hidden bg-muted mb-2">
              {it.photos?.[0] ? (
                <img src={it.photos[0]} alt={it.title} loading="lazy" className="w-full h-full object-cover" />
              ) : null}
            </div>
            <p className="text-xs font-medium line-clamp-1">{it.title}</p>
            <p className="text-xs text-primary font-semibold">${Number(it.price_per_unit).toFixed(2)}/{it.unit}</p>
          </Link>
        ))}
      </div>
    </section>
  );
};
