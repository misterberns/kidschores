/**
 * NotificationSettings - Manage push notification preferences
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bell, BellOff, Send, Loader2, Check, AlertCircle, Smartphone } from 'lucide-react';
import { kidsApi } from '../api/client';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useToast } from '../hooks/useToast';

export default function NotificationSettings() {
  const toast = useToast();
  const [selectedKid, setSelectedKid] = useState<string | null>(null);

  const {
    isSupported,
    isSubscribed,
    isLoading: pushLoading,
    permission,
    error: pushError,
    subscribe,
    unsubscribe,
    sendTest,
  } = usePushNotifications();

  // Fetch kids for kid-specific subscriptions
  const { data: kids } = useQuery({
    queryKey: ['kids'],
    queryFn: async () => {
      const res = await kidsApi.list();
      return res.data;
    },
  });

  // Handle subscribe
  const handleSubscribe = async () => {
    const success = await subscribe(selectedKid || undefined);
    if (success) {
      toast.success('Push notifications enabled!');
    } else {
      toast.error('Failed to enable push notifications');
    }
  };

  // Handle unsubscribe
  const handleUnsubscribe = async () => {
    const success = await unsubscribe();
    if (success) {
      toast.success('Push notifications disabled');
    } else {
      toast.error('Failed to disable push notifications');
    }
  };

  // Handle test notification
  const handleSendTest = async () => {
    const success = await sendTest();
    if (success) {
      toast.success('Test notification sent!');
    } else {
      toast.error('Failed to send test notification');
    }
  };

  // Render permission status
  const renderPermissionStatus = () => {
    if (!isSupported) {
      return (
        <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
          <AlertCircle size={20} />
          <span>Push notifications are not supported in this browser</span>
        </div>
      );
    }

    if (permission === 'denied') {
      return (
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <BellOff size={20} />
          <span>Notifications blocked. Please enable them in your browser settings.</span>
        </div>
      );
    }

    if (permission === 'granted' && isSubscribed) {
      return (
        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
          <Check size={20} />
          <span>Push notifications are enabled</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
        <Bell size={20} />
        <span>Push notifications are not enabled</span>
      </div>
    );
  };

  return (
    <div className="container max-w-2xl mx-auto p-4 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Bell className="w-8 h-8 text-primary-500" />
        <h1 className="text-2xl font-bold">Notification Settings</h1>
      </div>

      {/* Push Notification Status */}
      <div className="card p-6 space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Smartphone size={20} />
          Push Notifications
        </h2>

        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          {renderPermissionStatus()}
        </div>

        {pushError && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
            {pushError}
          </div>
        )}

        {/* Kid Selection for Kid-specific notifications */}
        {isSupported && !isSubscribed && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Subscribe as (optional):
            </label>
            <select
              value={selectedKid || ''}
              onChange={(e) => setSelectedKid(e.target.value || null)}
              className="input w-full"
            >
              <option value="">Parent (receive all notifications)</option>
              {kids?.map((kid) => (
                <option key={kid.id} value={kid.id}>
                  {kid.name} (receive only their notifications)
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          {isSupported && !isSubscribed && permission !== 'denied' && (
            <button
              onClick={handleSubscribe}
              disabled={pushLoading}
              className="btn btn-primary flex items-center gap-2"
            >
              {pushLoading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <Bell size={18} />
              )}
              Enable Push Notifications
            </button>
          )}

          {isSubscribed && (
            <>
              <button
                onClick={handleUnsubscribe}
                disabled={pushLoading}
                className="btn btn-secondary flex items-center gap-2"
              >
                {pushLoading ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <BellOff size={18} />
                )}
                Disable
              </button>

              <button
                onClick={handleSendTest}
                className="btn btn-outline flex items-center gap-2"
              >
                <Send size={18} />
                Send Test
              </button>
            </>
          )}
        </div>
      </div>

      {/* Information Card */}
      <div className="card p-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
          About Push Notifications
        </h3>
        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
          <li>Parents receive notifications when kids claim chores</li>
          <li>Kids receive notifications when their chores are approved</li>
          <li>Streak milestone celebrations are sent as notifications</li>
          <li>Daily reminders can be configured (coming soon)</li>
        </ul>
      </div>

      {/* How it works */}
      <div className="card p-6">
        <h3 className="font-semibold mb-3">How it works</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <div className="text-3xl mb-2">1</div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Click "Enable" to subscribe to notifications
            </p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <div className="text-3xl mb-2">2</div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Allow notifications when your browser asks
            </p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <div className="text-3xl mb-2">3</div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Receive instant updates about chores
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
