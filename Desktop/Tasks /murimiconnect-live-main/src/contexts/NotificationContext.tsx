import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

interface NotificationContextType {
  notifications: AppNotification[];
  loading: boolean;
  unreadCount: number;
  supported: boolean;
  permission: NotificationPermission;
  isEnabled: boolean;
  requestPermission: () => Promise<boolean>;
  showNotification: (title: string, options?: NotificationOptions) => void;
  refreshNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const getInitialPermission = (): NotificationPermission => {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'default';
  }

  return window.Notification.permission;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>(getInitialPermission);
  const permissionRef = useRef(permission);

  const setPermissionState = useCallback((nextPermission: NotificationPermission) => {
    permissionRef.current = nextPermission;
    setPermission(nextPermission);
  }, []);

  useEffect(() => {
    const nextSupported = typeof window !== 'undefined' && 'Notification' in window;
    setSupported(nextSupported);

    if (nextSupported) {
      setPermissionState(window.Notification.permission);
    }
  }, [setPermissionState]);

  const showNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (
      permissionRef.current !== 'granted' ||
      typeof window === 'undefined' ||
      !('Notification' in window)
    ) {
      return;
    }

    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SHOW_NOTIFICATION',
          title,
          options: {
            icon: '/pwa-192x192.png',
            badge: '/pwa-192x192.png',
            vibrate: [200, 100, 200],
            ...options,
          },
        });
      } else {
        new window.Notification(title, {
          icon: '/pwa-192x192.png',
          ...options,
        });
      }
    } catch (err) {
      console.error('Show notification error:', err);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!supported || typeof window === 'undefined' || !('Notification' in window)) {
      toast.error('Push notifications are not supported in this browser');
      return false;
    }

    try {
      const result = await window.Notification.requestPermission();
      setPermissionState(result);

      if (result === 'granted') {
        toast.success('Push notifications enabled!');
        return true;
      }

      if (result === 'denied') {
        toast.error('Notifications blocked. Enable them in browser settings.');
      }

      return false;
    } catch (err) {
      console.error('Notification permission error:', err);
      return false;
    }
  }, [setPermissionState, supported]);

  const refreshNotifications = useCallback(async () => {
    if (!userId) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setNotifications((data as AppNotification[]) || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase.channel(`notifications-${userId}`);

    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const notification = payload.new as AppNotification;

        setNotifications((prev) => {
          if (prev.some((item) => item.id === notification.id)) return prev;
          return [notification, ...prev].slice(0, 20);
        });

        showNotification(notification.title, {
          body: notification.message,
          tag: notification.id,
          data: { link: notification.link },
        });
      }
    );

    channel.subscribe((status, err) => {
      if (status === 'CHANNEL_ERROR') {
        console.error('Realtime notifications subscription error:', err);
      }
    });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [showNotification, userId]);

  const markAsRead = useCallback(async (notificationId: string) => {
    const readAt = new Date().toISOString();

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: readAt })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notificationId ? { ...notification, read_at: readAt } : notification
        )
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    const unreadIds = notifications
      .filter((notification) => !notification.read_at)
      .map((notification) => notification.id);

    if (unreadIds.length === 0) return;

    const readAt = new Date().toISOString();

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: readAt })
        .in('id', unreadIds);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((notification) => ({
          ...notification,
          read_at: notification.read_at || readAt,
        }))
      );
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
    }
  }, [notifications]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read_at).length,
    [notifications]
  );

  const value = useMemo(
    () => ({
      notifications,
      loading,
      unreadCount,
      supported,
      permission,
      isEnabled: permission === 'granted',
      requestPermission,
      showNotification,
      refreshNotifications,
      markAsRead,
      markAllAsRead,
    }),
    [
      notifications,
      loading,
      unreadCount,
      supported,
      permission,
      requestPermission,
      showNotification,
      refreshNotifications,
      markAsRead,
      markAllAsRead,
    ]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
