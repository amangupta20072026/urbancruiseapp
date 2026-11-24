package app.urbancruise.callerid

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.graphics.Color
import android.os.Build
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import app.urbancruise.R

/**
 * The backup: a heads-up notification "Customer calling: Rahul Mehta".
 *
 * Used when the overlay card can't be drawn — the phone is locked (most
 * phones never draw overlays over the lock screen) or "Display over other
 * apps" is off. Product decision, 23 Nov 2026.
 *
 * Shown on the lock screen in full (VISIBILITY_PUBLIC): these are company
 * phones and the point is to see the name before unlocking. Removed after
 * TIMEOUT_MS so it doesn't linger in the shade.
 */
object CallerIdNotifier {

  private const val TAG = "UCCallerId"
  private const val CHANNEL_ID = "uc_caller_id"
  private const val NOTIFICATION_ID = 4801
  private const val TIMEOUT_MS = 60_000L

  /** src/theme/colors.ts primaryDark. */
  private val BRAND = Color.parseColor("#2E7D32")

  fun canNotify(context: Context): Boolean =
      NotificationManagerCompat.from(context).areNotificationsEnabled()

  fun show(context: Context, entry: CallerIdStore.Entry) {
    val app = context.applicationContext
    if (!canNotify(app)) return
    ensureChannel(app)

    val details = CallerIdText.details(entry)
    val notification =
        NotificationCompat.Builder(app, CHANNEL_ID)
            // White phone silhouette: a full-colour launcher icon shows as
            // a solid square in the status bar and notification header.
            .setSmallIcon(R.drawable.ic_stat_caller_id)
            // Brand green for the small icon and app name in the header.
            .setColor(BRAND)
            .setContentTitle("Customer calling: ${entry.name}")
            .apply { if (details != null) setContentText(details) }
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_STATUS)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setAutoCancel(true)
            .setOnlyAlertOnce(true)
            // The phone is already ringing: no second sound.
            .setSilent(true)
            .setTimeoutAfter(TIMEOUT_MS)
            .build()

    try {
      NotificationManagerCompat.from(app).notify(NOTIFICATION_ID, notification)
    } catch (e: SecurityException) {
      // POST_NOTIFICATIONS revoked between the check and now.
      Log.w(TAG, "Notification not shown", e)
    }
  }

  private fun ensureChannel(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val nm = context.getSystemService(NotificationManager::class.java) ?: return
    if (nm.getNotificationChannel(CHANNEL_ID) != null) return
    val channel =
        NotificationChannel(CHANNEL_ID, "Caller ID", NotificationManager.IMPORTANCE_HIGH).apply {
          description = "Shows which Urban Cruise customer is calling"
          lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
          setSound(null, null)
          enableVibration(false)
        }
    nm.createNotificationChannel(channel)
  }
}
