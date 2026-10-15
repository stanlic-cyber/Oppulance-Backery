import { Layout } from '@/components/layout/Layout';
import { HeroBanner } from '@/components/home/HeroBanner';
import { CategoryShortcuts } from '@/components/home/CategoryShortcuts';
import { QuickActions } from '@/components/home/QuickActions';
import { TrendingSection } from '@/components/home/TrendingSection';
import { RecentlyViewedSection } from '@/components/home/RecentlyViewedSection';
import { FeaturedVendors } from '@/components/home/FeaturedVendors';
import { DealsSection } from '@/components/home/DealsSection';
import { ProvinceGrid } from '@/components/home/ProvinceGrid';
import { SocialProof } from '@/components/home/SocialProof';
import { InstallPrompt } from '@/components/home/InstallPrompt';
import { CtaBanner } from '@/components/home/CtaBanner';
import { QRCodeCard } from '@/components/home/QRCodeCard';

const Index = () => {
  return (
    <Layout>
      <div className="max-w-lg mx-auto md:max-w-6xl">
        {/* Hero promotion banner */}
        <HeroBanner />

        {/* QR Code — share the app */}
        <QRCodeCard />

        {/* Quick role-based actions */}
        <QuickActions />

        {/* Category shortcuts */}
        <CategoryShortcuts />

        {/* Continue browsing */}
        <RecentlyViewedSection />

        {/* Trending products */}
        <TrendingSection />

        {/* Featured vendors */}
        <FeaturedVendors />

        {/* Special deals */}
        <DealsSection />

        {/* Social proof stats */}
        <SocialProof />

        {/* Shop by province */}
        <ProvinceGrid />

        {/* PWA install prompt */}
        <InstallPrompt />

        {/* Final CTA */}
        <CtaBanner />
      </div>
    </Layout>
  );
};

export default Index;
