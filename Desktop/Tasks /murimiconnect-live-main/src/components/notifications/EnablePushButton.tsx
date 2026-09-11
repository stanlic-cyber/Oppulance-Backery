import { useEffect, useState } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { isPushSupported, subscribeToPush, unsubscribeFromPush, getPushPermission } from '@/lib/push';
import { toast } from 'sonner';

export const EnablePushButton = () => {
  const { user } = useAuth();
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSupported(isPushSupported());
    getPushPermission().then(setPermission);
  }, []);

  if (!supported || !user) return null;

  const enabled = permission === 'granted';

  const onClick = async () => {
    setBusy(true);
    try {
      if (enabled) {
        await unsubscribeFromPush();
        setPermission('default');
        toast.success('Notifications disabled');
      } else {
        const res = await subscribeToPush(user.id);
        if (res.ok) {
          setPermission('granted');
          toast.success('Notifications enabled');
        } else {
          toast.error(res.error || 'Could not enable notifications');
        }
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={onClick} disabled={busy}>
      {busy ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : enabled ? (
        <BellOff className="h-4 w-4 mr-2" />
      ) : (
        <Bell className="h-4 w-4 mr-2" />
      )}
      {enabled ? 'Disable notifications' : 'Enable push notifications'}
    </Button>
  );
};
