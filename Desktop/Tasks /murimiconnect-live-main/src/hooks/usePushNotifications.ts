import { useNotifications } from '@/contexts/NotificationContext';

export const usePushNotifications = () => {
  const { supported, permission, requestPermission, showNotification, isEnabled } = useNotifications();

  return {
    supported,
    permission,
    requestPermission,
    showNotification,
    isEnabled,
  };
};
