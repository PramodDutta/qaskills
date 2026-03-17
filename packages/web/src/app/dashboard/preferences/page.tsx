'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, Mail, CheckCircle, AlertCircle } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';

export default function PreferencesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    weeklyDigest: true,
    newSkillAlerts: true,
    packAlerts: true,
  });

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const res = await fetch('/api/user/preferences');
      if (res.ok) {
        const data = await res.json();
        setPreferences({
          emailNotifications: data.emailNotifications,
          weeklyDigest: data.weeklyDigest,
          newSkillAlerts: data.newSkillAlerts,
          packAlerts: data.packAlerts,
        });
      }
    } catch (error) {
      console.error('Failed to fetch preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      });

      if (res.ok) {
        // Track preference update
        trackEvent('email_preferences_updated', {
          email_notifications: String(preferences.emailNotifications),
          weekly_digest: String(preferences.weeklyDigest),
          new_skill_alerts: String(preferences.newSkillAlerts),
          pack_alerts: String(preferences.packAlerts),
        });

        setMessage({
          type: 'success',
          text: 'Your email preferences have been updated successfully.',
        });
        setTimeout(() => setMessage(null), 5000);
      } else {
        throw new Error('Failed to save preferences');
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to save preferences. Please try again.',
      });
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  const togglePreference = (key: keyof typeof preferences) => {
    const newValue = !preferences[key];
    setPreferences((prev) => ({ ...prev, [key]: newValue }));

    // Track toggle
    trackEvent('preference_toggled', {
      preference: key,
      enabled: String(newValue),
    });
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Email Preferences</h1>
        <p className="mt-2 text-muted-foreground">
          Manage your email notification settings and subscriptions.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <CardTitle>Notification Settings</CardTitle>
          </div>
          <CardDescription>
            Choose which emails you'd like to receive from QASkills.sh
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Master toggle */}
          <div className="flex items-center justify-between pb-4 border-b">
            <div>
              <div className="font-medium">Email Notifications</div>
              <div className="text-sm text-muted-foreground">
                Master toggle for all email notifications
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={preferences.emailNotifications}
              onClick={() => togglePreference('emailNotifications')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                preferences.emailNotifications ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  preferences.emailNotifications ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Individual preferences */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Weekly Digest</div>
                <div className="text-sm text-muted-foreground">
                  Get a weekly summary of top QA skills every Monday
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={preferences.weeklyDigest}
                onClick={() => togglePreference('weeklyDigest')}
                disabled={!preferences.emailNotifications}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  preferences.weeklyDigest && preferences.emailNotifications
                    ? 'bg-primary'
                    : 'bg-muted'
                } ${!preferences.emailNotifications && 'opacity-50 cursor-not-allowed'}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    preferences.weeklyDigest ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">New Skill Alerts</div>
                <div className="text-sm text-muted-foreground">
                  Get notified when new QA skills are published
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={preferences.newSkillAlerts}
                onClick={() => togglePreference('newSkillAlerts')}
                disabled={!preferences.emailNotifications}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  preferences.newSkillAlerts && preferences.emailNotifications
                    ? 'bg-primary'
                    : 'bg-muted'
                } ${!preferences.emailNotifications && 'opacity-50 cursor-not-allowed'}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    preferences.newSkillAlerts ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Pack Release Alerts</div>
                <div className="text-sm text-muted-foreground">
                  Get notified when new skill packs are released
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={preferences.packAlerts}
                onClick={() => togglePreference('packAlerts')}
                disabled={!preferences.emailNotifications}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  preferences.packAlerts && preferences.emailNotifications
                    ? 'bg-primary'
                    : 'bg-muted'
                } ${!preferences.emailNotifications && 'opacity-50 cursor-not-allowed'}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    preferences.packAlerts ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {message && (
            <div
              className={`flex items-center gap-2 p-3 rounded-lg ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <span className="text-sm">{message.text}</span>
            </div>
          )}

          <div className="pt-4 border-t">
            <Button onClick={savePreferences} disabled={saving} className="w-full sm:w-auto">
              {saving ? 'Saving...' : 'Save Preferences'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            <CardTitle>Email Information</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            All emails include an unsubscribe link. You can opt out of specific email types above or
            unsubscribe from all emails at once using the link in any email footer.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
