import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Package, Loader2, Edit2, Trash2, Eye, EyeOff, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { PRODUCE_CATEGORIES } from '@/lib/constants';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Listing {
  id: string;
  title: string;
  category: string;
  quantity: number;
  unit: string;
  price_per_unit: number;
  province: string;
  photos: string[];
  status: string;
  created_at: string;
}

const MyListings = () => {
  const { user, role } = useAuth();
  const { t } = useLanguage();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchListings();
    }
  }, [user]);

  const fetchListings = async () => {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('farmer_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setListings((data as Listing[]) || []);
    } catch (err) {
      console.error('Error fetching listings:', err);
      toast.error('Failed to load listings');
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'archived' : 'active';
    try {
      const { error } = await supabase
        .from('listings')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;
      setListings(prev => prev.map(l => l.id === id ? { ...l, status: newStatus } : l));
      toast.success(`Listing ${newStatus === 'active' ? 'activated' : 'hidden'}`);
    } catch (err) {
      toast.error('Failed to update listing');
    }
  };

  const deleteListing = async (id: string) => {
    try {
      const { error } = await supabase
        .from('listings')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setListings(prev => prev.filter(l => l.id !== id));
      toast.success('Listing deleted');
    } catch (err) {
      toast.error('Failed to delete listing');
    }
  };

  if (role !== 'farmer') {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <h1 className="text-2xl font-bold mb-4">Farmers Only</h1>
          <p className="text-muted-foreground">This page is for farmers to manage their listings.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-muted/30 min-h-screen">
        <div className="container py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">{t('nav.listings')}</h1>
              <p className="text-muted-foreground">Manage your produce listings</p>
            </div>
            <Button asChild>
              <Link to="/sell">
                <Plus className="h-4 w-4 mr-2" />
                {t('listing.create')}
              </Link>
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : listings.length === 0 ? (
            <div className="text-center py-20 bg-card rounded-xl">
              <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No listings yet</h3>
              <p className="text-muted-foreground mb-6">
                Start selling by creating your first listing
              </p>
              <Button asChild>
                <Link to="/sell">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Listing
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {listings.map((listing) => {
                const categoryData = PRODUCE_CATEGORIES.find(c => c.id === listing.category);
                const hasPhoto = listing.photos && listing.photos.length > 0;

                return (
                  <div key={listing.id} className="bg-card rounded-xl p-4 flex gap-4">
                    {/* Image */}
                    <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      {hasPhoto ? (
                        <img src={listing.photos[0]} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl">
                          {categoryData?.icon || '📦'}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Link to={`/listing/${listing.id}`} className="font-semibold hover:text-primary">
                            {listing.title}
                          </Link>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={listing.status === 'active' ? 'default' : 'secondary'}>
                              {listing.status}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {listing.quantity} {listing.unit}
                            </span>
                          </div>
                        </div>
                        <p className="text-lg font-bold text-primary whitespace-nowrap">
                          ${listing.price_per_unit.toFixed(2)}/{listing.unit}
                        </p>
                      </div>

                      <p className="text-sm text-muted-foreground mt-1">{listing.province}</p>

                      {/* Actions */}
                      <div className="flex items-center gap-2 mt-3">
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/edit-listing/${listing.id}`}>
                            <Pencil className="h-3.5 w-3.5 mr-1" />
                            Edit
                          </Link>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/listing/${listing.id}`}>
                            <Eye className="h-3.5 w-3.5 mr-1" />
                            View
                          </Link>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleStatus(listing.id, listing.status)}
                        >
                          {listing.status === 'active' ? (
                            <>
                              <EyeOff className="h-3.5 w-3.5 mr-1" />
                              Hide
                            </>
                          ) : (
                            <>
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              Activate
                            </>
                          )}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-3.5 w-3.5 mr-1" />
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Listing?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete your listing.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteListing(listing.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default MyListings;
