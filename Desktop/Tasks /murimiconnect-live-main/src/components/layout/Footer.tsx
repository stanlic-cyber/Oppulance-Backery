import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Tractor } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { SUPPORT_PHONE } from '@/lib/constants';

export const Footer = () => {
  const { t } = useLanguage();

  return (
    <footer className="bg-foreground text-background">
      <div className="container py-12">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Tractor className="h-6 w-6" />
              </div>
              <span className="text-xl font-bold">Murimi Connect</span>
            </div>
            <p className="text-sm text-background/70">
              Zimbabwe's trusted agricultural marketplace connecting farmers directly to buyers.
            </p>
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4" />
              <span>{SUPPORT_PHONE}</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="font-semibold">Quick Links</h3>
            <nav className="flex flex-col gap-2 text-sm text-background/70">
              <Link to="/marketplace" className="hover:text-background transition-colors">
                {t('nav.marketplace')}
              </Link>
              <Link to="/auth?mode=signup" className="hover:text-background transition-colors">
                {t('nav.signUp')}
              </Link>
              <Link to="/help" className="hover:text-background transition-colors">
                {t('nav.help')}
              </Link>
            </nav>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h3 className="font-semibold">{t('settings.legal')}</h3>
            <nav className="flex flex-col gap-2 text-sm text-background/70">
              <Link to="/privacy" className="hover:text-background transition-colors">
                {t('settings.privacy')}
              </Link>
              <Link to="/terms" className="hover:text-background transition-colors">
                {t('settings.terms')}
              </Link>
            </nav>
          </div>

          {/* Payment Notice */}
          <div className="space-y-4">
            <h3 className="font-semibold">Payment</h3>
            <p className="text-sm text-background/70">
              {t('payment.notice')}
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="px-2 py-1 bg-background/10 rounded">EcoCash</span>
              <span className="px-2 py-1 bg-background/10 rounded">OneMoney</span>
              <span className="px-2 py-1 bg-background/10 rounded">Bank Transfer</span>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-background/20 text-center text-sm text-background/50">
          <p>&copy; {new Date().getFullYear()} Murimi Connect. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};
