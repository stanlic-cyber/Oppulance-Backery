import { supabase } from '@/integrations/supabase/client';

// Public VAPID key — safe to ship in the bundle.
// We fetch it from the server to avoid hardcoding.
let cachedPublicKey: string | null = null;

async function fetchPublicKey(): Promise<string | null> {
  if (cachedPublicKey) return cachedPublicKey;
  try {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/push-public-key`;
    const r = await fetch(url);
    if (!r.ok) return null;
    const json = await r.json();
    cachedPublicKey = json.key || null;
    return cachedPublicKey;
  } catch {
    return null;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export async function getPushPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) return 'denied';
  return Notification.permission;
}

export async function subscribeToPush(userId: string): Promise<{ ok: boolean; error?: string }> {
  if (!isPushSupported()) return { ok: false, error: 'Push not supported on this browser' };

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { ok: false, error: 'Permission denied' };

  const publicKey = await fetchPublicKey();
  if (!publicKey) return { ok: false, error: 'Push not configured on server' };

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;

    let sub = await registration.pushManager.getSubscription();
    if (!sub) {
      sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey).buffer as ArrayBuffer,
      });
    }

    const json = sub.toJSON();
    const endpoint = sub.endpoint;
    const p256dh = (json.keys && json.keys.p256dh) || '';
    const auth = (json.keys && json.keys.auth) || '';

    if (!p256dh || !auth) return { ok: false, error: 'Invalid subscription keys' };

    const { error } = await supabase
      .from('push_subscriptions')
      .upsert(
        [{ user_id: userId, endpoint, p256dh, auth, user_agent: navigator.userAgent }],
        { onConflict: 'endpoint' },
      );
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Subscription failed' };
  }
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!isPushSupported()) return;
  try {
    const registration = await navigator.serviceWorker.getRegistration('/sw.js');
    if (!registration) return;
    const sub = await registration.pushManager.getSubscription();
    if (sub) {
      const endpoint = sub.endpoint;
      await sub.unsubscribe();
      await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
    }
  } catch {
    // ignore
  }
}
