package com.michustays.pro;

import android.app.ActivityManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.List;

/**
 * Custom FCM service that GUARANTEES background notification display on Samsung.
 * Capacitor's plugin doesn't reliably show notifications when the app is killed.
 * This native service bypasses Capacitor entirely for background delivery.
 */
public class MichuMessagingService extends FirebaseMessagingService {
    private static final String TAG = "MichuFCM";
    private static final String CHANNEL_ID = "michu_urgent_v3";

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        Log.d(TAG, "FCM message received. From: " + remoteMessage.getFrom());

        // If app is in foreground, skip — the Firestore real-time listener
        // already shows the interactive popup in the WebView.
        if (isAppInForeground()) {
            Log.d(TAG, "App is in foreground. Skipping native notification (Firestore handles it).");
            return;
        }

        String title = "Michu Stays";
        String body = "You have a new update.";

        // Try notification payload first
        if (remoteMessage.getNotification() != null) {
            if (remoteMessage.getNotification().getTitle() != null)
                title = remoteMessage.getNotification().getTitle();
            if (remoteMessage.getNotification().getBody() != null)
                body = remoteMessage.getNotification().getBody();
        }

        // Fallback/override with data payload
        if (remoteMessage.getData().containsKey("title")) {
            title = remoteMessage.getData().get("title");
        }
        if (remoteMessage.getData().containsKey("body")) {
            body = remoteMessage.getData().get("body");
        }

        Log.d(TAG, "Showing background notification: " + title + " | " + body);
        ensureChannel();
        showNotification(title, body);
    }

    @Override
    public void onNewToken(String token) {
        Log.d(TAG, "New FCM token: " + token);
        // Token refresh is handled by the Capacitor plugin's registration listener
    }

    private boolean isAppInForeground() {
        try {
            ActivityManager am = (ActivityManager) getSystemService(ACTIVITY_SERVICE);
            List<ActivityManager.RunningAppProcessInfo> processes = am.getRunningAppProcesses();
            if (processes != null) {
                for (ActivityManager.RunningAppProcessInfo p : processes) {
                    if (p.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND
                            && p.processName.equals(getPackageName())) {
                        return true;
                    }
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "Could not check foreground state", e);
        }
        return false;
    }

    private void ensureChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Michu Urgent Alerts",
                    NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Important booking and status updates");
            channel.enableLights(true);
            channel.enableVibration(true);
            channel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
            channel.setShowBadge(true);

            NotificationManager mgr = getSystemService(NotificationManager.class);
            if (mgr != null) mgr.createNotificationChannel(channel);
        }
    }

    private void showNotification(String title, String body) {
        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        intent.putExtra("push_type", "booking");

        PendingIntent pi = PendingIntent.getActivity(
                this, (int) System.currentTimeMillis(), intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(getApplicationInfo().icon)
                .setContentTitle(title)
                .setContentText(body)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                .setAutoCancel(true)
                .setContentIntent(pi)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setCategory(NotificationCompat.CATEGORY_MESSAGE);

        NotificationManager mgr = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (mgr != null) {
            mgr.notify((int) System.currentTimeMillis(), builder.build());
            Log.d(TAG, "✅ Native notification displayed successfully");
        }
    }
}
