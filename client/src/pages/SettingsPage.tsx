import { useState, useEffect } from 'react';
import { useAppStore } from '../stores/appStore';
import { api } from '../lib/api';
import { Bell, Clock, Save, Info, BellOff } from 'lucide-react';
import clsx from 'clsx';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function SettingsPage() {
  const { profiles, activeProfileId, setProfiles } = useAppStore();
  const activeProfile = profiles.find(p => p.id === activeProfileId);

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [quietHoursStart, setQuietHoursStart] = useState(activeProfile?.quiet_hours_start || '');
  const [quietHoursEnd, setQuietHoursEnd] = useState(activeProfile?.quiet_hours_end || '');
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ text: '', type: '' });

  // Check if push subscription already exists in browser
  useEffect(() => {
    async function checkSubscription() {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setNotificationsEnabled(!!subscription);
      }
    }
    checkSubscription();
  }, [activeProfileId]);

  // Sync profile values when active profile changes
  useEffect(() => {
    if (activeProfile) {
      setQuietHoursStart(activeProfile.quiet_hours_start || '');
      setQuietHoursEnd(activeProfile.quiet_hours_end || '');
    }
  }, [activeProfile]);

  const VAPID_PUBLIC_KEY = "BDoJONd_OE63nFBzign-MHJesWU149LS-qTJ8pVsksy1eYpdUZ39MGTOvRerWdbEGfl_r3fhB7Asi6JPdBCnwLU";

  const toggleNotifications = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatusMessage({ text: 'Push notifications are not supported in this browser.', type: 'error' });
      return;
    }

    try {
      setSaving(true);
      const registration = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<ServiceWorkerRegistration>((_, reject) => 
          setTimeout(() => reject(new Error('Service Worker timeout: The script was likely blocked by Ngrok.')), 3000)
        )
      ]);

      if (notificationsEnabled) {
        // Unsubscribe
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
          
          await fetch('/api/push/unsubscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              profileId: activeProfileId,
              endpoint: subscription.endpoint,
            }),
          });
          
          setNotificationsEnabled(false);
          setStatusMessage({ text: 'Notifications disabled.', type: 'success' });
        }
      } else {
        // Subscribe
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          setStatusMessage({ text: 'Notification permission denied.', type: 'error' });
          setSaving(false);
          return;
        }

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });

        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            profileId: activeProfileId,
            subscription,
          }),
        });

        setNotificationsEnabled(true);
        setStatusMessage({ text: 'Notifications enabled!', type: 'success' });
      }
    } catch (err: any) {
      console.error('Failed to toggle notifications:', err);
      setStatusMessage({ text: 'Failed to update notifications.', type: 'error' });
    } finally {
      setSaving(false);
      setTimeout(() => setStatusMessage({ text: '', type: '' }), 3000);
    }
  };

  const handleSaveSettings = async () => {
    if (!activeProfileId) return;
    setSaving(true);
    
    try {
      const updatedProfile = await api.updateProfile(activeProfileId, {
        quiet_hours_start: quietHoursStart,
        quiet_hours_end: quietHoursEnd
      });
      
      setProfiles(profiles.map(p => p.id === activeProfileId ? updatedProfile : p));
      setStatusMessage({ text: 'Settings saved.', type: 'success' });
    } catch (error) {
      console.error('Failed to save settings:', error);
      setStatusMessage({ text: 'Failed to save settings.', type: 'error' });
    } finally {
      setSaving(false);
      setTimeout(() => setStatusMessage({ text: '', type: '' }), 3000);
    }
  };

  if (!activeProfile) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-24 md:pb-8 pt-4 md:pt-8 px-4 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage preferences for {activeProfile.name}
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Push Notifications Section */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div className="flex gap-3">
              <div className={clsx(
                "p-2 rounded-lg flex-shrink-0 mt-0.5",
                notificationsEnabled ? "bg-blue-50 text-blue-600" : "bg-gray-50 text-gray-400"
              )}>
                {notificationsEnabled ? <Bell size={20} /> : <BellOff size={20} />}
              </div>
              <div>
                <h3 className="text-base font-medium text-gray-900">Push Notifications</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Receive a reminder when you haven't logged time in a while, or when a timer has been running for over an hour.
                </p>
              </div>
            </div>
            
            <button
              onClick={toggleNotifications}
              disabled={saving}
              className={clsx(
                "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2",
                notificationsEnabled ? "bg-blue-600" : "bg-gray-200",
                saving && "opacity-50 cursor-not-allowed"
              )}
              role="switch"
              aria-checked={notificationsEnabled}
            >
              <span
                aria-hidden="true"
                className={clsx(
                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                  notificationsEnabled ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>
          
          <div className="mt-4 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 p-3 rounded-lg">
            <Info size={14} className="flex-shrink-0 mt-0.5" />
            <p>
              On iOS devices, you must add Pulse to your Home Screen first for Push Notifications to function.
            </p>
          </div>
        </div>

        {/* Quiet Hours Section */}
        <div className="p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg flex-shrink-0 mt-0.5">
              <Clock size={20} />
            </div>
            <div>
              <h3 className="text-base font-medium text-gray-900">Quiet Hours</h3>
              <p className="mt-1 text-sm text-gray-500">
                Pause all notifications during these hours.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 ml-12">
            <div>
              <label htmlFor="quiet-start" className="block text-sm font-medium text-gray-700 mb-1">
                From
              </label>
              <input
                type="time"
                id="quiet-start"
                value={quietHoursStart}
                onChange={(e) => setQuietHoursStart(e.target.value)}
                className="w-full text-base sm:text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3 border"
              />
            </div>
            <div>
              <label htmlFor="quiet-end" className="block text-sm font-medium text-gray-700 mb-1">
                To
              </label>
              <input
                type="time"
                id="quiet-end"
                value={quietHoursEnd}
                onChange={(e) => setQuietHoursEnd(e.target.value)}
                className="w-full text-base sm:text-sm border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2 px-3 border"
              />
            </div>
          </div>
        </div>
        
        {/* Actions Footer */}
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between">
          <span className={clsx(
            "text-sm transition-opacity duration-300",
            statusMessage.type === 'success' ? "text-green-600" : "text-red-600",
            statusMessage.text ? "opacity-100" : "opacity-0"
          )}>
            {statusMessage.text}
          </span>
          
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
