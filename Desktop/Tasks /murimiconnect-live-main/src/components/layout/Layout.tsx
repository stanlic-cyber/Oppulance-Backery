import { Header } from './Header';
import { Footer } from './Footer';
import { InstallBanner } from '@/components/pwa/InstallBanner';
import { OfflineBanner } from '@/components/pwa/OfflineBanner';
import { LockedAccountBanner } from '@/components/fees/LockedAccountBanner';
import { AIChatWidget } from '@/components/ai/AIChatWidget';
import BottomNav from './BottomNav';

interface LayoutProps {
  children: React.ReactNode;
  hideBottomNav?: boolean;
}

export const Layout = ({ children, hideBottomNav = false }: LayoutProps) => {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 pb-20 md:pb-0">
        <div className="container mx-auto px-4 pt-4">
          <LockedAccountBanner />
        </div>
        {children}
      </main>
      <div className="hidden md:block">
        <Footer />
      </div>
      {!hideBottomNav && <BottomNav />}
      <InstallBanner />
      <OfflineBanner />
      <AIChatWidget />
    </div>
  );
};
