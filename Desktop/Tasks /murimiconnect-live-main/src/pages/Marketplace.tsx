import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, MapPin, SlidersHorizontal, Package, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Layout } from '@/components/layout/Layout';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { PRODUCE_CATEGORIES, ZIMBABWE_PROVINCES } from '@/lib/constants';
import { ListingCard } from '@/components/listings/ListingCard';
import { ListingGridSkeleton } from '@/components/ui/listing-skeleton';
import { RecommendationSections } from '@/components/marketplace/RecommendationSections';
import { EmptyState } from '@/components/ui/page-transition';
import { useAuth } from '@/contexts/AuthContext';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

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

type SortOption = 'newest' | 'price_low' | 'price_high';

const Marketplace = () => {
  const { profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'all');
  const [selectedProvince, setSelectedProvince] = useState(searchParams.get('province') || 'all');
  const [sortBy, setSortBy] = useState<SortOption>((searchParams.get('sort') as SortOption) || 'newest');
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');
  const [inStockOnly, setInStockOnly] = useState(searchParams.get('inStock') === 'true');
  const { t } = useLanguage();

  useEffect(() => {
    fetchListings();
  }, [selectedCategory, selectedProvince, sortBy, inStockOnly]);

  const fetchListings = async () => {
    setLoading(true);
    try {
      let query = supabase.from('listings').select('*').eq('status', 'active');
      if (selectedCategory && selectedCategory !== 'all') query = query.eq('category', selectedCategory);
      if (selectedProvince && selectedProvince !== 'all') query = query.eq('province', selectedProvince);
      if (inStockOnly) query = query.gt('quantity', 0);
      if (sortBy === 'newest') query = query.order('created_at', { ascending: false });
      else if (sortBy === 'price_low') query = query.order('price_per_unit', { ascending: true });
      else if (sortBy === 'price_high') query = query.order('price_per_unit', { ascending: false });

      const { data, error } = await query;
      if (error) console.error('Error fetching listings:', error);
      else setListings(data || []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateSearchParams();
  };

  const updateSearchParams = () => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (selectedCategory !== 'all') params.set('category', selectedCategory);
    if (selectedProvince !== 'all') params.set('province', selectedProvince);
    if (sortBy !== 'newest') params.set('sort', sortBy);
    if (minPrice) params.set('minPrice', minPrice);
    if (maxPrice) params.set('maxPrice', maxPrice);
    if (inStockOnly) params.set('inStock', 'true');
    setSearchParams(params);
  };

  const filteredListings = listings.filter(listing => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = listing.title.toLowerCase().includes(query) ||
        listing.description?.toLowerCase().includes(query) ||
        listing.category.toLowerCase().includes(query) ||
        listing.nearest_town?.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }
    if (minPrice && listing.price_per_unit < parseFloat(minPrice)) return false;
    if (maxPrice && listing.price_per_unit > parseFloat(maxPrice)) return false;
    return true;
  });

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    const params = new URLSearchParams(searchParams);
    if (value === 'all') params.delete('category');
    else params.set('category', value);
    setSearchParams(params);
  };

  const handleProvinceChange = (value: string) => {
    setSelectedProvince(value);
    const params = new URLSearchParams(searchParams);
    if (value === 'all') params.delete('province');
    else params.set('province', value);
    setSearchParams(params);
  };

  const handleSortChange = (value: SortOption) => {
    setSortBy(value);
    const params = new URLSearchParams(searchParams);
    if (value === 'newest') params.delete('sort');
    else params.set('sort', value);
    setSearchParams(params);
  };

  const clearFilters = () => {
    setSelectedCategory('all');
    setSelectedProvince('all');
    setSearchQuery('');
    setMinPrice('');
    setMaxPrice('');
    setSortBy('newest');
    setInStockOnly(false);
    setSearchParams({});
  };

  const activeFilterCount = [
    selectedCategory !== 'all', selectedProvince !== 'all', minPrice, maxPrice, inStockOnly,
  ].filter(Boolean).length;

  const FilterContent = () => (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Category</Label>
        <Select value={selectedCategory} onValueChange={handleCategoryChange}>
          <SelectTrigger className="rounded-xl"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {PRODUCE_CATEGORIES.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>{cat.icon} {t(`category.${cat.id}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Province</Label>
        <Select value={selectedProvince} onValueChange={handleProvinceChange}>
          <SelectTrigger className="rounded-xl"><SelectValue placeholder="Province" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Provinces</SelectItem>
            {ZIMBABWE_PROVINCES.map((province) => (
              <SelectItem key={province} value={province}>{province}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Price Range (USD)</Label>
        <div className="flex items-center gap-2">
          <Input type="number" placeholder="Min" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} className="w-full" min="0" />
          <span className="text-muted-foreground">-</span>
          <Input type="number" placeholder="Max" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="w-full" min="0" />
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox id="inStock" checked={inStockOnly} onCheckedChange={(checked) => setInStockOnly(checked as boolean)} />
        <Label htmlFor="inStock" className="cursor-pointer text-sm">In stock only</Label>
      </div>
      <Button onClick={clearFilters} variant="outline" className="w-full rounded-xl">Clear Filters</Button>
    </div>
  );

  return (
    <Layout>
      <div className="bg-muted/30 min-h-screen">
        {/* Search Header */}
        <div className="bg-card border-b border-border sticky top-12 md:top-14 z-30">
          <div className="container py-3 md:py-4">
            <div className="flex flex-col md:flex-row gap-3">
              <form onSubmit={handleSearch} className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search produce, vendors, locations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11 rounded-xl"
                />
              </form>

              {/* Mobile filter button */}
              <div className="flex gap-2 md:hidden">
                <Select value={sortBy} onValueChange={(v) => handleSortChange(v as SortOption)}>
                  <SelectTrigger className="flex-1 h-10 rounded-xl">
                    <ArrowUpDown className="h-3.5 w-3.5 mr-1.5" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest</SelectItem>
                    <SelectItem value="price_low">Price ↑</SelectItem>
                    <SelectItem value="price_high">Price ↓</SelectItem>
                  </SelectContent>
                </Select>
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="h-10 rounded-xl relative">
                      <SlidersHorizontal className="h-4 w-4 mr-1.5" />
                      Filter
                      {activeFilterCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] rounded-full h-4 w-4 flex items-center justify-center">
                          {activeFilterCount}
                        </span>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl">
                    <SheetHeader><SheetTitle>Filters</SheetTitle></SheetHeader>
                    <div className="mt-5"><FilterContent /></div>
                  </SheetContent>
                </Sheet>
              </div>

              {/* Desktop filters */}
              <div className="hidden md:flex gap-2">
                <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                  <SelectTrigger className="w-[170px] rounded-xl"><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {PRODUCE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.icon} {t(`category.${cat.id}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedProvince} onValueChange={handleProvinceChange}>
                  <SelectTrigger className="w-[180px] rounded-xl">
                    <MapPin className="h-3.5 w-3.5 mr-1.5" /><SelectValue placeholder="Province" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Provinces</SelectItem>
                    {ZIMBABWE_PROVINCES.map((province) => (
                      <SelectItem key={province} value={province}>{province}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={(v) => handleSortChange(v as SortOption)}>
                  <SelectTrigger className="w-[155px] rounded-xl">
                    <ArrowUpDown className="h-3.5 w-3.5 mr-1.5" /><SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="price_low">Price: Low → High</SelectItem>
                    <SelectItem value="price_high">Price: High → Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        <div className="container py-4 md:py-6">
          {/* Desktop Price Filter Row */}
          <div className="hidden md:flex gap-4 mb-5 items-center">
            <Label className="whitespace-nowrap text-sm">Price:</Label>
            <Input type="number" placeholder="Min" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} className="w-24 h-9 rounded-xl" min="0" />
            <span className="text-muted-foreground">-</span>
            <Input type="number" placeholder="Max" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="w-24 h-9 rounded-xl" min="0" />
            <div className="flex items-center space-x-2">
              <Checkbox id="inStockDesktop" checked={inStockOnly} onCheckedChange={(checked) => setInStockOnly(checked as boolean)} />
              <Label htmlFor="inStockDesktop" className="cursor-pointer text-sm">In stock only</Label>
            </div>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs">Clear all</Button>
            )}
          </div>

          {/* AI Recommendations */}
          {!searchQuery && selectedCategory === 'all' && selectedProvince === 'all' && !minPrice && !maxPrice && (
            <RecommendationSections userProvince={profile?.province || undefined} />
          )}

          {/* Results */}
          {loading ? (
            <ListingGridSkeleton count={8} />
          ) : filteredListings.length === 0 ? (
            <EmptyState
              icon={<Package className="h-8 w-8 text-muted-foreground" />}
              title={t('common.noResults')}
              description="No listings found matching your criteria"
              action={<Button variant="outline" className="rounded-xl" onClick={clearFilters}>Clear Filters</Button>}
            />
          ) : (
            <>
              <p className="text-xs text-muted-foreground mb-4">
                {filteredListings.length} listing{filteredListings.length !== 1 ? 's' : ''} found
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredListings.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Marketplace;
