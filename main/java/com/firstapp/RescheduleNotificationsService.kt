package com.firstapp

import android.content.Intent
import android.os.Bundle
import android.util.Log
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

/**
 * RescheduleNotificationsService — HeadlessJsTaskService bridge.
 *
 * When started by BootReceiver after a phone restart, this service spins up
 * a minimal React Native JS environment (no UI) and runs the registered
 * headless task "RescheduleNotifications" in index.js.
 *
 * The JS task calls NotificationService to reschedule all notification triggers
 * that were wiped by the Android reboot.
 *
 * Timeout: 10 seconds — more than enough to schedule local alarms.
 * allowedInForeground: true — allows this to run even if the app is open.
 */
class RescheduleNotificationsService : HeadlessJsTaskService() {

    override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig {
        Log.d("KCP_RescheduleService", "Headless task starting — rescheduling notifications")

        val extras: Bundle = intent?.extras ?: Bundle()
        return HeadlessJsTaskConfig(
            "RescheduleNotifications",  // Must match AppRegistry.registerHeadlessTask name in index.js
            Arguments.fromBundle(extras),
            10_000,  // 10 second timeout — more than enough for scheduling local alarms
            true     // allowedInForeground: safe to run even if app is already open
        )
    }
}
