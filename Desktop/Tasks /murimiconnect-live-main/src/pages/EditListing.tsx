import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { X, Loader2, ImagePlus, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { PRODUCE_CATEGORIES, ZIMBABWE_PROVINCES, UNITS } from '@/lib/constants';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const EditListing = () => {
  const { id } = useParams<{ id: string }>();
  const { user, role } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('kg');
  const [pricePerUnit, setPricePerUnit] = useState('');
  const [negotiable, setNegotiable] = useState(true);
  const [province, setProvince] = useState('');
  const [nearestTown, setNearestTown] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id && user) {
      fetchListing();
    }
  }, [id, user]);

  const fetchListing = async () => {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('id', id)
        .eq('farmer_id', user?.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast.error('Listing not found or you do not have permission to edit it');
        navigate('/my-listings');
        return;
      }

      setTitle(data.title);
      setCategory(data.category);
      setQuantity(data.quantity.toString());
      setUnit(data.unit);
      setPricePerUnit(data.price_per_unit.toString());
      setNegotiable(data.negotiable ?? true);
      setProvince(data.province);
      setNearestTown(data.nearest_town || '');
      setDescription(data.description || '');
      setPhotos(data.photos || []);
    } catch (err) {
      console.error('Error fetching listing:', err);
      toast.error('Failed to load listing');
      navigate('/my-listings');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || !user) return;

    setUploading(true);
    const uploadedUrls: string[] = [];

    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          toast.error('Only images are allowed');
          continue;
        }

        if (file.size > 5 * 1024 * 1024) {
          toast.error('Image size must be less than 5MB');
          continue;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('listing-images')
          .upload(fileName, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast.error('Failed to upload image');
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('listing-images')
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      }

      if (uploadedUrls.length > 0) {
        setPhotos(prev => [...prev, ...uploadedUrls].slice(0, 5));
        toast.success(`${uploadedUrls.length} image(s) uploaded`);
      }
    } catch (err) {
      console.error('Error uploading:', err);
      toast.error('Failed to upload images');
    } finally {
      setUploading(false);
    }
  }, [user]);

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id) return;

    if (!title || !category || !quantity || !pricePerUnit || !province) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Enhanced validation
    const parsedQuantity = parseFloat(quantity);
    const parsedPrice = parseFloat(pricePerUnit);

    if (!title.trim()) {
      toast.error('Product name is required');
      return;
    }

    if (parsedPrice <= 0) {
      toast.error('Price must be greater than 0');
      return;
    }

    if (parsedQuantity < 1) {
      toast.error('Quantity must be at least 1');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('listings')
        .update({
          title,
          category,
          quantity: parseFloat(quantity),
          unit,
          price_per_unit: parseFloat(pricePerUnit),
          negotiable,
          province,
          nearest_town: nearestTown || null,
          description: description || null,
          photos,
        })
        .eq('id', id)
        .eq('farmer_id', user.id);

      if (error) throw error;

      toast.success('Listing updated successfully!');
      navigate('/my-listings');
    } catch (err: any) {
      console.error('Error updating listing:', err);
      toast.error(err.message || 'Failed to update listing');
    } finally {
      setSubmitting(false);
    }
  };

  // Redirect if not a farmer
  if (role && role !== 'farmer') {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <h1 className="text-2xl font-bold mb-4">Farmers Only</h1>
          <p className="text-muted-foreground mb-6">
            Only farmers can edit listings.
          </p>
          <Button onClick={() => navigate('/marketplace')}>
            Go to Marketplace
          </Button>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-muted/30 min-h-screen py-8">
        <div className="container max-w-2xl">
          <Button variant="ghost" onClick={() => navigate('/my-listings')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Listings
          </Button>

          <h1 className="text-2xl md:text-3xl font-bold mb-2">{t('listing.edit')}</h1>
          <p className="text-muted-foreground mb-8">
            Update your produce listing details
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Photos */}
            <div className="bg-card p-6 rounded-xl">
              <Label className="mb-4 block">{t('listing.photos')}</Label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                {photos.map((photo, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                    <img src={photo} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {photos.length < 5 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary transition-colors flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary"
                  >
                    {uploading ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <>
                        <ImagePlus className="h-6 w-6" />
                        <span className="text-xs">Add</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleFileUpload(e.target.files)}
                className="hidden"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Up to 5 images, max 5MB each
              </p>
            </div>

            {/* Basic Info */}
            <div className="bg-card p-6 rounded-xl space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">{t('listing.title')} *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Fresh Tomatoes"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">{t('listing.category')} *</Label>
                <Select value={category} onValueChange={setCategory} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.icon} {t(`category.${cat.id}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">{t('listing.quantity')} *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="0"
                    step="0.01"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="100"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit">{t('listing.unit')} *</Label>
                  <Select value={unit} onValueChange={setUnit}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNITS.map((u) => (
                        <SelectItem key={u} value={u}>{u}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="price">{t('listing.price')} (USD) *</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={pricePerUnit}
                  onChange={(e) => setPricePerUnit(e.target.value)}
                  placeholder="2.50"
                  required
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="negotiable">{t('listing.negotiable')}</Label>
                  <p className="text-xs text-muted-foreground">Allow buyers to make offers</p>
                </div>
                <Switch
                  id="negotiable"
                  checked={negotiable}
                  onCheckedChange={setNegotiable}
                />
              </div>
            </div>

            {/* Location */}
            <div className="bg-card p-6 rounded-xl space-y-4">
              <div className="space-y-2">
                <Label htmlFor="province">{t('listing.province')} *</Label>
                <Select value={province} onValueChange={setProvince} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select province" />
                  </SelectTrigger>
                  <SelectContent>
                    {ZIMBABWE_PROVINCES.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="town">{t('listing.nearestTown')}</Label>
                <Input
                  id="town"
                  value={nearestTown}
                  onChange={(e) => setNearestTown(e.target.value)}
                  placeholder="e.g. Marondera"
                />
              </div>
            </div>

            {/* Description */}
            <div className="bg-card p-6 rounded-xl">
              <div className="space-y-2">
                <Label htmlFor="description">{t('listing.description')}</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your produce, quality, harvest date, etc."
                  rows={4}
                />
              </div>
            </div>

            {/* Submit */}
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => navigate('/my-listings')} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default EditListing;
