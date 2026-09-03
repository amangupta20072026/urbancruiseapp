/*
 * ------------------------------------------------------------------
 * DriverLocationForegroundService
 * ------------------------------------------------------------------
 * Android foreground service that keeps the app process alive so
 * `react-native-geolocation-service`'s watchPosition() can deliver
 * location updates while the driver's phone is locked or the app is
 * backgrounded.
 *
 * This service does NOT itself fetch location fixes — the JS-side
 * DriverLocationService owns the watchPosition subscription. This
 * service exists purely to satisfy Android 14+'s requirement that
 * background location work happen inside a typed foreground service:
 *
 *   foregroundServiceType="location"   (AndroidManifest.xml)
 *   FOREGROUND_SERVICE_LOCATION perm   (AndroidManifest.xml)
 *   startForeground(...,
 *     ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION)   (below)
 *
 * Notification behavior:
 *   - IMPORTANCE_LOW so it doesn't heads-up.
 *   - Ongoing / non-dismissable while the FGS runs — Android policy.
 *   - Tapping the notification returns the user to MainActivity.
 *   - Icon is ic_launcher for now; production should ship a
 *     white-line status-bar icon (Android guidelines) — see TODO.
 *
 * Lifecycle:
 *   Started from JS via DriverLocationModule.startTracking().
 *   Stopped from JS via DriverLocationModule.stopTracking().
 *   Auto-restart on system kill is intentionally NOT enabled
 *   (START_NOT_STICKY) — a killed trip should be resumed by the
 *   driver deliberately, not silently by the OS.
 * ------------------------------------------------------------------
 */

package app.urbancruise.location

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import app.urbancruise.MainActivity
import app.urbancruise.R

class DriverLocationForegroundService : Service() {

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        ensureNotificationChannel()
        val notification = buildNotification()

        // Android 14 (API 34) mandates the type on startForeground()
        // for typed FGS. Passing the wrong type throws SecurityException.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(
                NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION,
            )
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }

        // NOT_STICKY: if the system kills us (memory pressure, OEM
        // battery optimisation), do NOT auto-restart. A driver trip
        // that dies mid-way must be resumed by the driver — otherwise
        // location tracking silently drops out without the trip
        // screen knowing.
        return START_NOT_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        // stopForeground with STOP_FOREGROUND_REMOVE clears the
        // notification. On API 24+ the OS may keep it around briefly
        // on some OEMs; that's acceptable — the driver knows tracking
        // has stopped from the trip screen state.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE)
        } else {
            @Suppress("DEPRECATION")
            stopForeground(true)
        }
    }

    /* -----------------------------------------------------------------
     * Notification plumbing
     * ----------------------------------------------------------------- */

    private fun ensureNotificationChannel() {
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (nm.getNotificationChannel(CHANNEL_ID) != null) return

        val channel = NotificationChannel(
            CHANNEL_ID,
            "Trip tracking",
            NotificationManager.IMPORTANCE_LOW,
        ).apply {
            description = "Shown while an Urban Cruise trip is in progress and location is being shared."
            setShowBadge(false)
            enableLights(false)
            enableVibration(false)
        }
        nm.createNotificationChannel(channel)
    }

    private fun buildNotification(): Notification {
        // Tapping the notification returns the user to the app,
        // reusing the existing MainActivity task rather than
        // launching a new one.
        val activityIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            activityIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )

        // TODO(design): replace R.mipmap.ic_launcher with a dedicated
        // white-line status-bar icon (Android guidelines) once design
        // ships one. The launcher icon works but may render as a solid
        // square on some system UIs.
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Trip in progress")
            .setContentText("Urban Cruise is sharing your location with dispatch and the customer.")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setContentIntent(pendingIntent)
            .setShowWhen(false)
            .build()
    }

    companion object {
        const val CHANNEL_ID = "driver_location_tracking"
        const val NOTIFICATION_ID = 4201

        fun start(context: Context) {
            val intent = Intent(context, DriverLocationForegroundService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stop(context: Context) {
            context.stopService(
                Intent(context, DriverLocationForegroundService::class.java),
            )
        }
    }
}