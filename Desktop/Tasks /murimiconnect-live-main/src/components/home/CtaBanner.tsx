import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export const CtaBanner = () => {
  const { user } = useAuth();

  return (
    <section className="px-4 mt-6 mb-8">
      <div className="bg-foreground rounded-2xl p-6 text-center shadow-sm">
        <h2 className="text-base font-bold text-background mb-1.5">
          {user ? 'Explore the Marketplace' : 'Join Murimi Connect Today'}
        </h2>
        <p className="text-xs text-background/60 mb-4 leading-relaxed max-w-xs mx-auto">
          {user
            ? 'Discover fresh produce from verified farmers across Zimbabwe.'
            : 'Connect with farmers, buy fresh, and support local agriculture.'}
        </p>
        <Link
          to={user ? '/marketplace' : '/auth?mode=signup'}
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground text-xs font-semibold rounded-xl press-effect shadow-md hover:shadow-lg transition-shadow"
        >
          {user ? 'Browse Now' : 'Get Started Free'}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </section>
  );
};
