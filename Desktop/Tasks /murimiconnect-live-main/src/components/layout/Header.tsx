import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBasket, LogOut, Settings, HelpCircle, Package, Tractor, Truck, BarChart3, ShoppingCart, Search, Wallet as WalletIcon } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { NotificationBell } from '@/components/notifications/NotificationBell';

export const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, profile, role, signOut } = useAuth();
  const { t } = useLanguage();
  const { itemCount } = useCart();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur-lg">
      {/* Mobile Header */}
      <div className="md:hidden flex h-12 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 press-effect">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Tractor className="h-4 w-4" />
          </div>
          <span className="text-base font-bold text-foreground tracking-tight">Murimi</span>
        </Link>

        <div className="flex items-center gap-0.5">
          <Link to="/marketplace" className="p-2.5 rounded-xl hover:bg-muted transition-colors touch-target flex items-center justify-center">
            <Search className="h-5 w-5 text-muted-foreground" />
          </Link>
          <Link to="/cart" className="relative p-2.5 rounded-xl hover:bg-muted transition-colors touch-target flex items-center justify-center">
            <ShoppingCart className="h-5 w-5 text-muted-foreground" />
            {itemCount > 0 && (
              <span className="absolute top-1 right-1 bg-primary text-primary-foreground text-[9px] font-bold rounded-full h-4 min-w-[16px] flex items-center justify-center px-0.5">
                {itemCount > 99 ? '99+' : itemCount}
              </span>
            )}
          </Link>
          {user && <NotificationBell />}
          {!user && (
            <Button size="sm" variant="default" asChild className="h-8 text-xs px-3 rounded-xl ml-1">
              <Link to="/auth">{t('nav.signIn')}</Link>
            </Button>
          )}
          {user && (
            <button
              className="p-2.5 rounded-xl hover:bg-muted transition-colors touch-target flex items-center justify-center"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              <div className="relative w-5 h-4 flex flex-col justify-between">
                <span className={`w-5 h-0.5 bg-foreground rounded-full transition-all duration-300 origin-center ${mobileMenuOpen ? 'rotate-45 translate-y-[7px]' : ''}`} />
                <span className={`w-5 h-0.5 bg-foreground rounded-full transition-all duration-300 ${mobileMenuOpen ? 'opacity-0 scale-0' : ''}`} />
                <span className={`w-5 h-0.5 bg-foreground rounded-full transition-all duration-300 origin-center ${mobileMenuOpen ? '-rotate-45 -translate-y-[7px]' : ''}`} />
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden md:flex container h-14 items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 press-effect">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Tractor className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold text-foreground tracking-tight">Murimi Connect</span>
        </Link>

        <nav className="flex items-center gap-1">
          {[
            { to: '/marketplace', label: t('nav.marketplace') },
            ...(user && role === 'farmer' ? [
              { to: '/seller', label: 'Dashboard' },
              { to: '/sell', label: t('nav.sell') },
              { to: '/my-listings', label: t('nav.listings') },
            ] : []),
            ...(user && role === 'buyer' ? [
              { to: '/my-orders', label: t('nav.orders') },
              { to: '/hire-driver', label: 'Hire Driver' },
            ] : []),
            ...(user && role === 'driver' ? [
              { to: '/driver', label: 'Dashboard' },
            ] : []),
            { to: '/help', label: t('nav.help') },
          ].map(link => (
            <Link key={link.to} to={link.to} className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {user && <NotificationBell />}
          <Link to="/cart" className="relative p-2 hover:bg-muted rounded-xl transition-colors">
            <ShoppingCart className="h-5 w-5 text-muted-foreground" />
            {itemCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </Link>
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={profile?.avatar_url} alt={profile?.name} />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                      {getInitials(profile?.name)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 rounded-xl" align="end" forceMount>
                <div className="flex flex-col space-y-1 p-3">
                  <p className="text-sm font-semibold leading-none">{profile?.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  <p className="text-[10px] leading-none text-primary capitalize mt-1 font-medium">{role}</p>
                </div>
                <DropdownMenuSeparator />
                {role === 'farmer' && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link to="/seller" className="flex items-center"><BarChart3 className="mr-2 h-4 w-4" />Dashboard</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/my-listings" className="flex items-center"><Package className="mr-2 h-4 w-4" />{t('nav.listings')}</Link>
                    </DropdownMenuItem>
                  </>
                )}
                {role === 'buyer' && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link to="/my-orders" className="flex items-center"><ShoppingBasket className="mr-2 h-4 w-4" />{t('nav.orders')}</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/hire-driver" className="flex items-center"><Truck className="mr-2 h-4 w-4" />Hire Driver</Link>
                    </DropdownMenuItem>
                  </>
                )}
                {role === 'driver' && (
                  <DropdownMenuItem asChild>
                    <Link to="/driver" className="flex items-center"><Truck className="mr-2 h-4 w-4" />Dashboard</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link to="/wallet" className="flex items-center"><WalletIcon className="mr-2 h-4 w-4" />Wallet</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="flex items-center"><Settings className="mr-2 h-4 w-4" />{t('nav.settings')}</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/help" className="flex items-center"><HelpCircle className="mr-2 h-4 w-4" />{t('nav.help')}</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />{t('nav.signOut')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild className="rounded-xl"><Link to="/auth">{t('nav.signIn')}</Link></Button>
              <Button size="sm" asChild className="rounded-xl"><Link to="/auth?mode=signup">{t('nav.signUp')}</Link></Button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Slide-out Menu */}
      <div className={`md:hidden border-t border-border bg-card overflow-hidden transition-all duration-300 ease-in-out ${mobileMenuOpen ? 'max-h-[70vh] opacity-100' : 'max-h-0 opacity-0'}`}>
        <nav className="px-4 py-3 flex flex-col gap-0.5">
          {user && role === 'farmer' && (
            <>
              <Link to="/sell" className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors touch-target" onClick={() => setMobileMenuOpen(false)}>
                <Package className="h-5 w-5 text-primary" />
                <span className="font-medium text-sm">{t('nav.sell')}</span>
              </Link>
              <Link to="/my-listings" className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors touch-target" onClick={() => setMobileMenuOpen(false)}>
                <Tractor className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium text-sm">{t('nav.listings')}</span>
              </Link>
            </>
          )}
          {user && role === 'buyer' && (
            <>
              <Link to="/hire-driver" className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors touch-target" onClick={() => setMobileMenuOpen(false)}>
                <Truck className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium text-sm">Hire a Driver</span>
              </Link>
              <Link to="/my-driver-requests" className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors touch-target" onClick={() => setMobileMenuOpen(false)}>
                <Package className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium text-sm">My Driver Requests</span>
              </Link>
            </>
          )}
          <Link to="/help" className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors touch-target" onClick={() => setMobileMenuOpen(false)}>
            <HelpCircle className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium text-sm">{t('nav.help')}</span>
          </Link>
          <div className="border-t border-border my-1" />
          <button onClick={() => { handleSignOut(); setMobileMenuOpen(false); }} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors touch-target text-destructive">
            <LogOut className="h-5 w-5" />
            <span className="font-medium text-sm">{t('nav.signOut')}</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
