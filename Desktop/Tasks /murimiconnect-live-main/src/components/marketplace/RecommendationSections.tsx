import { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, MapPin, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ListingCard } from '@/components/listings/ListingCard';

interface Listing {
  id: string;
  title: string;
  category: string;
  quantity: number;
  unit: string;
  price_per_unit: number;
  negotiable: boolean;
  province: string;
  nearest_town: string | null;
  description: string | null;
  photos: string[];
  status: string;
  created_at: string;
  farmer_id: string;
}

interface RecommendationData {
  recommended: string[];
  trending: string[];
  nearby: string[];
}

export const RecommendationSections = ({ userProvince }: { userProvince?: string }) => {
  const { user } = useAuth();
  const [recs, setRecs] = useState<RecommendationData | null>(null);
  const [listings, setListings] = useState<Map<string, Listing>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecommendations();
  }, [user, userProvince]);

  const fetchRecommendations = async () => {
    try {
      // Call the AI recommendations edge function
      const { data, error } = await supabase.functions.invoke('ai-recommendations', {
        body: { province: userProvince },
      });

      if (error) {
        console.error('Recommendation error:', error);
        setLoading(false);
        return;
      }

      const recData = data as RecommendationData;
      setRecs(recData);

      // Fetch all referenced listings
      const allIds = [...new Set([
        ...(recData.recommended || []),
        ...(recData.trending || []),
        ...(recData.nearby || []),
      ])];

      if (allIds.length > 0) {
        const { data: listingData } = await supabase
          .from('listings')
          .select('*')
          .in('id', allIds)
          .eq('status', 'active');

        const map = new Map<string, Listing>();
        (listingData || []).forEach((l: any) => map.set(l.id, l));
        setListings(map);
      }
    } catch (err) {
      console.error('Failed to fetch recommendations:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderSection = (
    title: string,
    icon: React.ReactNode,
    ids: string[],
  ) => {
    const items = ids
      .map(id => listings.get(id))
      .filter(Boolean) as Listing[];

    if (items.length === 0) return null;

    return (
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          {icon}
          <h2 className="text-lg md:text-xl font-bold">{title}</h2>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide snap-x snap-mandatory">
          {items.map((listing) => (
            <div key={listing.id} className="min-w-[170px] max-w-[200px] flex-shrink-0 snap-start">
              <ListingCard listing={listing} />
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="py-6 flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading recommendations...</span>
      </div>
    );
  }

  if (!recs) return null;

  return (
    <div className="py-4">
      {renderSection(
        'Recommended for You',
        <Sparkles className="h-5 w-5 text-amber-500" />,
        recs.recommended || [],
      )}
      {renderSection(
        'Trending Now',
        <TrendingUp className="h-5 w-5 text-primary" />,
        recs.trending || [],
      )}
      {renderSection(
        'Popular Near You',
        <MapPin className="h-5 w-5 text-blue-500" />,
        recs.nearby || [],
      )}
    </div>
  );
};
