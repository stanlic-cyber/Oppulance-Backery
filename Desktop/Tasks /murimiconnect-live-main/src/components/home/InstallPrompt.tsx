import { Download, Smartphone, Zap } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export const InstallPrompt = () => {
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWAInstall();

  if (isInstalled) return null;

  return (
    <section className="px-4 mt-6">
      <div className="bg-gradient-to-br from-primary to-primary/70 rounded-2xl p-5 text-primary-foreground shadow-sm">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-primary-foreground/15 flex items-center justify-center flex-shrink-0">
            <Smartphone className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold mb-1">Get the App Experience</h3>
            <p className="text-xs text-primary-foreground/80 mb-3 leading-relaxed">
              Install Murimi Connect for faster access and push notifications.
            </p>
            {isInstallable ? (
              <Button
                onClick={promptInstall}
                size="sm"
                className="bg-card text-foreground hover:bg-card/90 h-9 text-xs font-semibold rounded-xl press-effect shadow-sm"
              >
                <Download className="h-3.5 w-3.5" />
                Install Now
              </Button>
            ) : (
              <Link to="/install">
                <Button
                  size="sm"
                  className="bg-card text-foreground hover:bg-card/90 h-9 text-xs font-semibold rounded-xl press-effect shadow-sm"
                >
                  <Download className="h-3.5 w-3.5" />
                  {isIOS ? 'How to Install' : 'Install Now'}
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
