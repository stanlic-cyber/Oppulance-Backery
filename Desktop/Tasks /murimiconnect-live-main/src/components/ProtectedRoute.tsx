import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, ShieldAlert } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

type AppRole = 'farmer' | 'buyer' | 'admin' | 'driver';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
  requireAuth?: boolean;
  requirePhoneVerified?: boolean;
}

export const ProtectedRoute = ({
  children,
  allowedRoles,
  requireAuth = true,
  requirePhoneVerified = false,
}: ProtectedRouteProps) => {
  const { user, role, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (requireAuth && !user) {
    return <Navigate to="/auth" replace />;
  }

  if (allowedRoles && (role === null || !allowedRoles.includes(role))) {
    return <Navigate to="/" replace />;
  }

  // Admins and drivers bypass phone-verify gate (admin manages, driver has KYC)
  const exemptRole = role === 'admin' || role === 'driver';
  if (requirePhoneVerified && user && !exemptRole && !profile?.phone_verified_at) {
    return (
      <Layout>
        <div className="container max-w-md mx-auto p-6 mt-10 space-y-5 text-center">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Verify your phone first</h1>
            <p className="text-sm text-muted-foreground mt-1">
              For your safety and to prevent fraud, please verify your phone number to continue.
            </p>
          </div>
          <Button asChild className="w-full" size="lg">
            <Link to="/settings/verify-phone" state={{ from: location.pathname }}>
              Verify phone now
            </Link>
          </Button>
          <Button asChild variant="ghost" className="w-full">
            <Link to="/">Go home</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return <>{children}</>;
};
