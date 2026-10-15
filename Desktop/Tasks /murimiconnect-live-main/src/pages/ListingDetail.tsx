import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MapPin, MessageSquare, Share2, Loader2, Package, Star, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Layout } from '@/components/layout/Layout';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCart } from '@/contexts/CartContext';
import { supabase } from '@/integrations/supabase/client';
import { PRODUCE_CATEGORIES } from '@/lib/constants';
import { PlaceOrderDialog } from '@/components/orders/PlaceOrderDialog';
import { SellerProfileCard } from '@/components/listings/SellerProfileCard';
import { ReportListingDialog } from '@/components/listings/ReportListingDialog';
import { PageHeader, EmptyState } from '@/components/ui/page-transition';
import { toast } from 'sonner';

interface ListingDetailData {
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

const ListingDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { t } = useLanguage();
  const { addItem, getItem } = useCart();
  const [listing, setListing] = useState<ListingDetailData | null>(null);
  const [farmerName, setFarmerName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);

  useEffect(() => {
    if (id) fetchListing();
  }, [id]);

  const fetchListing = async () => {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching listing:', error);
        toast.error('Failed to load listing');
      } else if (data) {
        setListing(data);
        const { data: profile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', data.farmer_id)
          .maybeSingle();
        if (profile) setFarmerName(profile.name);

        if (user && data.id) {
          supabase.from('recently_viewed_listings').upsert([{
            user_id: user.id,
            listing_id: data.id,
            viewed_at: new Date().toISOString(),
          }], { onConflict: 'user_id,listing_id' }).then(() => {});
        }
      } else {
        toast.error('Listing not found');
        navigate('/marketplace');
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: listing?.title,
        text: `Check out this listing on Murimi Connect: ${listing?.title}`,
        url: window.location.href,
      });
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!listing) {
    return (
      <Layout>
        <PageHeader title="Not Found" backTo="/marketplace" />
        <EmptyState
          icon={<Package className="h-8 w-8 text-muted-foreground" />}
          title="Listing Not Found"
          description="This listing may have been removed"
          action={<Button asChild><Link to="/marketplace">Back to Marketplace</Link></Button>}
        />
      </Layout>
    );
  }

  const categoryData = PRODUCE_CATEGORIES.find(c => c.id === listing.category);
  const hasPhotos = listing.photos && listing.photos.length > 0;
  const isOwner = user?.id === listing.farmer_id;
  const canOrder = user && role === 'buyer' && !isOwner && listing.quantity > 0;
  const outOfStock = listing.quantity <= 0;
  const isInCart = !!getItem(listing.id);

  return (
    <Layout>
      {/* Mobile PageHeader */}
      <div className="md:hidden">
        <PageHeader 
          title={listing.title} 
          backTo="/marketplace"
          action={
            <div className="flex items-center gap-1">
              {user && !isOwner && (
                <ReportListingDialog listingId={listing.id} listingTitle={listing.title} />
              )}
              <button onClick={handleShare} className="p-2 rounded-xl hover:bg-muted transition-colors touch-target">
                <Share2 className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
          }
        />
      </div>

      <div className="bg-muted/30 min-h-screen">
        {/* Desktop back row */}
        <div className="hidden md:block container pt-4">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              ← Back
            </Button>
            <div className="flex items-center gap-2">
              {user && !isOwner && (
                <ReportListingDialog listingId={listing.id} listingTitle={listing.title} />
              )}
            </div>
          </div>
        </div>

        <div className="container pb-32 md:pb-8">
          <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
            {/* Image Gallery */}
            <div className="space-y-3">
              <div className="aspect-square rounded-2xl overflow-hidden bg-card relative shadow-sm">
                {hasPhotos ? (
                  <img
                    src={listing.photos[selectedImage]}
                    alt={listing.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-8xl bg-muted">
                    {categoryData?.icon || '📦'}
                  </div>
                )}
                {outOfStock && (
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                    <Badge variant="destructive" className="text-lg py-2 px-4">Out of Stock</Badge>
                  </div>
                )}
              </div>
              {hasPhotos && listing.photos.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {listing.photos.map((photo, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(index)}
                      className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all press-effect ${
                        selectedImage === index ? 'border-primary shadow-sm' : 'border-transparent opacity-70'
                      }`}
                    >
                      <img src={photo} alt={`${listing.title} ${index + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Details */}
            <div className="space-y-5">
              <div>
                <div className="flex items-start justify-between gap-4 mb-2">
                  <h1 className="text-xl md:text-2xl font-bold text-foreground">{listing.title}</h1>
                  <button onClick={handleShare} className="hidden md:flex p-2 rounded-xl hover:bg-muted transition-colors">
                    <Share2 className="h-5 w-5 text-muted-foreground" />
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <Badge variant="secondary" className="rounded-lg">
                    {categoryData?.icon} {t(`category.${listing.category}`)}
                  </Badge>
                  {listing.negotiable && (
                    <Badge className="bg-accent text-accent-foreground rounded-lg">Negotiable</Badge>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{listing.nearest_town ? `${listing.nearest_town}, ` : ''}{listing.province}</span>
                </div>
              </div>

              {/* Price Card */}
              <div className="bg-card p-5 rounded-2xl border border-border shadow-sm">
                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide font-medium">Price per {listing.unit}</p>
                <p className="text-3xl font-bold text-primary">${listing.price_per_unit.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {listing.quantity > 0 ? (
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-primary" />
                      {listing.quantity} {listing.unit} available
                    </span>
                  ) : (
                    <span className="text-destructive flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-destructive" />
                      Currently out of stock
                    </span>
                  )}
                </p>
              </div>

              {listing.description && (
                <div>
                  <h2 className="font-semibold mb-2 text-foreground">Description</h2>
                  <p className="text-muted-foreground text-sm whitespace-pre-line leading-relaxed">{listing.description}</p>
                </div>
              )}

              <SellerProfileCard sellerId={listing.farmer_id} sellerName={farmerName} />
            </div>
          </div>
        </div>

        {/* Sticky bottom CTA — mobile */}
        <div className="md:hidden fixed bottom-[60px] left-0 right-0 z-40 bg-card/95 backdrop-blur-lg border-t border-border px-4 py-3 safe-area-bottom">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-lg font-bold text-primary">${listing.price_per_unit.toFixed(2)}<span className="text-xs font-normal text-muted-foreground">/{listing.unit}</span></p>
            </div>
            {canOrder ? (
              <div className="flex gap-2">
                <Button
                  variant={isInCart ? 'secondary' : 'outline'}
                  size="sm"
                  className="rounded-xl"
                  onClick={() => {
                    addItem({
                      listingId: listing.id,
                      title: listing.title,
                      price_per_unit: listing.price_per_unit,
                      unit: listing.unit,
                      quantity: 1,
                      maxQuantity: listing.quantity,
                      farmerId: listing.farmer_id,
                      photo: listing.photos?.[0],
                      province: listing.province,
                    });
                    toast.success('Added to cart');
                  }}
                >
                  <ShoppingCart className="h-4 w-4" />
                </Button>
                <Button className="rounded-xl px-5" onClick={() => setOrderDialogOpen(true)}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Order Now
                </Button>
              </div>
            ) : !user ? (
              <Button className="rounded-xl" asChild>
                <Link to="/auth">Sign in to Order</Link>
              </Button>
            ) : isOwner ? (
              <Button variant="outline" className="rounded-xl" asChild>
                <Link to="/my-listings">Manage</Link>
              </Button>
            ) : outOfStock ? (
              <Button className="rounded-xl" disabled>Out of Stock</Button>
            ) : null}
          </div>
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:block container pb-8">
          <div className="flex gap-3 max-w-lg">
            {canOrder ? (
              <>
                <Button size="lg" className="flex-1 rounded-xl" onClick={() => setOrderDialogOpen(true)}>
                  <MessageSquare className="h-5 w-5 mr-2" />
                  {t('order.place')}
                </Button>
                <Button
                  size="lg"
                  variant={isInCart ? 'secondary' : 'outline'}
                  className="rounded-xl"
                  onClick={() => {
                    addItem({
                      listingId: listing.id,
                      title: listing.title,
                      price_per_unit: listing.price_per_unit,
                      unit: listing.unit,
                      quantity: 1,
                      maxQuantity: listing.quantity,
                      farmerId: listing.farmer_id,
                      photo: listing.photos?.[0],
                      province: listing.province,
                    });
                    toast.success('Added to cart');
                  }}
                >
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  {isInCart ? 'In Cart' : 'Add to Cart'}
                </Button>
              </>
            ) : !user ? (
              <Button size="lg" className="flex-1 rounded-xl" asChild>
                <Link to="/auth">Sign in to Order</Link>
              </Button>
            ) : isOwner ? (
              <Button size="lg" variant="outline" className="flex-1 rounded-xl" asChild>
                <Link to="/my-listings">Manage Listing</Link>
              </Button>
            ) : outOfStock ? (
              <Button size="lg" className="flex-1 rounded-xl" disabled>Out of Stock</Button>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground mt-3">{t('payment.notice')}</p>
        </div>
      </div>

      {listing && (
        <PlaceOrderDialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen} listing={listing} />
      )}
    </Layout>
  );
};

export default ListingDetail;
