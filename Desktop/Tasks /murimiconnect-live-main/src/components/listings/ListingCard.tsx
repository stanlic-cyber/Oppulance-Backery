import { Link } from 'react-router-dom';
import { MapPin, Heart, ShoppingCart, MessageCircle, Star, CheckCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCart } from '@/contexts/CartContext';
import { PRODUCE_CATEGORIES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ListingCardProps {
  listing: {
    id: string;
    title: string;
    category: string;
    quantity: number;
    unit: string;
    price_per_unit: number;
    negotiable: boolean;
    province: string;
    nearest_town: string | null;
    photos: string[];
    farmer_id?: string;
    profiles?: {
      name: string;
      avatar_url: string | null;
      verified?: boolean;
    };
  };
}

export const ListingCard = ({ listing }: ListingCardProps) => {
  const { t } = useLanguage();
  const { addItem, getItem } = useCart();
  
  const categoryData = PRODUCE_CATEGORIES.find(c => c.id === listing.category);
  const hasPhoto = listing.photos && listing.photos.length > 0;
  const isVerified = listing.profiles?.verified;
  const isInCart = !!getItem(listing.id);

  const handleActionClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <Link
      to={`/listing/${listing.id}`}
      className="group bg-card rounded-2xl overflow-hidden shadow-sm border border-border hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 press-effect"
    >
      {/* Image */}
      <div className="aspect-square relative overflow-hidden bg-muted">
        {hasPhoto ? (
          <img
            src={listing.photos[0]}
            alt={listing.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl bg-muted">
            {categoryData?.icon || '📦'}
          </div>
        )}
        
        {/* Save button */}
        <button 
          onClick={handleActionClick}
          className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-card/90 shadow-sm transition-all duration-200 hover:scale-110"
          aria-label="Save listing"
        >
          <Heart className="h-4 w-4 text-muted-foreground" />
        </button>
        
        {/* Negotiable badge */}
        {listing.negotiable && (
          <span className="absolute bottom-2.5 left-2.5 px-2 py-0.5 text-[10px] font-semibold bg-accent text-accent-foreground rounded-md shadow-sm">
            Negotiable
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        {/* Title */}
        <h3 className="font-medium text-sm text-foreground line-clamp-2 leading-snug mb-1.5 group-hover:text-primary transition-colors">
          {listing.title}
        </h3>

        {/* Price */}
        <p className="text-[15px] font-bold text-primary mb-2">
          ${listing.price_per_unit.toFixed(2)}
          <span className="text-[11px] font-normal text-muted-foreground ml-0.5">/{listing.unit}</span>
        </p>

        {/* Meta */}
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
          <div className="flex items-center gap-1 min-w-0 flex-1">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{listing.nearest_town || listing.province}</span>
          </div>
          {isVerified ? (
            <div className="flex items-center gap-0.5 text-verified-blue flex-shrink-0">
              <CheckCircle className="h-3.5 w-3.5" />
              <span className="text-[10px] font-medium">Verified</span>
            </div>
          ) : (
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <Star className="h-3.5 w-3.5 fill-accent text-accent" />
              <span className="font-medium">4.5</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button 
            size="sm" 
            className="flex-1 h-9 text-xs rounded-xl touch-target"
            variant={isInCart ? 'secondary' : 'default'}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              addItem({
                listingId: listing.id,
                title: listing.title,
                price_per_unit: listing.price_per_unit,
                unit: listing.unit,
                quantity: 1,
                maxQuantity: listing.quantity,
                farmerId: listing.farmer_id || '',
                photo: listing.photos?.[0],
                province: listing.province,
              });
              toast.success('Added to cart');
            }}
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            {isInCart ? 'In Cart' : 'Add'}
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            className="flex-1 h-9 text-xs rounded-xl touch-target"
            onClick={handleActionClick}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Chat
          </Button>
        </div>
      </div>
    </Link>
  );
};
