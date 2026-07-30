package com.firstapp

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log

/**
 * BootReceiver — fires on BOOT_COMPLETED and QUICKBOOT_POWERON.
 *
 * Android wipes all AlarmManager alarms on every reboot. This receiver
 * listens for the boot-completed broadcast and starts the headless JS
 * service that reschedules all Notifee notification triggers.
 *
 * Works regardless of what time the phone restarts (5 AM, 6 AM, or any time).
 */
class BootReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return

        val isBoot = action == Intent.ACTION_BOOT_COMPLETED ||
                     action == "android.intent.action.QUICKBOOT_POWERON" ||
                     action == "com.htc.intent.action.QUICKBOOT_POWERON"

        if (!isBoot) return

        Log.d("KCP_BootReceiver", "Boot detected — starting notification reschedule service")

        val serviceIntent = Intent(context, RescheduleNotificationsService::class.java)

        // On Android O+ we must use startForegroundService for long-running background work,
        // but since this is a very short headless task we can use a regular start.
        // The service will finish as soon as the JS task completes.
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent)
            } else {
                context.startService(serviceIntent)
            }
        } catch (e: Exception) {
            Log.e("KCP_BootReceiver", "Failed to start reschedule service: ${e.message}")
        }
    }
}
