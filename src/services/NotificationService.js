import notifee, {
  AuthorizationStatus,
  TriggerType,
  RepeatFrequency,
  AndroidImportance,
  AndroidVisibility,
} from '@notifee/react-native';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Notification IDs ────────────────────────────────────────────────────────
// Fixed IDs mean cancelling + rescheduling is always idempotent.
const IDS = {
  DAILY_REMINDER:       'kcp_daily_reminder',
  STREAK_ALERT:         'kcp_streak_alert',
  INACTIVITY_7:         'kcp_inactivity_7',
  INACTIVITY_14:        'kcp_inactivity_14',
};

// ─── AsyncStorage keys ───────────────────────────────────────────────────────
// We track when each scheduled notification is set to fire so we can detect
// "missed" triggers (e.g., phone offline all night with WiFi/data off).
const KEYS = {
  LAST_SCHEDULED_DAILY:  'kcp_last_sched_daily',
  LAST_SCHEDULED_STREAK: 'kcp_last_sched_streak',
};

// ─── Channels ────────────────────────────────────────────────────────────────
const CHANNELS = {
  reminders:    {
    id: 'kcp_reminders',
    name: 'Daily Reminders',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
    lights: true,
  },
  streak:       {
    id: 'kcp_streak',
    name: 'Streak Alerts',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
    lights: true,
  },
  reports:      {
    id: 'kcp_reports',
    name: 'Report Updates',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
  },
  achievements: {
    id: 'kcp_achievements',
    name: 'Achievements & Badges',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
  },
  inactivity:   {
    id: 'kcp_inactivity',
    name: 'Inactivity Reminders',
    importance: AndroidImportance.DEFAULT,
    sound: 'default',
  },
  default:      {
    id: 'kcp_default',
    name: 'General',
    importance: AndroidImportance.DEFAULT,
    sound: 'default',
  },
};

// ─── Streak-day-specific messages (shown the NEXT day at 2 PM) ───────────────
// The message corresponds to what day the user is ON (i.e. what they'll claim
// when they open). Cycle wraps after 7 so long-running streaks stay relevant.
const STREAK_MSGS = [
  { title: '🔥 Your Streak is Alive!',    body: 'Keep going! Open KCP TODAY to claim your 50 points and reach Day 2.' },
  { title: '⚡ Keep the Momentum!',       body: 'Great start! Claim your 75 points TODAY. Don\'t break the chain!' },
  { title: '💪 You\'re on a Roll!',       body: 'Doing great! Your 100 points are waiting. Open KCP to claim them.' },
  { title: '🌟 Getting Stronger!',        body: 'Almost there! Claim your 125 points TODAY — keep Karachi clean!' },
  { title: '🏅 5 Days Strong!',           body: 'Incredible! Just 2 more days for the grand prize. Claim 150 points TODAY!' },
  { title: '⚠️ Day 7 is TODAY!',          body: 'Don\'t miss it! Claim 200 points TODAY to complete your 7-day streak!' },
  { title: '🎉 Start a New Streak!',      body: 'You completed your 7-day streak! Start a fresh week TODAY for more points.' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Build a trigger Date in PKT (UTC+5) for the given hour/minute.
 *
 * Logic:
 *   • If daysOffset === 0: schedule for LATER TODAY at that hour.
 *     If the target hour has already passed today, shift to tomorrow.
 *   • If daysOffset > 0: always shift forward by that many days from TODAY.
 *
 * Clamps to quiet hours (8 AM – 9 PM PKT).
 */
function buildTriggerTime(karachiHour, minute = 0, daysOffset = 1) {
  // 1. Get current time in UTC
  const now = new Date();

  // 2. Get current PKT time parts (UTC+5)
  const PKT_OFFSET_MS = 5 * 60 * 60 * 1000;
  const pktNow = new Date(now.getTime() + PKT_OFFSET_MS);

  const year  = pktNow.getUTCFullYear();
  const month = pktNow.getUTCMonth();
  let   date  = pktNow.getUTCDate();

  // 3. Clamp target hour to quiet hours (8 AM – 9 PM PKT)
  const safeHourPKT = Math.min(Math.max(karachiHour, 8), 21);

  // 4. Determine final date
  if (daysOffset === 0) {
    // Same day — but only if the target time hasn't passed yet
    const targetMs = Date.UTC(year, month, date, safeHourPKT - 5, minute, 0, 0);
    if (targetMs <= now.getTime()) {
      // Target passed today → push to tomorrow
      date += 1;
    }
    // else: fire later today — keep date as-is
  } else {
    date += daysOffset;
  }

  // 5. Convert PKT target to UTC (subtract 5 hours)
  const targetUtcMs = Date.UTC(year, month, date, safeHourPKT - 5, minute, 0, 0);
  return new Date(targetUtcMs);
}

// Prevent double-scheduling if two loadData calls race within the same second
let _schedulingInProgress = false;

class NotificationService {

  // ── Create all channels (idempotent — safe to call on every app open) ───────
  async init() {
    if (Platform.OS !== 'android') return;
    await Promise.all(
      Object.values(CHANNELS).map(ch =>
        notifee.createChannel({
          id:         ch.id,
          name:       ch.name,
          importance: ch.importance,
          visibility: AndroidVisibility.PUBLIC,
          // Sound, vibration & lights ensure Android classifies the channel as
          // genuinely high-priority and won't suppress it in battery-saving modes.
          sound:      ch.sound     ?? undefined,
          vibration:  ch.vibration ?? false,
          lights:     ch.lights    ?? false,
        })
      )
    );
  }

  // ── Request OS permission (called ONCE after tutorial, never again) ──────────
  async requestPermission() {
    const settings = await notifee.requestPermission();
    return settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED;
  }

  // ── Check current permission status ─────────────────────────────────────────
  async hasPermission() {
    try {
      const settings = await notifee.getNotificationSettings();
      return settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED;
    } catch {
      return false;
    }
  }

  // ── Cancel today's daily nudges (call immediately on every app open) ─────────
  async cancelTodayNudges() {
    try {
      await notifee.cancelTriggerNotification(IDS.DAILY_REMINDER);
      await notifee.cancelTriggerNotification(IDS.STREAK_ALERT);
    } catch {}
  }

  // ── Daily login reminder — fires at 10:00 AM tomorrow ────────────────────────
  //
  // Uses daysOffset=1 so it always targets tomorrow at 10 AM PKT.
  // On every app open: cancelTodayNudges() kills today's pending fire, THEN
  // this reschedules for tomorrow — active users never see it.
  // Users who stop opening get one reminder at 10 AM the next day.
  //
  // NOTE: We no longer use RepeatFrequency.DAILY because a repeating alarm
  // whose first fire-time has passed silently is NOT retroactively re-queued
  // by AlarmManager — the repeat breaks. Instead we treat it as a one-shot
  // that is refreshed on every app open. The BootReceiver reschedules after
  // phone restarts (which would wipe AlarmManager alarms).
  async scheduleDailyLoginReminder() {
    if (!(await this.hasPermission())) return;
    try {
      await notifee.cancelTriggerNotification(IDS.DAILY_REMINDER);
      const d = buildTriggerTime(10, 0, 1); // 10:00 AM tomorrow PKT
      await AsyncStorage.setItem(KEYS.LAST_SCHEDULED_DAILY, d.getTime().toString());
      await notifee.createTriggerNotification(
        {
          id: IDS.DAILY_REMINDER,
          title: '🌟 Your Daily Points Are Waiting!',
          body: 'Open KCP to claim your daily streak reward and keep Karachi clean!',
          android: {
            channelId:   CHANNELS.reminders.id,
            pressAction: { id: 'default' },
            importance:  AndroidImportance.HIGH,
          },
        },
        {
          type:      TriggerType.TIMESTAMP,
          timestamp: d.getTime(),
          // ONE-SHOT: refreshed on each app open. No repeatFrequency to avoid
          // the silent-expiry bug when the phone is offline/Doze at fire time.
          alarmManager: {
            allowWhileIdle: true,
            // setExactAndAllowWhileIdle bypasses Doze mode scheduling restrictions
            // (equivalent to the Android API of the same name).
            type: 'setExactAndAllowWhileIdle',
          },
        }
      );
    } catch (e) {
      console.warn('[Notif] scheduleDailyLoginReminder:', e?.message);
    }
  }

  // ── Streak alert — ONE-SHOT at 2:00 PM next day with day-specific message ────
  async scheduleStreakAlert(currentDay) {
    if (!(await this.hasPermission())) return;
    try {
      await notifee.cancelTriggerNotification(IDS.STREAK_ALERT);
      const day    = typeof currentDay === 'number' && currentDay >= 1 ? currentDay : 1;
      const msgIdx = (day - 1) % STREAK_MSGS.length;
      const msg    = STREAK_MSGS[msgIdx];
      const d      = buildTriggerTime(14, 0, 1); // 2:00 PM tomorrow PKT
      await AsyncStorage.setItem(KEYS.LAST_SCHEDULED_STREAK, d.getTime().toString());
      await notifee.createTriggerNotification(
        {
          id: IDS.STREAK_ALERT,
          title: msg.title,
          body:  msg.body,
          android: {
            channelId:   CHANNELS.streak.id,
            pressAction: { id: 'default' },
            importance:  AndroidImportance.HIGH,
          },
        },
        {
          type:      TriggerType.TIMESTAMP,
          timestamp: d.getTime(),
          alarmManager: {
            allowWhileIdle: true,
            type: 'setExactAndAllowWhileIdle',
          },
        }
      );
    } catch (e) {
      console.warn('[Notif] scheduleStreakAlert:', e?.message);
    }
  }

  // ── Schedule BOTH recurring nudges atomically (called on every app open) ─────
  async scheduleRecurringNudges(streakDay) {
    if (_schedulingInProgress) return;
    _schedulingInProgress = true;
    try {
      await this.scheduleDailyLoginReminder();
      await this.scheduleStreakAlert(streakDay);
    } finally {
      setTimeout(() => { _schedulingInProgress = false; }, 500);
    }
  }

  // ── Inactivity reminders — 7-day and 14-day backstop ────────────────────────
  async scheduleInactivityReminders() {
    if (!(await this.hasPermission())) return;
    try {
      // 7-day: gentle nudge
      await notifee.cancelTriggerNotification(IDS.INACTIVITY_7);
      const d7 = buildTriggerTime(11, 0, 7); // 11:00 AM, 7 days from now
      await notifee.createTriggerNotification(
        {
          id: IDS.INACTIVITY_7,
          title: '👋 We Miss You in Karachi!',
          body: "It's been a week since your last report. Your community still needs you!",
          android: {
            channelId:   CHANNELS.inactivity.id,
            pressAction: { id: 'default' },
          },
        },
        {
          type:      TriggerType.TIMESTAMP,
          timestamp: d7.getTime(),
          alarmManager: {
            allowWhileIdle: true,
            type: 'setExactAndAllowWhileIdle',
          },
        }
      );

      // 14-day: stronger re-engagement
      await notifee.cancelTriggerNotification(IDS.INACTIVITY_14);
      const d14 = buildTriggerTime(10, 30, 14); // 10:30 AM, 14 days from now
      await notifee.createTriggerNotification(
        {
          id: IDS.INACTIVITY_14,
          title: '🏙️ Karachi Needs You!',
          body: "Two weeks without a report — issues are piling up. Come back and make a difference!",
          android: {
            channelId:   CHANNELS.inactivity.id,
            pressAction: { id: 'default' },
          },
        },
        {
          type:      TriggerType.TIMESTAMP,
          timestamp: d14.getTime(),
          alarmManager: {
            allowWhileIdle: true,
            type: 'setExactAndAllowWhileIdle',
          },
        }
      );
    } catch (e) {
      console.warn('[Notif] scheduleInactivityReminders:', e?.message);
    }
  }

  // ── Cancel all inactivity reminders (call on app open) ──────────────────────
  async cancelInactivityReminders() {
    try {
      await notifee.cancelTriggerNotification(IDS.INACTIVITY_7);
      await notifee.cancelTriggerNotification(IDS.INACTIVITY_14);
    } catch {}
  }

  // ─── LEGACY COMPAT: kept so existing call-sites don't break ─────────────────
  async cancelInactivityReminder()  { return this.cancelInactivityReminders(); }
  async scheduleInactivityReminder() { return this.scheduleInactivityReminders(); }

  // ── Missed notification detection ─────────────────────────────────────────────
  //
  // Call this on app open or when connectivity is restored.
  // Returns { missed: boolean, type: 'daily'|'streak'|null }.
  //
  // When the phone was offline (WiFi+data off) at the scheduled fire time,
  // Android's Doze mode may suppress the AlarmManager trigger — the timestamp
  // expires silently. This detects that situation by comparing the saved
  // scheduled timestamp against the current time.
  async checkMissedNotification() {
    try {
      const [dailyStr, streakStr] = await Promise.all([
        AsyncStorage.getItem(KEYS.LAST_SCHEDULED_DAILY),
        AsyncStorage.getItem(KEYS.LAST_SCHEDULED_STREAK),
      ]);
      const now = Date.now();

      if (dailyStr) {
        const scheduledAt = parseInt(dailyStr, 10);
        // Treat as missed if the fire time was between 2 minutes and 20 hours ago
        // (2-min buffer avoids false positives from near-immediate cancellation).
        const minsAgo = (now - scheduledAt) / 60000;
        if (minsAgo > 2 && minsAgo < 1200) {
          // The daily reminder was supposed to fire but we're just opening now.
          // Clear the stored time so we don't re-trigger it again.
          await AsyncStorage.removeItem(KEYS.LAST_SCHEDULED_DAILY);
          return { missed: true, type: 'daily' };
        }
      }

      if (streakStr) {
        const scheduledAt = parseInt(streakStr, 10);
        const minsAgo = (now - scheduledAt) / 60000;
        if (minsAgo > 2 && minsAgo < 1200) {
          await AsyncStorage.removeItem(KEYS.LAST_SCHEDULED_STREAK);
          return { missed: true, type: 'streak' };
        }
      }
    } catch {}
    return { missed: false, type: null };
  }

  // ── Instant: someone verified the user's report ──────────────────────────────
  async showReportVerifiedNotification(location, verifiedCount) {
    if (!(await this.hasPermission())) return;
    try {
      await notifee.displayNotification({
        title: '✅ Your Report Got Verified!',
        body: `Your report at ${location} was verified by ${verifiedCount} citizen${verifiedCount !== 1 ? 's' : ''}. Keep it up!`,
        android: {
          channelId:   CHANNELS.reports.id,
          pressAction: { id: 'default' },
          importance:  AndroidImportance.HIGH,
        },
      });
    } catch (e) {
      console.warn('[Notif] showReportVerifiedNotification:', e?.message);
    }
  }

  // ── Instant: Badge Unlocked ──────────────────────────────────────────────────
  async showBadgeUnlockedNotification(badgeName, badgeDesc, language) {
    if (!(await this.hasPermission())) return;
    try {
      let title, body;
      if (language === 'ur') {
        title = `نئی کامیابی: ${badgeName}`;
        body  = badgeDesc;
      } else if (language === 'ru') {
        title = `Nayi Kamyabi: ${badgeName}`;
        body  = badgeDesc;
      } else {
        title = `🏅 Achievement Unlocked: ${badgeName}`;
        body  = badgeDesc;
      }
      await notifee.displayNotification({
        title,
        body,
        android: {
          channelId:   CHANNELS.achievements.id,
          pressAction: { id: 'default' },
          importance:  AndroidImportance.HIGH,
        },
      });
    } catch (e) {
      console.warn('[Notif] showBadgeUnlockedNotification:', e?.message);
    }
  }

  // ── Instant: Community Goal Reached ─────────────────────────────────────────
  async showCommunityGoalReachedNotification(area, taskName) {
    if (!(await this.hasPermission())) return;
    try {
      await notifee.displayNotification({
        title: '🎉 Community Goal Reached!',
        body: `Congratulations! ${area} has completed: ${taskName}. Thank you for contributing!`,
        android: {
          channelId:   CHANNELS.reports.id,
          pressAction: { id: 'default' },
          importance:  AndroidImportance.HIGH,
        },
      });
    } catch (e) {
      console.warn('[Notif] showCommunityGoalReachedNotification:', e?.message);
    }
  }

  // ── Instant: Missed notification fallback ────────────────────────────────────
  // Fired when we detect a scheduled notification was missed (e.g. phone
  // offline all night). Shows the notification immediately now that the user
  // is active / connectivity is restored.
  async showMissedDailyReminder() {
    if (!(await this.hasPermission())) return;
    try {
      await notifee.displayNotification({
        title: '🌟 Your Daily Points Are Waiting!',
        body: 'Open KCP to claim your daily streak reward and keep Karachi clean!',
        android: {
          channelId:   CHANNELS.reminders.id,
          pressAction: { id: 'default' },
          importance:  AndroidImportance.HIGH,
        },
      });
    } catch (e) {
      console.warn('[Notif] showMissedDailyReminder:', e?.message);
    }
  }

  async showMissedStreakAlert(currentDay) {
    if (!(await this.hasPermission())) return;
    try {
      const day    = typeof currentDay === 'number' && currentDay >= 1 ? currentDay : 1;
      const msgIdx = (day - 1) % STREAK_MSGS.length;
      const msg    = STREAK_MSGS[msgIdx];
      await notifee.displayNotification({
        title: msg.title,
        body:  msg.body,
        android: {
          channelId:   CHANNELS.streak.id,
          pressAction: { id: 'default' },
          importance:  AndroidImportance.HIGH,
        },
      });
    } catch (e) {
      console.warn('[Notif] showMissedStreakAlert:', e?.message);
    }
  }

  // ── Test notification (Settings screen) ─────────────────────────────────────
  async showTestNotification(language) {
    let hasPerm = await this.hasPermission();
    if (!hasPerm) {
      hasPerm = await this.requestPermission();
    }
    if (!hasPerm) return;

    const hour = new Date().getHours();
    let timeOfDay_en, timeOfDay_ur, timeOfDay_ru;
    if (hour < 12) {
      timeOfDay_en = 'morning';   timeOfDay_ur = 'صبح';  timeOfDay_ru = 'subah';
    } else if (hour < 17) {
      timeOfDay_en = 'afternoon'; timeOfDay_ur = 'دوپہر'; timeOfDay_ru = 'dopahar';
    } else if (hour < 20) {
      timeOfDay_en = 'evening';   timeOfDay_ur = 'شام';  timeOfDay_ru = 'shaam';
    } else {
      timeOfDay_en = 'night';     timeOfDay_ur = 'رات';  timeOfDay_ru = 'raat';
    }

    let title, body;
    if (language === 'ur') {
      title = 'ٹیسٹ نوٹیفیکیشن';
      body  = `یہ ایک ٹیسٹ ہے۔ (وقت: ${timeOfDay_ur})`;
    } else if (language === 'ru') {
      title = 'Test Notification';
      body  = `Yeh ek test notification hai jo ${timeOfDay_ru} mein mili.`;
    } else {
      title = 'Test Notification ✅';
      body  = `Notifications are working! Received in the ${timeOfDay_en}.`;
    }

    try {
      await notifee.displayNotification({
        title,
        body,
        android: {
          channelId:   CHANNELS.default.id,
          pressAction: { id: 'default' },
          importance:  AndroidImportance.HIGH,
        },
      });
    } catch (e) {
      console.warn('[Notif] showTestNotification:', e?.message);
    }
  }

  // ── Cancel ALL scheduled notifications (on logout) ──────────────────────────
  async cancelAll() {
    try {
      await notifee.cancelAllNotifications();
      await AsyncStorage.multiRemove([KEYS.LAST_SCHEDULED_DAILY, KEYS.LAST_SCHEDULED_STREAK]);
    } catch {}
  }
}

export default new NotificationService();
