import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Tractor, Mail, Lock, User, Phone, Loader2, ShoppingCart, Truck, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { lovable } from '@/integrations/lovable/index';


type AuthMode = 'signin' | 'signup';
type UserRole = 'farmer' | 'buyer' | 'driver';

const getErrorMessage = (err: unknown) => err instanceof Error ? err.message : 'An error occurred';

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<AuthMode>(
    searchParams.get('mode') === 'signup' ? 'signup' : 'signin'
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('buyer');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  const { signIn, signInWithGoogle, signUp, user, role: userRole } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  // Preserve a same-origin `next` param through sign-in/sign-up/OAuth so
  // callers (e.g. the OAuth consent route) return to their original URL.
  const rawNext = searchParams.get('next') ?? '';
  const nextPath = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '';

  // Single source of truth for post-auth redirect (no double-navigate races).
  useEffect(() => {
    if (!user || !userRole) return;
    if (nextPath) {
      navigate(nextPath, { replace: true });
      return;
    }
    switch (userRole) {
      case 'admin':  navigate('/admin', { replace: true }); break;
      case 'farmer': navigate('/seller', { replace: true }); break;
      case 'driver': navigate('/driver', { replace: true }); break;
      default:       navigate('/marketplace', { replace: true });
    }
  }, [user, userRole, navigate, nextPath]);

  const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

  const handlePasswordKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const on = e.getModifierState && e.getModifierState('CapsLock');
    setCapsLock(!!on);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const emailTrim = email.trim();
    if (!isValidEmail(emailTrim)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'signin') {
        const { error } = await signIn(emailTrim, password);
        if (error) {
          const msg = error.message.toLowerCase();
          toast.error(msg.includes('verify') || msg.includes('confirm')
            ? 'Please verify your email before signing in.'
            : 'Incorrect email or password.');
        } else {
          toast.success('Welcome back!');
          // Redirect handled by useEffect once role hydrates.
        }
      } else {
        if (!name.trim()) {
          toast.error('Please enter your name');
          return;
        }
        if (password.length < 8) {
          toast.error('Password must be at least 8 characters');
          return;
        }
        if (password !== confirmPassword) {
          toast.error('Passwords do not match');
          return;
        }
        const { error } = await signUp(emailTrim, password, name, role, phone);
        if (error) {
          const msg = error.message?.toLowerCase() ?? '';
          if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
            toast.error('That email is already in use. Try signing in instead.');
          } else if (msg.includes('pwned') || msg.includes('breach') || msg.includes('compromised')) {
            toast.error('This password has appeared in a data breach. Please choose a different one.');
          } else if (msg.includes('weak') || msg.includes('short')) {
            toast.error('Please choose a stronger password (8+ characters, mix of letters & numbers).');
          } else {
            toast.error('Could not create your account. Please try again.');
          }
        } else {
          toast.success('Account created — please check your email to verify.');
          // Redirect handled by useEffect after session hydrates.
        }
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
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

        {/* Auth Card */}
        <div className="bg-card rounded-2xl shadow-xl p-8 animate-scale-in">
          <h1 className="text-2xl font-bold text-center mb-2">
            {mode === 'signin' ? t('auth.signIn') : t('auth.signUp')}
          </h1>
          <p className="text-muted-foreground text-center mb-6">
            {mode === 'signin' 
              ? 'Welcome back! Sign in to your account' 
              : 'Create an account to start trading'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">{t('auth.name')}</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="John Moyo"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="phone">{t('auth.phone')}</Label>
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
                </div>

                {/* Role Selection */}
                <div className="space-y-2">
                  <Label>{t('auth.role')}</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setRole('farmer')}
                      className={`p-3 rounded-xl border-2 transition-all [&_.text-2xl]:hidden ${
                        role === 'farmer'
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <Tractor className="h-6 w-6 mx-auto mb-1 text-primary" />
                      <div className="text-2xl mb-1">🌾</div>
                      <div className="font-medium text-sm">{t('auth.farmer')}</div>
                      <div className="text-xs text-muted-foreground">Sell produce</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('buyer')}
                      className={`p-3 rounded-xl border-2 transition-all [&_.text-2xl]:hidden ${
                        role === 'buyer'
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <ShoppingCart className="h-6 w-6 mx-auto mb-1 text-primary" />
                      <div className="text-2xl mb-1">🛒</div>
                      <div className="font-medium text-sm">{t('auth.buyer')}</div>
                      <div className="text-xs text-muted-foreground">Buy produce</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('driver')}
                      className={`p-3 rounded-xl border-2 transition-all [&_.text-2xl]:hidden ${
                        role === 'driver'
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <Truck className="h-6 w-6 mx-auto mb-1 text-primary" />
                      <div className="text-2xl mb-1">🚛</div>
                      <div className="font-medium text-sm">Driver</div>
                      <div className="text-xs text-muted-foreground">Deliver goods</div>
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Email */}
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

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyUp={handlePasswordKey}
                  onKeyDown={handlePasswordKey}
                  className="pl-10 pr-10"
                  required
                  minLength={mode === 'signup' ? 8 : 6}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  aria-label={t('auth.password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {capsLock && (
                <p className="text-xs text-orange-600 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Caps Lock is on
                </p>
              )}
              {mode === 'signup' && (
                <p className="text-xs text-muted-foreground">Use 8+ characters with a mix of letters and numbers.</p>
              )}
            </div>

            {/* Confirm Password (signup only) */}
            {mode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t('auth.confirmPassword') || 'Confirm password'}</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-destructive">Passwords do not match</p>
                )}
              </div>
            )}


            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('common.loading')}
                </>
              ) : mode === 'signin' ? (
                t('auth.signIn')
              ) : (
                t('auth.signUp')
              )}
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                size="lg"
                disabled={loading}
                onClick={async () => {
                  setLoading(true);
                  try {
                    const { error } = await signInWithGoogle(
                      window.location.origin + (nextPath ? `/auth?next=${encodeURIComponent(nextPath)}` : '/auth'),
                    );
                    if (error) {
                      toast.error(error.message || 'Failed to sign in with Google');
                    }
                  } catch (err: unknown) {
                    toast.error(getErrorMessage(err));
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                size="lg"
                disabled={loading}
                onClick={async () => {
                  setLoading(true);
                  try {
                    const { error } = await lovable.auth.signInWithOAuth("apple", {
                      redirect_uri: window.location.origin + (nextPath ? `/auth?next=${encodeURIComponent(nextPath)}` : ''),
                    });
                    if (error) {
                      toast.error(error.message || 'Failed to sign in with Apple');
                    }
                  } catch (err: unknown) {
                    toast.error(getErrorMessage(err));
                  } finally {
                    setLoading(false);
                  }
                }}
              >
                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                Continue with Apple
              </Button>
            </div>
          </form>

          {mode === 'signin' && (
            <div className="mt-4 text-center">
              <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                {t('auth.forgotPassword')}
              </Link>
            </div>
          )}

          <div className="mt-6 text-center">
            {mode === 'signin' ? (
              <p className="text-sm text-muted-foreground">
                {t('auth.noAccount')}{' '}
                <button
                  onClick={() => setMode('signup')}
                  className="text-primary hover:underline font-medium"
                >
                  {t('auth.signUp')}
                </button>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t('auth.hasAccount')}{' '}
                <button
                  onClick={() => setMode('signin')}
                  className="text-primary hover:underline font-medium"
                >
                  {t('auth.signIn')}
                </button>
              </p>
            )}
          </div>
        </div>

        {/* Payment Notice */}
        <p className="mt-6 text-center text-xs text-muted-foreground max-w-sm mx-auto">
          {t('payment.notice')}
        </p>
      </div>
    </div>
  );
};

export default Auth;
