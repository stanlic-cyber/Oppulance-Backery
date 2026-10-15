import { useState, useEffect } from 'react';
import { X, Download, Smartphone, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAInstall } from '@/hooks/usePWAInstall';

export const InstallBanner = () => {
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const [isDismissed, setIsDismissed] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('pwa-banner-dismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      // Show again after 7 days
      if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) {
        setIsDismissed(true);
      }
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('pwa-banner-dismissed', Date.now().toString());
  };

  const handleInstall = async () => {
    const success = await promptInstall();
    if (success) {
      handleDismiss();
    }
  };

  // Don't show if already installed or dismissed
  if (isInstalled || isDismissed) return null;

  // Show iOS-specific instructions
  if (isIOS && !isInstallable) {
    return (
      <>
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground p-4 shadow-lg animate-slide-up">
          <div className="container flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-foreground/20">
                <Smartphone className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-sm">Install Murimi Connect</p>
                <p className="text-xs opacity-90">Add to your home screen for the best experience</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setShowIOSInstructions(true)}
                className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
              >
                <Share className="h-4 w-4 mr-1" />
                How to Install
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleDismiss}
                className="h-8 w-8 text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* iOS Instructions Modal */}
        {showIOSInstructions && (
          <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
            <div className="bg-card rounded-xl p-6 max-w-sm w-full shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg">Install on iOS</h3>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setShowIOSInstructions(false)}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <ol className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">1</span>
                  <span>Tap the <Share className="inline h-4 w-4 mx-1" /> Share button in Safari</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">2</span>
                  <span>Scroll down and tap <strong>"Add to Home Screen"</strong></span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">3</span>
                  <span>Tap <strong>"Add"</strong> to install</span>
                </li>
              </ol>
              <Button 
                className="w-full mt-4" 
                onClick={() => setShowIOSInstructions(false)}
              >
                Got it!
              </Button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Show standard install banner for Android/Desktop
  if (!isInstallable) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground p-4 shadow-lg animate-slide-up">
      <div className="container flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-foreground/20">
            <Download className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-sm">Install Murimi Connect</p>
            <p className="text-xs opacity-90">Quick access, works offline</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={handleInstall}
            className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
          >
            <Download className="h-4 w-4 mr-1" />
            Install
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={handleDismiss}
            className="h-8 w-8 text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
