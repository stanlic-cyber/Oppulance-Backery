import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, MoreVertical, Eye, Trash2, Archive, CheckCircle, Loader2, MapPin, Package } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { PRODUCE_CATEGORIES } from '@/lib/constants';

interface Listing {
  id: string;
  title: string;
  category: string;
  quantity: number;
  unit: string;
  price_per_unit: number;
  province: string;
  status: 'draft' | 'active' | 'sold' | 'archived';
  created_at: string;
  farmer_id: string;
  farmer_name?: string;
  photos: string[];
}

const Listings = () => {
  const { user: currentUser } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch farmer names
      const farmerIds = [...new Set((data || []).map(l => l.farmer_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', farmerIds);

      const profilesMap = new Map(profiles?.map(p => [p.id, p.name]) || []);

      const enrichedListings = (data || []).map(l => ({
        ...l,
        status: l.status as Listing['status'],
        photos: l.photos || [],
        farmer_name: profilesMap.get(l.farmer_id) || 'Unknown',
      }));

      setListings(enrichedListings);
    } catch (err) {
      console.error('Error fetching listings:', err);
      toast.error('Failed to load listings');
    } finally {
      setLoading(false);
    }
  };

  const logAdminAction = async (action: string, entityId: string, details: any) => {
    if (!currentUser) return;
    await supabase.from('admin_audit_logs').insert({
      admin_id: currentUser.id,
      action,
      entity_type: 'listing',
      entity_id: entityId,
      details,
    });
  };

  const handleStatusChange = async (listingId: string, newStatus: Listing['status']) => {
    try {
      const { error } = await supabase
        .from('listings')
        .update({ status: newStatus })
        .eq('id', listingId);

      if (error) throw error;

      await logAdminAction('update_status', listingId, { new_status: newStatus });
      
      setListings(prev => prev.map(l => l.id === listingId ? { ...l, status: newStatus } : l));
      toast.success(`Listing ${newStatus}`);
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from('listings')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;

      await logAdminAction('delete', deleteId, {});
      
      setListings(prev => prev.filter(l => l.id !== deleteId));
      toast.success('Listing deleted');
    } catch (err) {
      console.error('Error deleting listing:', err);
      toast.error('Failed to delete listing');
    } finally {
      setDeleteId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'draft': return <Badge className="bg-gray-100 text-gray-800">Draft</Badge>;
      case 'sold': return <Badge className="bg-blue-100 text-blue-800">Sold</Badge>;
      case 'archived': return <Badge className="bg-orange-100 text-orange-800">Archived</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getCategoryIcon = (category: string) => {
    return PRODUCE_CATEGORIES.find(c => c.id === category)?.icon || '📦';
  };

  const filteredListings = listings.filter(listing => {
    const matchesSearch = 
      listing.title?.toLowerCase().includes(search.toLowerCase()) ||
      listing.farmer_name?.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || listing.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || listing.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  return (
    <AdminLayout title="Listings">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search listings..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full md:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sold">Sold</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full md:w-40">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {PRODUCE_CATEGORIES.map(cat => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.icon} {cat.id.charAt(0).toUpperCase() + cat.id.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-card rounded-lg p-4 border border-border">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-2xl font-bold">{listings.length}</p>
        </div>
        <div className="bg-card rounded-lg p-4 border border-border">
          <p className="text-sm text-muted-foreground">Active</p>
          <p className="text-2xl font-bold text-green-600">{listings.filter(l => l.status === 'active').length}</p>
        </div>
        <div className="bg-card rounded-lg p-4 border border-border">
          <p className="text-sm text-muted-foreground">Sold</p>
          <p className="text-2xl font-bold text-blue-600">{listings.filter(l => l.status === 'sold').length}</p>
        </div>
        <div className="bg-card rounded-lg p-4 border border-border">
          <p className="text-sm text-muted-foreground">Archived</p>
          <p className="text-2xl font-bold text-orange-600">{listings.filter(l => l.status === 'archived').length}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Listing</TableHead>
                  <TableHead>Farmer</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredListings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                      No listings found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredListings.map((listing) => (
                    <TableRow key={listing.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                            {listing.photos[0] ? (
                              <img src={listing.photos[0]} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-lg">{getCategoryIcon(listing.category)}</span>
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{listing.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {listing.quantity} {listing.unit}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{listing.farmer_name}</TableCell>
                      <TableCell className="font-medium">
                        ${listing.price_per_unit.toFixed(2)}/{listing.unit}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          {listing.province}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(listing.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(listing.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link to={`/listing/${listing.id}`}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Listing
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleStatusChange(listing.id, 'active')}>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Set Active
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange(listing.id, 'archived')}>
                              <Archive className="h-4 w-4 mr-2" />
                              Archive
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => setDeleteId(listing.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Listing?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the listing and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default Listings;