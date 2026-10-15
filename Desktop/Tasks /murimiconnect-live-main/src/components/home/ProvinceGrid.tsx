import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { ZIMBABWE_PROVINCES } from '@/lib/constants';

export const ProvinceGrid = () => {
  return (
    <section className="px-4 mt-6">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
          <MapPin className="h-3.5 w-3.5 text-primary" />
        </div>
        <h2 className="text-base font-semibold text-foreground">Shop by Province</h2>
      </div>
      <div className="flex gap-2 flex-wrap">
        {ZIMBABWE_PROVINCES.map((province, i) => (
          <Link
            key={province}
            to={`/marketplace?province=${encodeURIComponent(province)}`}
            className="px-3.5 py-2 bg-card rounded-xl border border-border text-xs font-medium text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-200 press-effect shadow-sm animate-scale-in opacity-0"
            style={{ animationDelay: `${i * 30}ms`, animationFillMode: 'forwards' }}
          >
            {province}
          </Link>
        ))}
      </div>
    </section>
  );
};
