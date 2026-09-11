import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Loader2, ArrowLeft, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Layout } from '@/components/layout/Layout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

type FunctionResponse<T = unknown> = T & {
  error?: string;
};

const VerifyPhone = () => {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'enter' | 'verify'>('enter');
  const [loading, setLoading] = useState(false);

  const sendCode = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke<FunctionResponse>('send-sms-otp', { body: { phone } });
    setLoading(false);
    if (error || data?.error) {
      toast.error(data?.error || error?.message || 'Failed to send code');
      return;
    }
    toast.success('Code sent. Check your SMS.');
    setStage('verify');
  };

  const verify = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke<FunctionResponse<{ phone?: string }>>('verify-sms-otp', { body: { code } });
    setLoading(false);
    if (error || data?.error) {
      toast.error(data?.error || error?.message || 'Verification failed');
      return;
    }
    await refreshProfile();
    toast.success('Phone verified!');
    navigate('/settings');
  };

  return (
    <Layout>
      <div className="container max-w-md mx-auto p-4 space-y-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Verify your phone</h1>
            <p className="text-sm text-muted-foreground">Required to sell, buy, and use delivery.</p>
          </div>
        </div>

        {stage === 'enter' ? (
          <div className="space-y-4">
            <div className="space-y-2 [&>p:first-of-type]:hidden">
              <Label htmlFor="phone">Phone number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+263 77 123 4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">Use international format or 077…</p>
            </div>
            <p className="text-xs text-muted-foreground">Use international format or 077...</p>
            <Button onClick={sendCode} disabled={loading || !phone} className="w-full" size="lg">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send code'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">6-digit code</Label>
              <Input
                id="code"
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="text-center text-2xl tracking-widest"
              />
            </div>
            <Button onClick={verify} disabled={loading || code.length !== 6} className="w-full" size="lg">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
            </Button>
            <Button variant="ghost" onClick={() => setStage('enter')} className="w-full">
              Use a different number
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default VerifyPhone;
