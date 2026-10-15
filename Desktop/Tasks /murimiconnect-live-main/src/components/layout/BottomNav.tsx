import { Link, useLocation } from 'react-router-dom';
import { Home, Search, ShoppingBasket, ShoppingCart, User, Truck, BarChart3, LayoutDashboard } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';

const BottomNav = () => {
  const location = useLocation();
  const { user, role } = useAuth();
  const { itemCount } = useCart();
  const path = location.pathname;

  const isActive = (href: string) => {
    if (href === '/') return path === '/';
    return path.startsWith(href);
  };

  const getNavItems = () => {
    if (!user) {
      return [
        { href: '/', icon: Home, label: 'Home' },
        { href: '/marketplace', icon: Search, label: 'Search' },
        { href: '/cart', icon: ShoppingCart, label: 'Cart', badge: itemCount },
        { href: '/auth', icon: User, label: 'Sign In' },
      ];
    }

    if (role === 'admin') {
      return [
        { href: '/', icon: Home, label: 'Home' },
        { href: '/admin', icon: LayoutDashboard, label: 'Admin' },
        { href: '/marketplace', icon: Search, label: 'Search' },
        { href: '/admin/orders', icon: ShoppingBasket, label: 'Orders' },
        { href: '/settings', icon: User, label: 'Profile' },
      ];
    }

    if (role === 'driver') {
      return [
        { href: '/', icon: Home, label: 'Home' },
        { href: '/driver', icon: Truck, label: 'Deliveries' },
        { href: '/my-orders', icon: ShoppingBasket, label: 'Orders' },
        { href: '/driver/earnings', icon: BarChart3, label: 'Earnings' },
        { href: '/settings', icon: User, label: 'Profile' },
      ];
    }

    if (role === 'farmer') {
      return [
        { href: '/', icon: Home, label: 'Home' },
        { href: '/marketplace', icon: Search, label: 'Search' },
        { href: '/my-orders', icon: ShoppingBasket, label: 'Orders' },
        { href: '/seller', icon: BarChart3, label: 'Dashboard' },
        { href: '/settings', icon: User, label: 'Profile' },
      ];
    }

    return [
      { href: '/', icon: Home, label: 'Home' },
      { href: '/marketplace', icon: Search, label: 'Search' },
      { href: '/my-orders', icon: ShoppingBasket, label: 'Orders' },
      { href: '/cart', icon: ShoppingCart, label: 'Cart', badge: itemCount },
      { href: '/settings', icon: User, label: 'Profile' },
    ];
  };

  const items = getNavItems();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-lg safe-area-bottom">
      <div className="flex items-center justify-around h-[60px]">
        {items.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              to={item.href}
              className={`relative flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-all duration-200 press-effect ${
                active ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <div className="relative">
                <item.icon className={`h-[22px] w-[22px] transition-all duration-200 ${active ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
                {'badge' in item && item.badge ? (
                  <span className="absolute -top-1.5 -right-2.5 bg-primary text-primary-foreground text-[9px] font-bold rounded-full h-4 min-w-[16px] flex items-center justify-center px-1 shadow-sm">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                ) : null}
              </div>
              <span className={`text-[10px] leading-tight transition-all duration-200 ${active ? 'font-semibold' : 'font-medium'}`}>
                {item.label}
              </span>
              {active && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
