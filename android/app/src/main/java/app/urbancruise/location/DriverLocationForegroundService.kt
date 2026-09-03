/*
 * ---------------------------------------------------------------------------
 * DriverLocationForegroundService
 * ---------------------------------------------------------------------------
 *
 * Purpose:
 *   Keeps the Urban Cruise driver app in Android's foreground-service state
 *   while an active trip is sharing the driver's location.
 *
 * Important:
 *   This service does NOT obtain location fixes.
 *
 *   Location ownership remains in JS / react-native-geolocation-service.
 *   This service exists to keep the application eligible to perform the
 *   long-running location work while the app is backgrounded/locked.
 *
 * Lifecycle:
 *
 *   DriverLocationModule.startTracking()
 *            |
 *            v
 *   DriverLocationForegroundService.start()
 *            |
 *            v
 *   startForegroundService()
 *            |
 *            v
 *   onStartCommand()
 *            |
 *            v
 *   ServiceCompat.startForeground()
 *
 *
 * Stop:
 *
 *   DriverLocationModule.stopTracking()
 *            |
 *            +--> stop JS watchPosition()
 *            |
 *            +--> DriverLocationForegroundService.stop()
 *                         |
 *                         v
 *                    stopService()
 *                         |
 *                         v
 *                    service destroyed
 *                         |
 *                         v
 *                    onDestroy()
 *
 * The service also accepts ACTION_STOP so an explicit stop command can be
 * delivered to an already-running service. That path removes the foreground
 * state immediately and then stops the service.
 *
 * ---------------------------------------------------------------------------
 */

package app.urbancruise.location

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import app.urbancruise.MainActivity
import app.urbancruise.R

class DriverLocationForegroundService : Service() {

    override fun onBind(intent: Intent?): IBinder? {
        // This is a started service, not a bound service.
        return null
    }

    override fun onStartCommand(
        intent: Intent?,
        flags: Int,
        startId: Int,
    ): Int {

        /*
         * -------------------------------------------------------------------
         * Explicit STOP command
         * -------------------------------------------------------------------
         *
         * Do this BEFORE notification creation/startForeground().
         *
         * This prevents a stop command from accidentally recreating or
         * refreshing the foreground notification.
         */
        if (intent?.action == ACTION_STOP) {
            stopForegroundAndSelf()
            return START_NOT_STICKY
        }

        /*
         * -------------------------------------------------------------------
         * Normal START path
         * -------------------------------------------------------------------
         */

        ensureNotificationChannel()

        val notification = buildNotification()

        /*
         * ServiceCompat is the AndroidX compatibility API recommended for
         * foreground-service promotion.
         *
         * LOCATION is declared in AndroidManifest.xml and is required for
         * this service's use case on Android 14+.
         */
        ServiceCompat.startForeground(
            this,
            NOTIFICATION_ID,
            notification,
            android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION,
        )

        /*
         * A killed trip must not silently restart itself.
         *
         * The JS/application layer must deliberately start a new trip.
         */
        return START_NOT_STICKY
    }

    /**
     * Explicitly leaves foreground state, removes the FGS notification,
     * and stops this service.
     *
     * This method is idempotent:
     * calling it multiple times is safe.
     */
    private fun stopForegroundAndSelf() {
        /*
         * STOP_FOREGROUND_REMOVE is important.
         *
         * DETACH would intentionally leave the notification behind.
         * We explicitly want the trip notification removed.
         */
        ServiceCompat.stopForeground(
            this,
            ServiceCompat.STOP_FOREGROUND_REMOVE,
        )

        /*
         * Removing foreground state does NOT itself stop the service.
         * stopSelf() completes the service termination.
         */
        stopSelf()
    }

    override fun onDestroy() {
        /*
         * onDestroy() is cleanup/fallback only.
         *
         * We do NOT depend on onDestroy() to receive the driver's explicit
         * "End Trip" action.
         *
         * The normal explicit stop path already calls
         * stopForeground(STOP_FOREGROUND_REMOVE).
         *
         * Keeping this call here makes destruction cleanup idempotent and
         * protects against lifecycle paths where the service is destroyed
         * without going through our explicit stop command.
         */
        ServiceCompat.stopForeground(
            this,
            ServiceCompat.STOP_FOREGROUND_REMOVE,
        )

        super.onDestroy()
    }

    /*
     * -----------------------------------------------------------------------
     * Notification
     * -----------------------------------------------------------------------
     */

    private fun ensureNotificationChannel() {
        /*
         * Notification channels only exist on Android O+.
         */
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return
        }

        val notificationManager =
            getSystemService(Context.NOTIFICATION_SERVICE)
                as NotificationManager

        /*
         * Never recreate an existing channel.
         *
         * Android persists user-controlled channel settings. Recreating
         * the channel does not reset those settings, but checking first
         * keeps the operation cheap and explicit.
         */
        if (
            notificationManager.getNotificationChannel(CHANNEL_ID) != null
        ) {
            return
        }

        val channel = NotificationChannel(
            CHANNEL_ID,
            CHANNEL_NAME,
            NotificationManager.IMPORTANCE_LOW,
        ).apply {
            description =
                "Shown while an Urban Cruise trip is active and driver location is being shared."

            setShowBadge(false)
            enableLights(false)
            enableVibration(false)
        }

        notificationManager.createNotificationChannel(channel)
    }

    private fun buildNotification(): Notification {
        /*
         * Tapping the notification returns the driver to MainActivity.
         *
         * SINGLE_TOP prevents a second MainActivity instance when the
         * existing activity can receive the intent.
         */
        val activityIntent = Intent(
            this,
            MainActivity::class.java,
        ).apply {
            flags =
                Intent.FLAG_ACTIVITY_CLEAR_TOP or
                Intent.FLAG_ACTIVITY_SINGLE_TOP
        }

        val pendingIntent = PendingIntent.getActivity(
            this,
            REQUEST_CODE_NOTIFICATION,
            activityIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or
                PendingIntent.FLAG_IMMUTABLE,
        )

        return NotificationCompat.Builder(
            this,
            CHANNEL_ID,
        )
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("Trip in progress")
            .setContentText(
                "Urban Cruise is sharing your location with dispatch and the customer.",
            )
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .setAutoCancel(false)
            .setShowWhen(false)
            .setContentIntent(pendingIntent)
            .build()
    }

    /*
     * -----------------------------------------------------------------------
     * Service API
     * -----------------------------------------------------------------------
     */

    companion object {

        const val CHANNEL_ID = "driver_location_tracking"

        const val NOTIFICATION_ID = 4201

        private const val CHANNEL_NAME = "Trip tracking"

        private const val REQUEST_CODE_NOTIFICATION = 4201

        /*
         * Keep the action private to this application.
         *
         * The service is explicitly exported=false in the manifest, so an
         * external application cannot invoke this component.
         */
        private const val ACTION_START =
            "app.urbancruise.location.action.START"

        private const val ACTION_STOP =
            "app.urbancruise.location.action.STOP"

        /**
         * Starts the location foreground service.
         *
         * IMPORTANT:
         * Call this as part of a user-visible trip-start flow while the app
         * satisfies Android's foreground-service start requirements.
         */
        fun start(context: Context) {
            val intent = Intent(
                context,
                DriverLocationForegroundService::class.java,
            ).apply {
                action = ACTION_START
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        /**
         * Stops the service.
         *
         * This is the preferred stop mechanism when the caller already knows
         * the service should no longer exist.
         *
         * Android explicitly supports stopping a foreground service through
         * Context.stopService().
         */
        fun stop(context: Context) {
            val intent = Intent(
                context,
                DriverLocationForegroundService::class.java,
            )

            context.stopService(intent)
        }

        /**
         * Sends an explicit STOP command to the running service.
         *
         * Useful when you specifically want the service itself to execute
         * foreground-notification removal before stopping itself.
         */
        fun requestStop(context: Context) {
            val intent = Intent(
                context,
                DriverLocationForegroundService::class.java,
            ).apply {
                action = ACTION_STOP
            }

            /*
             * This is an ordinary service command to an already-running
             * foreground service. It is NOT startForegroundService().
             */
            context.startService(intent)
        }
    }
}