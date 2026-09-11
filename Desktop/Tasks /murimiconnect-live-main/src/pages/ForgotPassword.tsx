import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Tractor, Mail, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error(t('error.fillAllFields'));
      return;
    }

    setLoading(true);
    try {
      // Always show success to avoid email enumeration — Supabase returns 200
      // whether or not the account exists; we swallow errors client-side too.
      await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setEmailSent(true);
    } catch {
      // Intentional: never reveal whether an email is registered.
      setEmailSent(true);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-muted via-background to-muted flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Tractor className="h-7 w-7" />
          </div>
          <span className="text-2xl font-bold text-foreground">Murimi Connect</span>
        </Link>

        {/* Card */}
        <div className="bg-card rounded-2xl shadow-xl p-8 animate-scale-in">
          {emailSent ? (
            <div className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold mb-2">{t('auth.checkInbox')}</h1>
              <p className="text-muted-foreground mb-6">{t('auth.resetEmailSent')}</p>
              <Button variant="outline" asChild className="w-full">
                <Link to="/auth">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t('auth.backToSignIn')}
                </Link>
              </Button>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-center mb-2">{t('auth.forgotPassword')}</h1>
              <p className="text-muted-foreground text-center mb-6">
                Enter your email and we'll send you a reset link
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t('auth.email')}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      {t('common.loading')}
                    </>
                  ) : (
                    t('auth.sendResetLink')
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <Link to="/auth" className="text-sm text-primary hover:underline">
                  <ArrowLeft className="h-3 w-3 inline mr-1" />
                  {t('auth.backToSignIn')}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
