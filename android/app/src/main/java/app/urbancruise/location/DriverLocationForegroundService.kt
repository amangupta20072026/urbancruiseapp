/*
 * ---------------------------------------------------------------------------
 * DriverLocationForegroundService
 * ---------------------------------------------------------------------------
 *
 * Urban Cruise driver-trip foreground service.
 *
 * Responsibilities:
 *
 *   1. Promote itself to Android foreground-service state.
 *   2. Display the mandatory trip-tracking notification.
 *   3. Declare/use the LOCATION foreground-service type.
 *   4. Stop cleanly when the trip ends.
 *
 * This service DOES NOT request location fixes.
 *
 * Location fixes are owned by:
 *
 *   React Native
 *       -> react-native-geolocation-service
 *       -> Google Play Services / fused location
 *
 * The Android FGS exists to support the application's long-running
 * location-tracking use case while the app is backgrounded/locked.
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
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import app.urbancruise.MainActivity
import app.urbancruise.R

class DriverLocationForegroundService : Service() {

    override fun onCreate() {
        super.onCreate()

        /*
         * Create the channel once when the service is created.
         */
        createNotificationChannel()
    }

    override fun onBind(intent: Intent?): IBinder? {
        /*
         * This is a started service, not a bound service.
         */
        return null
    }

    override fun onStartCommand(
        intent: Intent?,
        flags: Int,
        startId: Int,
    ): Int {

        /*
         * -------------------------------------------------------------------
         * START
         * -------------------------------------------------------------------
         *
         * Every normal start promotes the service to foreground immediately.
         *
         * There is intentionally NO ACTION_STOP path here.
         *
         * End Trip uses Context.stopService(), which is Android's normal
         * mechanism for stopping a foreground service.
         */
        val notification = buildNotification()

        ServiceCompat.startForeground(
            this,
            NOTIFICATION_ID,
            notification,
            ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION,
        )

        /*
         * If Android/OEM kills this service, do not automatically recreate
         * the driver's trip.
         *
         * The application must explicitly start a new trip.
         */
        return START_NOT_STICKY
    }

    override fun onDestroy() {
        /*
         * Defensive cleanup.
         *
         * The normal stop path uses Context.stopService().
         * Android then destroys the service and this cleanup makes sure
         * foreground state and the notification are removed.
         *
         * Calling this more than once is safe.
         */
        removeForegroundNotification()

        super.onDestroy()
    }

    /**
     * Remove the service from foreground state and explicitly cancel the
     * notification.
     *
     * STOP_FOREGROUND_REMOVE is the important part for the normal Android
     * foreground-service lifecycle.
     *
     * The additional NotificationManager.cancel() is intentionally used as
     * defensive OEM cleanup. Some vendor notification implementations can
     * visually retain/update a notification briefly after the service has
     * left foreground state.
     */
    private fun removeForegroundNotification() {
        ServiceCompat.stopForeground(
            this,
            ServiceCompat.STOP_FOREGROUND_REMOVE,
        )

        /*
         * Defensive notification cancellation.
         *
         * This happens AFTER stopForeground(), so we are no longer asking
         * Android to remove the notification while the service is still
         * required to remain foreground.
         */
        val notificationManager =
            getSystemService(Context.NOTIFICATION_SERVICE)
                as NotificationManager

        notificationManager.cancel(NOTIFICATION_ID)
    }

    /**
     * Create the notification channel used by the trip FGS.
     */
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return
        }

        val notificationManager =
            getSystemService(Context.NOTIFICATION_SERVICE)
                as NotificationManager

        /*
         * Do not recreate an existing channel.
         *
         * Android preserves the user's channel-level settings.
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
                "Shown while an Urban Cruise driver trip is active and location is being shared."

            setShowBadge(false)
            enableLights(false)
            enableVibration(false)
        }

        notificationManager.createNotificationChannel(channel)
    }

    /**
     * Build the mandatory foreground-service notification.
     */
    private fun buildNotification(): Notification {

        /*
         * Open the existing MainActivity instead of creating a second
         * activity instance.
         *
         * MainActivity is already configured as singleTask in the manifest.
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
            NOTIFICATION_REQUEST_CODE,
            activityIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or
                PendingIntent.FLAG_IMMUTABLE,
        )

        return NotificationCompat.Builder(
            this,
            CHANNEL_ID,
        )
            /*
             * IMPORTANT:
             *
             * This should eventually be replaced with a dedicated
             * monochrome notification/status-bar icon.
             *
             * For now this preserves your existing resource so the change
             * does not require adding another drawable immediately.
             */
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("Trip in progress")
            .setContentText(
                "Urban Cruise is sharing your location.",
            )
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .setAutoCancel(false)
            .setShowWhen(false)
            .setContentIntent(pendingIntent)
            .build()
    }

    companion object {

        /*
         * Notification channel ID.
         *
         * Do NOT change this casually in production because channel IDs
         * are persisted by Android.
         */
        const val CHANNEL_ID =
            "driver_location_tracking"

        /*
         * Stable notification ID.
         *
         * Must be non-zero.
         */
        const val NOTIFICATION_ID =
            4201

        private const val CHANNEL_NAME =
            "Trip tracking"

        private const val NOTIFICATION_REQUEST_CODE =
            4201

        /**
         * Start the driver's location foreground service.
         *
         * IMPORTANT:
         *
         * The caller must satisfy Android's location permission and
         * foreground-service start requirements before calling this.
         *
         * For Android 12+, location FGS startup is subject to background
         * start restrictions.
         *
         * For Android 14+, location FGS prerequisites are checked when the
         * service is promoted to foreground.
         */
        fun start(context: Context) {

            val intent = Intent(
                context,
                DriverLocationForegroundService::class.java,
            )

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        /**
         * Stop the driver's location foreground service.
         *
         * This is intentionally implemented using Context.stopService().
         *
         * Android's official FGS documentation explicitly supports
         * Context.stopService() for stopping a foreground service.
         */
        fun stop(context: Context) {

            val intent = Intent(
                context,
                DriverLocationForegroundService::class.java,
            )

            context.stopService(intent)
        }
    }
}