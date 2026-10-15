import { useEffect, useState } from 'react';
import { Users, ShoppingBasket, Truck, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export const SocialProof = () => {
  const [stats, setStats] = useState({ listings: 0, orders: 0 });

  useEffect(() => {
    const fetch = async () => {
      const [{ count: listingCount }, { count: orderCount }] = await Promise.all([
        supabase.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('orders').select('*', { count: 'exact', head: true }),
      ]);
      setStats({ listings: listingCount || 0, orders: orderCount || 0 });
    };
    fetch();
  }, []);

  const proofs = [
    { icon: ShoppingBasket, label: 'Active Listings', value: stats.listings, color: 'bg-primary/10 text-primary' },
    { icon: TrendingUp, label: 'Orders Placed', value: stats.orders, color: 'bg-accent/10 text-accent' },
    { icon: Users, label: 'Provinces', value: 10, color: 'bg-primary/10 text-primary' },
    { icon: Truck, label: 'Drivers', value: '50+', color: 'bg-secondary/10 text-secondary' },
  ];

  return (
    <section className="px-4 mt-6">
      <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground text-center mb-4">
          Trusted Across Zimbabwe
        </h2>
        <div className="grid grid-cols-4 gap-3">
          {proofs.map((item) => (
            <div key={item.label} className="flex flex-col items-center text-center">
              <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center mb-1.5`}>
                <item.icon className="h-4.5 w-4.5" />
              </div>
              <span className="text-base font-bold text-foreground">{item.value}</span>
              <span className="text-[9px] text-muted-foreground leading-tight mt-0.5">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
