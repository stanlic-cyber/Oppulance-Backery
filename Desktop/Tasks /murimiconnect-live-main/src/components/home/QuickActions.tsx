import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ShoppingBasket, Tractor, Truck, ArrowRight } from 'lucide-react';

export const QuickActions = () => {
  const { user, role } = useAuth();

  if (!user) {
    return (
      <section className="px-4 mt-5">
        <div className="flex gap-3">
          <Link
            to="/auth?mode=signup"
            className="flex-1 bg-primary text-primary-foreground rounded-2xl p-4 press-effect shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="w-9 h-9 rounded-xl bg-primary-foreground/15 flex items-center justify-center mb-2">
              <Tractor className="h-4.5 w-4.5" />
            </div>
            <h3 className="text-sm font-bold">Start Selling</h3>
            <p className="text-[10px] text-primary-foreground/70 mt-0.5">List your produce</p>
          </Link>
          <Link
            to="/marketplace"
            className="flex-1 bg-card text-foreground rounded-2xl p-4 border border-border press-effect shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
              <ShoppingBasket className="h-4.5 w-4.5 text-primary" />
            </div>
            <h3 className="text-sm font-bold">Browse & Buy</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">Fresh from farms</p>
          </Link>
        </div>
      </section>
    );
  }

  if (role === 'farmer') {
    return (
      <section className="px-4 mt-5">
        <div className="flex gap-3">
          <Link
            to="/sell"
            className="flex-1 bg-primary text-primary-foreground rounded-2xl p-4 press-effect shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="w-9 h-9 rounded-xl bg-primary-foreground/15 flex items-center justify-center mb-2">
              <Tractor className="h-4.5 w-4.5" />
            </div>
            <h3 className="text-sm font-bold">Add Listing</h3>
            <p className="text-[10px] text-primary-foreground/70 mt-0.5">Sell your produce</p>
          </Link>
          <Link
            to="/my-orders"
            className="flex-1 bg-card text-foreground rounded-2xl p-4 border border-border press-effect shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
              <ShoppingBasket className="h-4.5 w-4.5 text-primary" />
            </div>
            <h3 className="text-sm font-bold">My Orders</h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">Manage orders</p>
          </Link>
        </div>
      </section>
    );
  }

  if (role === 'driver') {
    return (
      <section className="px-4 mt-5">
        <Link
          to="/driver"
          className="flex items-center justify-between bg-primary text-primary-foreground rounded-2xl p-4 press-effect shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-foreground/15 flex items-center justify-center">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Driver Dashboard</h3>
              <p className="text-[10px] text-primary-foreground/70 mt-0.5">View deliveries & earnings</p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-primary-foreground/60" />
        </Link>
      </section>
    );
  }

  // Buyer
  return (
    <section className="px-4 mt-5">
      <div className="flex gap-3">
        <Link
          to="/marketplace"
          className="flex-1 bg-primary text-primary-foreground rounded-2xl p-4 press-effect shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="w-9 h-9 rounded-xl bg-primary-foreground/15 flex items-center justify-center mb-2">
            <ShoppingBasket className="h-4.5 w-4.5" />
          </div>
          <h3 className="text-sm font-bold">Shop Now</h3>
          <p className="text-[10px] text-primary-foreground/70 mt-0.5">Browse produce</p>
        </Link>
        <Link
          to="/my-orders"
          className="flex-1 bg-card text-foreground rounded-2xl p-4 border border-border press-effect shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
            <ShoppingBasket className="h-4.5 w-4.5 text-primary" />
          </div>
          <h3 className="text-sm font-bold">My Orders</h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">Track deliveries</p>
        </Link>
      </div>
    </section>
  );
};
