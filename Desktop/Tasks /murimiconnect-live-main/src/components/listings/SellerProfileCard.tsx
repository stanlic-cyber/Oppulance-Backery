import { useState, useEffect } from 'react';
import { User, MapPin, Package, BadgeCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SellerProfileCardProps {
  sellerId: string;
  sellerName?: string;
}

interface SellerStats {
  name: string;
  province: string | null;
  nearest_town: string | null;
  verified: boolean;
  listing_count: number;
}

export const SellerProfileCard = ({ sellerId, sellerName }: SellerProfileCardProps) => {
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSellerStats = async () => {
      try {
        // Fetch profile using safe public view (no email/phone exposed)
        const { data: profile } = await supabase
          .from('profiles_public' as any)
          .select('name, province, nearest_town, verified')
          .eq('id', sellerId)
          .maybeSingle() as { data: { name: string; province: string | null; nearest_town: string | null; verified: boolean } | null };

        // Fetch listing count
        const { count } = await supabase
          .from('listings')
          .select('*', { count: 'exact', head: true })
          .eq('farmer_id', sellerId)
          .eq('status', 'active');

        if (profile) {
          setStats({
            name: profile.name || sellerName || 'Seller',
            province: profile.province,
            nearest_town: profile.nearest_town,
            verified: profile.verified || false,
            listing_count: count || 0,
          });
        }
      } catch (err) {
        console.error('Error fetching seller stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSellerStats();
  }, [sellerId, sellerName]);

  if (loading) {
    return (
      <div className="bg-card p-6 rounded-xl animate-pulse">
        <div className="h-12 w-12 rounded-full bg-muted mb-4" />
        <div className="h-4 w-24 bg-muted rounded mb-2" />
        <div className="h-3 w-32 bg-muted rounded" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="bg-card p-6 rounded-xl">
      <h2 className="font-semibold mb-4">Seller</h2>
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <User className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium truncate">{stats.name}</p>
            {stats.verified && (
              <BadgeCheck className="h-4 w-4 text-blue-500 flex-shrink-0" />
            )}
          </div>
          {(stats.nearest_town || stats.province) && (
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <MapPin className="h-3 w-3" />
              {stats.nearest_town ? `${stats.nearest_town}, ` : ''}
              {stats.province || ''}
            </p>
          )}
          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
            <Package className="h-3 w-3" />
            {stats.listing_count} active listing{stats.listing_count !== 1 ? 's' : ''}
          </p>
          {stats.verified && (
            <span className="inline-block mt-2 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded-full">
              Verified Seller
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
