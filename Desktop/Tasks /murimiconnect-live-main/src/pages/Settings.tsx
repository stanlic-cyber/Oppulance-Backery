import { Layout } from '@/components/layout/Layout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { languages, type Language } from '@/lib/i18n';
import { SUPPORT_PHONE } from '@/lib/constants';
import { Link } from 'react-router-dom';
import { User, Building, Bell, Globe, Shield, FileText, ChevronRight, Phone, LogOut, Download, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DeleteAccountDialog } from '@/components/settings/DeleteAccountDialog';
import { PageHeader } from '@/components/ui/page-transition';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { EnablePushButton } from '@/components/notifications/EnablePushButton';

const Settings = () => {
  const { t, language, setLanguage } = useLanguage();
  const { user, profile, role, signOut } = useAuth();
  const { isInstallable, isInstalled, promptInstall } = usePWAInstall();

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const settingsGroups = [
    {
      title: t('settings.account'),
      icon: User,
      items: [{ label: t('settings.profile'), to: '/settings/profile' }],
    },
    {
      title: t('settings.business'),
      icon: Building,
      items: [{ label: t('settings.farmDetails'), to: '/settings/profile' }],
    },
    {
      title: t('settings.notifications'),
      icon: Bell,
      items: [{ label: t('settings.pushNotifications'), to: '#' }],
    },
    {
      title: t('settings.security'),
      icon: Shield,
      items: [
        { label: 'Verify identity', to: '/settings/verify' },
        { label: t('settings.changePassword'), to: '/settings/password' },
      ],
    },
    {
      title: t('settings.legal'),
      icon: FileText,
      items: [
        { label: t('settings.privacy'), to: '/privacy' },
        { label: t('settings.terms'), to: '/terms' },
      ],
    },
  ];

  return (
    <Layout>
      <PageHeader title={t('nav.settings')} backTo="/" />

      <div className="bg-muted/30 min-h-screen pb-24 md:pb-8">
        <div className="container max-w-2xl py-4">
          {/* Profile Card */}
          {user && profile && (
            <Link to="/settings/profile" className="block bg-card rounded-2xl p-4 mb-4 border border-border shadow-sm press-effect">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={profile.avatar_url || undefined} alt={profile.name} />
                  <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                    {getInitials(profile.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{profile.name}</p>
                  <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                  <p className="text-xs text-primary capitalize font-medium mt-0.5">{role}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              </div>
            </Link>
          )}

          {/* Language */}
          <div className="bg-card rounded-2xl p-4 mb-4 border border-border shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center">
                  <Globe className="h-4.5 w-4.5 text-muted-foreground" />
                </div>
                <span className="font-medium text-sm">{t('settings.language')}</span>
              </div>
              <Select value={language} onValueChange={(value) => setLanguage(value as Language)}>
                <SelectTrigger className="w-36 h-9 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languages.map(lang => (
                    <SelectItem key={lang.code} value={lang.code}>{lang.nativeName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Settings Groups */}
          {settingsGroups.map(group => (
            <div key={group.title} className="bg-card rounded-2xl mb-3 overflow-hidden border border-border shadow-sm">
              <div className="px-4 py-3 border-b border-border flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                  <group.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <span className="font-medium text-sm">{group.title}</span>
              </div>
              {group.items.map(item => (
                <Link
                  key={item.label}
                  to={item.to}
                  className="flex items-center justify-between px-4 py-3.5 hover:bg-muted/50 transition-colors press-effect touch-target"
                >
                  <span className="text-sm">{item.label}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          ))}

          {/* Install App */}
          {!isInstalled && (
            <div className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-4 mb-4 text-primary-foreground shadow-sm">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary-foreground/15 flex items-center justify-center flex-shrink-0">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">Install Murimi Connect</p>
                  <p className="text-xs opacity-80 mt-0.5">Get faster access & push notifications</p>
                </div>
                {isInstallable ? (
                  <Button size="sm" onClick={promptInstall} className="bg-card text-foreground hover:bg-card/90 rounded-xl text-xs font-semibold">
                    <Download className="h-3.5 w-3.5" />
                    Install
                  </Button>
                ) : (
                  <Link to="/install">
                    <Button size="sm" className="bg-card text-foreground hover:bg-card/90 rounded-xl text-xs font-semibold">
                      <Download className="h-3.5 w-3.5" />
                      How to
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Push Notifications */}
          <div className="bg-card rounded-2xl p-4 mb-4 border border-border shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                  <Bell className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">Push Notifications</p>
                  <p className="text-xs text-muted-foreground truncate">Order updates, messages & alerts</p>
                </div>
              </div>
              <EnablePushButton />
            </div>
          </div>

          {/* Support */}
          <div className="bg-card rounded-2xl p-4 mb-4 border border-border shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center">
                <Phone className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">{t('support.phone')}</p>
                <p className="text-sm text-primary font-semibold">{SUPPORT_PHONE}</p>
              </div>
            </div>
          </div>

          {/* Sign Out & Delete */}
          {user && (
            <div className="space-y-3 mt-6">
              <Button variant="outline" className="w-full rounded-xl" onClick={signOut}>
                <LogOut className="h-4 w-4 mr-2" />
                {t('nav.signOut')}
              </Button>
              <DeleteAccountDialog />
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Settings;
