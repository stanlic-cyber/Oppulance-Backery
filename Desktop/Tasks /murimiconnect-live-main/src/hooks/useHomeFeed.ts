import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FeedListing {
  id: string;
  title: string;
  price_per_unit: number;
  unit: string;
  photos: string[] | null;
  category: string;
  province: string;
  nearest_town: string | null;
  negotiable: boolean | null;
  quantity: number;
  farmer_id: string;
  created_at: string;
}

export interface FeedVendor {
  id: string;
  name: string;
  province: string | null;
  farm_name: string | null;
  avatar_url: string | null;
  listing_count: number;
}

interface HomeFeed {
  trending: FeedListing[];
  deals: FeedListing[];
  vendors: FeedVendor[];
}

/**
 * Single batched home-feed loader.
 * Replaces 3 separate sequential effects (Trending / Deals / FeaturedVendors)
 * with one parallel Promise.all backed by React Query (2-minute staleTime).
 */
export function useHomeFeed() {
  return useQuery<HomeFeed>({
    queryKey: ['home-feed'],
    queryFn: async () => {
      const [trendingRes, dealsRes, allActiveRes] = await Promise.all([
        supabase
          .from('listings')
          .select('id, title, price_per_unit, unit, photos, category, province, nearest_town, negotiable, quantity, farmer_id, created_at')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(8),
        supabase
          .from('listings')
          .select('id, title, price_per_unit, unit, photos, category, province, nearest_town, negotiable, quantity, farmer_id, created_at')
          .eq('status', 'active')
          .eq('negotiable', true)
          .order('created_at', { ascending: false })
          .limit(6),
        supabase
          .from('listings')
          .select('farmer_id')
          .eq('status', 'active'),
      ]);

      const trending = (trendingRes.data as FeedListing[]) || [];
      const deals = (dealsRes.data as FeedListing[]) || [];

      // Compute top vendors by listing count
      const countMap = new Map<string, number>();
      (allActiveRes.data || []).forEach((l: any) => {
        countMap.set(l.farmer_id, (countMap.get(l.farmer_id) || 0) + 1);
      });
      const topIds = [...countMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(e => e[0]);

      let vendors: FeedVendor[] = [];
      if (topIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles_public')
          .select('id, name, province, farm_name, avatar_url')
          .in('id', topIds);
        vendors = (profiles || [])
          .map((p: any) => ({ ...p, listing_count: countMap.get(p.id) || 0 }))
          .sort((a, b) => b.listing_count - a.listing_count);
      }

      return { trending, deals, vendors };
    },
    staleTime: 1000 * 60 * 2,
  });
}
