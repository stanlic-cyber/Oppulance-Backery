import { useState, useEffect, forwardRef } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

export const OfflineBanner = forwardRef<HTMLDivElement>((_, ref) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      setTimeout(() => setShowReconnected(false), 3000);
    };
    const goOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  if (isOnline && !showReconnected) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[100] px-4 py-2.5 text-center text-xs font-medium transition-all duration-300 ${
        isOnline
          ? 'bg-primary text-primary-foreground'
          : 'bg-destructive text-destructive-foreground'
      }`}
    >
      <div className="flex items-center justify-center gap-2">
        {isOnline ? (
          <>
            <Wifi className="h-3.5 w-3.5" />
            Back online
          </>
        ) : (
          <>
            <WifiOff className="h-3.5 w-3.5" />
            You are offline. Some features may be limited.
          </>
        )}
      </div>
    </div>
  );
});

OfflineBanner.displayName = 'OfflineBanner';
