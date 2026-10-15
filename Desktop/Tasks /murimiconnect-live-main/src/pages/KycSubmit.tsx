import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Upload, Loader2, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type SubmissionType = 'seller' | 'driver';

const KycSubmit = () => {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [existingStatus, setExistingStatus] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);

  const submissionType: SubmissionType = role === 'driver' ? 'driver' : 'seller';

  const [idNumber, setIdNumber] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [idPhoto, setIdPhoto] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [licence, setLicence] = useState<File | null>(null);
  const [vehicleReg, setVehicleReg] = useState<File | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('kyc_submissions')
        .select('status, rejection_reason')
        .eq('user_id', user.id)
        .eq('submission_type', submissionType)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        setExistingStatus(data.status);
        setRejectionReason(data.rejection_reason);
      }
    })();
  }, [user, submissionType]);

  const uploadFile = async (file: File, suffix: string): Promise<string | null> => {
    if (!user) return null;
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${user.id}/${submissionType}-${suffix}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('kyc-documents').upload(path, file, {
      upsert: false,
      contentType: file.type,
    });
    if (error) {
      toast.error(`Upload failed: ${error.message}`);
      return null;
    }
    return path;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!idNumber.trim()) return toast.error('National ID number is required');
    if (!idPhoto) return toast.error('ID photo is required');
    if (!selfie) return toast.error('Selfie holding your ID is required');
    if (submissionType === 'driver' && !licence) return toast.error('Driver licence photo is required');
    if (submissionType === 'driver' && !vehiclePlate.trim()) return toast.error('Vehicle plate number is required');

    setLoading(true);
    try {
      const id_photo_url = await uploadFile(idPhoto, 'id');
      const selfie_url = await uploadFile(selfie, 'selfie');
      const licence_url = licence ? await uploadFile(licence, 'licence') : null;
      const vehicle_reg_url = vehicleReg ? await uploadFile(vehicleReg, 'vehiclereg') : null;

      if (!id_photo_url || !selfie_url) throw new Error('Upload failed');

      const { error } = await supabase.from('kyc_submissions').insert([{
        user_id: user.id,
        submission_type: submissionType,
        id_number: idNumber.trim(),
        id_photo_url,
        selfie_url,
        licence_url,
        vehicle_reg_url,
        vehicle_plate: submissionType === 'driver' ? vehiclePlate.trim() : null,
        status: 'pending',
      }]);

      if (error) throw error;

      // Mark profile/driver_profile as pending
      if (submissionType === 'seller') {
        await supabase.from('profiles').update({ kyc_status: 'pending' }).eq('id', user.id);
      } else {
        await supabase.from('driver_profiles').update({ kyc_status: 'pending' }).eq('user_id', user.id);
      }

      toast.success('Verification submitted. We will review within 24 hours.');
      setExistingStatus('pending');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  const StatusBanner = () => {
    if (existingStatus === 'approved') {
      return (
        <div className="rounded-2xl bg-primary/10 border border-primary/30 p-6 text-center">
          <CheckCircle2 className="h-12 w-12 mx-auto text-primary mb-3" />
          <h2 className="text-xl font-bold mb-1">You're verified</h2>
          <p className="text-muted-foreground">Your account shows a verified badge to buyers and sellers.</p>
        </div>
      );
    }
    if (existingStatus === 'pending') {
      return (
        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-6 text-center">
          <Clock className="h-12 w-12 mx-auto text-amber-600 mb-3" />
          <h2 className="text-xl font-bold mb-1">Review in progress</h2>
          <p className="text-muted-foreground">We're checking your documents. This usually takes under 24 hours.</p>
        </div>
      );
    }
    if (existingStatus === 'rejected') {
      return (
        <div className="rounded-2xl bg-destructive/10 border border-destructive/30 p-6">
          <div className="flex items-center gap-3 mb-2">
            <XCircle className="h-8 w-8 text-destructive" />
            <h2 className="text-xl font-bold">Verification rejected</h2>
          </div>
          {rejectionReason && <p className="text-sm text-muted-foreground mb-3">Reason: {rejectionReason}</p>}
          <p className="text-sm">Please re-submit with clearer documents below.</p>
        </div>
      );
    }
    return null;
  };

  if (existingStatus === 'approved' || existingStatus === 'pending') {
    return (
      <Layout>
        <div className="container max-w-lg py-8 space-y-6">
          <StatusBanner />
          <Button variant="outline" className="w-full" onClick={() => navigate(-1)}>Back</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container max-w-lg py-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary text-primary-foreground mb-4">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold">Verify your identity</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Verified accounts earn buyer trust and rank higher in search. Documents are private and only seen by our review team.
          </p>
        </div>

        {existingStatus === 'rejected' && <div className="mb-6"><StatusBanner /></div>}

        <form onSubmit={handleSubmit} className="space-y-5 bg-card rounded-2xl p-6 shadow-xl">
          <div className="space-y-2">
            <Label htmlFor="idNumber">National ID number *</Label>
            <Input id="idNumber" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="e.g. 63-1234567-A-89" required />
          </div>

          <FileField label="Photo of your National ID *" file={idPhoto} setFile={setIdPhoto} />
          <FileField label="Selfie holding your ID *" file={selfie} setFile={setSelfie} />

          {submissionType === 'driver' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="plate">Vehicle plate number *</Label>
                <Input id="plate" value={vehiclePlate} onChange={(e) => setVehiclePlate(e.target.value)} placeholder="e.g. AEH 1234" required />
              </div>
              <FileField label="Driver's licence *" file={licence} setFile={setLicence} />
              <FileField label="Vehicle registration (optional)" file={vehicleReg} setFile={setVehicleReg} />
            </>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting...</> : <><ShieldCheck className="h-4 w-4 mr-2" />Submit for review</>}
          </Button>
        </form>
      </div>
    </Layout>
  );
};

const FileField = ({ label, file, setFile }: { label: string; file: File | null; setFile: (f: File | null) => void }) => (
  <div className="space-y-2">
    <Label>{label}</Label>
    <label className="flex items-center gap-3 cursor-pointer rounded-xl border-2 border-dashed border-border hover:border-primary transition-colors p-4">
      <Upload className="h-5 w-5 text-muted-foreground" />
      <span className="text-sm flex-1 truncate">{file ? file.name : 'Tap to upload (JPG/PNG, max 5MB)'}</span>
      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0] || null;
          if (f && f.size > 5 * 1024 * 1024) {
            toast.error('File too large (max 5MB)');
            return;
          }
          setFile(f);
        }}
      />
    </label>
  </div>
);

export default KycSubmit;
