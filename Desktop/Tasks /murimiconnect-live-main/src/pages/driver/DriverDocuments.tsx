import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { FileCheck, Upload, Loader2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-transition';

type DocType = 'license' | 'national_id' | 'vehicle_registration' | 'insurance';

interface DriverDoc {
  id: string;
  doc_type: DocType;
  file_url: string;
  expires_at: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  notes: string | null;
}

const DOC_LABELS: Record<DocType, string> = {
  license: "Driver's License",
  national_id: 'National ID',
  vehicle_registration: 'Vehicle Registration',
  insurance: 'Insurance Certificate',
};

const STATUS_COLORS: Record<string, string> = {
  approved: 'bg-primary text-primary-foreground',
  pending: 'bg-amber-500 text-white',
  rejected: 'bg-destructive text-destructive-foreground',
  expired: 'bg-muted text-muted-foreground',
};

const DriverDocuments = () => {
  const { user } = useAuth();
  const [docs, setDocs] = useState<DriverDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<DocType | null>(null);
  const [expiry, setExpiry] = useState<Record<DocType, string>>({
    license: '', national_id: '', vehicle_registration: '', insurance: '',
  });

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('driver_documents')
      .select('*')
      .eq('driver_id', user.id)
      .order('created_at', { ascending: false });
    setDocs((data as DriverDoc[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const handleUpload = async (docType: DocType, file: File) => {
    if (!user) return;
    setUploading(docType);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/${docType}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('driver-documents').upload(path, file, { upsert: true });
      if (upErr) throw upErr;

      const { data: signed } = await supabase.storage
        .from('driver-documents').createSignedUrl(path, 60 * 60 * 24 * 365);

      const { error: dbErr } = await supabase.from('driver_documents').insert([{
        driver_id: user.id,
        doc_type: docType,
        file_url: signed?.signedUrl || path,
        expires_at: expiry[docType] || null,
        status: 'pending',
      }]);
      if (dbErr) throw dbErr;

      toast.success(`${DOC_LABELS[docType]} uploaded — pending review`);
      await load();
    } catch (e: any) {
      toast.error(e.message || 'Upload failed');
    } finally {
      setUploading(null);
    }
  };

  const latestByType = (t: DocType) => docs.find(d => d.doc_type === t);

  return (
    <Layout>
      <PageHeader title="Verification Documents" />
      <div className="px-4 pb-24 max-w-2xl mx-auto space-y-3">
        <Card className="bg-primary/5 border-primary/30">
          <CardContent className="pt-4 flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-semibold mb-1">Why verify?</p>
              <p className="text-muted-foreground">Verified drivers get priority on dispatch and a trust badge buyers can see.</p>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (Object.keys(DOC_LABELS) as DocType[]).map(t => {
          const doc = latestByType(t);
          const isExpiringSoon = doc?.expires_at &&
            new Date(doc.expires_at).getTime() - Date.now() < 1000 * 60 * 60 * 24 * 30;
          return (
            <Card key={t}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <FileCheck className="h-4 w-4 text-primary" />
                    {DOC_LABELS[t]}
                  </span>
                  {doc && <Badge className={`text-[10px] ${STATUS_COLORS[doc.status]}`}>{doc.status}</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {doc?.expires_at && (
                  <p className={`text-xs ${isExpiringSoon ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                    {isExpiringSoon && <AlertTriangle className="h-3 w-3 inline mr-1" />}
                    Expires: {new Date(doc.expires_at).toLocaleDateString()}
                  </p>
                )}
                {doc?.notes && <p className="text-xs text-muted-foreground italic">"{doc.notes}"</p>}
                <div className="space-y-2">
                  <Label className="text-xs">Expiry date (optional)</Label>
                  <Input type="date" value={expiry[t]} onChange={e => setExpiry({ ...expiry, [t]: e.target.value })} />
                </div>
                <div>
                  <input
                    id={`file-${t}`}
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={e => e.target.files?.[0] && handleUpload(t, e.target.files[0])}
                  />
                  <Button asChild variant={doc ? 'outline' : 'default'} size="sm" className="w-full"
                          disabled={uploading === t}>
                    <label htmlFor={`file-${t}`} className="cursor-pointer">
                      {uploading === t ? (
                        <><Loader2 className="h-4 w-4 animate-spin mr-2" />Uploading...</>
                      ) : (
                        <><Upload className="h-4 w-4 mr-2" />{doc ? 'Replace document' : 'Upload document'}</>
                      )}
                    </label>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </Layout>
  );
};

export default DriverDocuments;
