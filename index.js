/**
 * @format
 */

import { AppRegistry } from 'react-native';
import { enableScreens } from 'react-native-screens';
import notifee from '@notifee/react-native';
import './src/i18n'; // Initialize i18next
import App from './App';
import { name as appName } from './app.json';
import NotificationService from './src/services/NotificationService';

// Required for background notifications/triggers to work on Android when app is killed
notifee.onBackgroundEvent(async ({ type, detail }) => {
  // Optional: handle background interactions here
});

// ─── Boot Reschedule Headless Task ───────────────────────────────────────────
// Runs after every phone restart (fired by BootReceiver.kt via
// RescheduleNotificationsService.kt). Android wipes all AlarmManager alarms
// on reboot — this headless task runs silently (no UI) and reschedules
// all Notifee notification triggers so users still receive their reminders
// regardless of what time their phone restarts.
AppRegistry.registerHeadlessTask('RescheduleNotifications', () => async () => {
  try {
    await NotificationService.init();            // Ensure channels exist
    await NotificationService.scheduleRecurringNudges(1); // Reschedule daily + streak reminders
    await NotificationService.scheduleInactivityReminders(); // Reschedule 7-day + 14-day reminders
  } catch (e) {
    // Silently swallow errors — a notification not rescheduling is better than a crash
  }
});

enableScreens();

AppRegistry.registerComponent(appName, () => App);

