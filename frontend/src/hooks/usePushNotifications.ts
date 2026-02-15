/**
 * Hook for managing push notification subscriptions.
 */
import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

interface PushSubscriptionState {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
  permission: NotificationPermission | null;
}

export function usePushNotifications() {
  const [state, setState] = useState<PushSubscriptionState>({
    isSupported: false,
    isSubscribed: false,
    isLoading: true,
    error: null,
    permission: null,
  });

  // Check if push notifications are supported
  const checkSupport = useCallback(() => {
    const isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
    const permission = 'Notification' in window ? Notification.permission : null;

    setState(prev => ({
      ...prev,
      isSupported,
      permission,
      isLoading: false,
    }));

    return isSupported;
  }, []);

  // Register service worker
  const registerServiceWorker = useCallback(async () => {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service workers not supported');
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('[Push] Service worker registered:', registration);
      return registration;
    } catch (error) {
      console.error('[Push] Service worker registration failed:', error);
      throw error;
    }
  }, []);

  // Get VAPID public key from server
  const getVapidKey = useCallback(async () => {
    try {
      const response = await api.get('/notifications/vapid-key');
      return response.data.public_key;
    } catch (error) {
      console.error('[Push] Failed to get VAPID key:', error);
      return null;
    }
  }, []);

  // Convert VAPID key to Uint8Array
  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  // Subscribe to push notifications
  const subscribe = useCallback(async (kidId?: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      setState(prev => ({ ...prev, permission }));

      if (permission !== 'granted') {
        throw new Error('Notification permission denied');
      }

      // Register service worker
      const registration = await registerServiceWorker();

      // Get VAPID key
      const vapidKey = await getVapidKey();
      if (!vapidKey) {
        throw new Error('Push notifications not configured on server');
      }

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      // Send subscription to server
      await api.post('/notifications/subscribe', {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!))),
          auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!))),
        },
        kid_id: kidId,
      });

      setState(prev => ({
        ...prev,
        isSubscribed: true,
        isLoading: false,
      }));

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to subscribe';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
      }));
      console.error('[Push] Subscribe error:', error);
      return false;
    }
  }, [registerServiceWorker, getVapidKey]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe from push manager
        await subscription.unsubscribe();

        // Remove subscription from server
        await api.delete('/notifications/unsubscribe', {
          params: { endpoint: subscription.endpoint },
        });
      }

      setState(prev => ({
        ...prev,
        isSubscribed: false,
        isLoading: false,
      }));

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to unsubscribe';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false,
      }));
      console.error('[Push] Unsubscribe error:', error);
      return false;
    }
  }, []);

  // Check if already subscribed
  const checkSubscription = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      setState(prev => ({
        ...prev,
        isSubscribed: !!subscription,
      }));
    } catch (error) {
      console.error('[Push] Check subscription error:', error);
    }
  }, []);

  // Send test notification
  const sendTest = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        throw new Error('Not subscribed to push notifications');
      }

      await api.post('/notifications/test', null, {
        params: { endpoint: subscription.endpoint },
      });

      return true;
    } catch (error) {
      console.error('[Push] Test notification error:', error);
      return false;
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    checkSupport();
    checkSubscription();
  }, [checkSupport, checkSubscription]);

  return {
    ...state,
    subscribe,
    unsubscribe,
    sendTest,
  };
}

export default usePushNotifications;
