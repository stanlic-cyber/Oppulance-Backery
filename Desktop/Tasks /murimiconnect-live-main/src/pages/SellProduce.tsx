import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, X, Loader2, ImagePlus } from 'lucide-react';
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
import { optimizeImage } from '@/lib/imageOptim';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const SellProduce = () => {
  const { user, role } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || !user) return;

    setUploading(true);
    const uploadedUrls: string[] = [];

    try {
      for (const rawFile of Array.from(files)) {
        if (!rawFile.type.startsWith('image/')) {
          toast.error('Only images are allowed');
          continue;
        }

        if (rawFile.size > 10 * 1024 * 1024) {
          toast.error('Image size must be less than 10MB');
          continue;
        }

        // Client-side optimize: resize + WebP encode before upload
        const file = await optimizeImage(rawFile);

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
    if (!user) return;

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
      const { data: inserted, error } = await supabase.from('listings').insert([{
        farmer_id: user.id,
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
        status: 'active',
      }]).select('id').maybeSingle();

      if (error) throw error;

      // Fire-and-forget AI moderation
      if (inserted?.id) {
        supabase.functions.invoke('ai-moderate-listing', {
          body: { listing_id: inserted.id },
        }).catch((e) => console.warn('Moderation queue failed', e));
      }

      toast.success('Listing published successfully!');
      navigate('/my-listings');
    } catch (err: any) {
      console.error('Error creating listing:', err);
      toast.error(err.message || 'Failed to create listing');
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
            Only farmers can list produce for sale. Please sign up as a farmer to access this feature.
          </p>
          <Button onClick={() => navigate('/marketplace')}>
            Go to Marketplace
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="bg-muted/30 min-h-screen py-8">
        <div className="container max-w-2xl">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">{t('listing.create')}</h1>
          <p className="text-muted-foreground mb-8">
            List your fresh produce for buyers across Zimbabwe
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
                Up to 5 images, max 10MB each — auto-optimized for fast loading
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
            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Publishing...
                </>
              ) : (
                t('listing.publish')
              )}
            </Button>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default SellProduce;
