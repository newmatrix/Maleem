package com.heshamtaha.maleem

import android.Manifest
import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import org.json.JSONArray
import org.json.JSONObject

/**
 * "تسجيل تلقائي من الإشعارات": reads payment notifications from banks / wallets and keeps a short queue of
 * suggested expenses ON THE PHONE. Nothing is uploaded, and nothing becomes an expense until the user confirms it.
 *
 * Turning the feature off disables the listener component itself, so Android stops passing notifications to the app.
 */
object PayCapture {
    private const val PREFS = "maleem_capture"
    private const val CHANNEL = "maleem_capture"
    private const val MAX_QUEUE = 30
    private const val NOTIF_ID = 7001
    /** The same payment reported twice (bank SMS + bank app, or a re-posted notification) arrives within this window */
    private const val DUP_WINDOW = 3 * 60_000L
    /** How long a capture is remembered for duplicate checks (also after the web app took it from the queue) */
    private const val RECENT_KEEP = 10 * 60_000L

    /** Set by MainActivity while it is on screen, so a new capture shows up without reopening the app. */
    @Volatile var onNew: (() -> Unit)? = null

    private fun prefs(c: Context) = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun enabled(c: Context) = prefs(c).getBoolean("on", false)

    fun hasAccess(c: Context) = NotificationManagerCompat.getEnabledListenerPackages(c).contains(c.packageName)

    fun component(c: Context) = ComponentName(c, PayListener::class.java)

    /** On: enable the listener component and ask Android to bind it. Off: disable it, so it is unbound. */
    fun setEnabled(c: Context, on: Boolean) {
        prefs(c).edit().putBoolean("on", on).apply()
        try {
            c.packageManager.setComponentEnabledSetting(
                component(c),
                if (on) PackageManager.COMPONENT_ENABLED_STATE_ENABLED else PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
                PackageManager.DONT_KILL_APP
            )
        } catch (_: Exception) { }
        if (on && hasAccess(c)) {
            try { NotificationListenerService.requestRebind(component(c)) } catch (_: Exception) { }
        }
        if (!on) try { NotificationManagerCompat.from(c).cancel(NOTIF_ID) } catch (_: Exception) { }
    }

    fun blocked(c: Context): JSONArray = try { JSONArray(prefs(c).getString("blocked", "[]")) } catch (_: Exception) { JSONArray() }

    fun isBlocked(c: Context, pkg: String): Boolean {
        val b = blocked(c)
        for (i in 0 until b.length()) if (b.optJSONObject(i)?.optString("pkg") == pkg) return true
        return false
    }

    /** "تجاهل التطبيق ده دايمًا" (on = true) or "رجّعه" (on = false). */
    @Synchronized fun setBlocked(c: Context, pkg: String, name: String, on: Boolean) {
        if (pkg.isBlank() || pkg.length > 200) return
        val old = blocked(c)
        val out = JSONArray()
        for (i in 0 until old.length()) old.optJSONObject(i)?.let { if (it.optString("pkg") != pkg) out.put(it) }
        if (on) out.put(JSONObject().put("pkg", pkg).put("name", name.take(40)))
        prefs(c).edit().putString("blocked", out.toString()).apply()
        if (on) {
            // drop what is already waiting from that app
            val q = queue(c)
            val keep = JSONArray()
            for (i in 0 until q.length()) q.optJSONObject(i)?.let { if (it.optString("pkg") != pkg) keep.put(it) }
            prefs(c).edit().putString("queue", keep.toString()).apply()
        }
    }

    @Synchronized private fun queue(c: Context): JSONArray =
        try { JSONArray(prefs(c).getString("queue", "[]")) } catch (_: Exception) { JSONArray() }

    /** Hands the waiting captures to the web app and empties the native queue (the app keeps them from then on). */
    @Synchronized fun take(c: Context): String {
        val q = queue(c)
        prefs(c).edit().putString("queue", "[]").apply()
        try { NotificationManagerCompat.from(c).cancel(NOTIF_ID) } catch (_: Exception) { }
        return q.toString()
    }

    /**
     * Adds a capture unless it is a duplicate. A duplicate is the same amount within [DUP_WINDOW] that comes either
     * from ANOTHER app (bank SMS + bank app report one payment) or with the SAME text (a re-posted notification).
     * Two different payments of the same amount from the same app (two 50 EGP coffees) are both kept.
     */
    @Synchronized fun add(c: Context, item: JSONObject): Boolean {
        val p = prefs(c)
        val now = item.optLong("at")
        val amount = item.optDouble("amount")
        val pkg = item.optString("pkg")
        val text = item.optString("text")

        val old = try { JSONArray(p.getString("recent", "[]")) } catch (_: Exception) { JSONArray() }
        val recent = JSONArray()
        var dup = false
        for (i in 0 until old.length()) {
            val o = old.optJSONObject(i) ?: continue
            val dt = kotlin.math.abs(o.optLong("at") - now)
            if (dt >= RECENT_KEEP) continue // forget old ones
            recent.put(o)
            if (dt < DUP_WINDOW && o.optDouble("amount") == amount && (o.optString("pkg") != pkg || o.optString("text") == text)) dup = true
        }
        if (dup) {
            p.edit().putString("recent", recent.toString()).apply()
            return false
        }
        recent.put(JSONObject().put("at", now).put("amount", amount).put("pkg", pkg).put("text", text))

        val q = queue(c)
        val out = JSONArray()
        out.put(item)
        for (i in 0 until minOf(q.length(), MAX_QUEUE - 1)) out.put(q.opt(i))
        p.edit()
            .putString("queue", out.toString())
            .putString("recent", recent.toString())
            .remove("lastAmt").remove("lastAt") // replaced by "recent"
            .apply()
        return true
    }

    fun createChannel(c: Context) {
        // minSdk is 26, so notification channels always exist
        c.getSystemService(NotificationManager::class.java).createNotificationChannel(
            NotificationChannel(CHANNEL, "عمليات دفع لقطها مليم", NotificationManager.IMPORTANCE_LOW)
        )
    }

    @SuppressLint("MissingPermission")
    fun notifyUser(c: Context, count: Int, amount: Double, source: String) {
        if (Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(c, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) return
        createChannel(c)
        val open = PendingIntent.getActivity(
            c, 7, Intent(c, MainActivity::class.java).setAction(MainActivity.ACTION_CAPTURES)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val amt = if (amount == Math.floor(amount)) amount.toLong().toString() else String.format(java.util.Locale.US, "%.2f", amount)
        val title = if (count > 1) "$count عمليات دفع مستنية تسجلها" else "لقيت عملية دفع: $amt"
        val body = if (count > 1) "آخرها $amt من $source. افتح مليم وراجعها." else "من $source. دوس عشان تسجلها في مليم."
        val n = NotificationCompat.Builder(c, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat)
            .setColor(ContextCompat.getColor(c, R.color.brand))
            .setContentTitle(title)
            .setContentText(body)
            .setContentIntent(open)
            .setAutoCancel(true)
            .setOnlyAlertOnce(true)
            .build()
        try { NotificationManagerCompat.from(c).notify(NOTIF_ID, n) } catch (_: SecurityException) { }
    }

    fun pendingCount(c: Context) = queue(c).length()
}

class PayListener : NotificationListenerService() {

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        val s = sbn ?: return
        try { handle(s) } catch (_: Exception) { }
    }

    private fun handle(sbn: StatusBarNotification) {
        if (!PayCapture.enabled(this)) return
        val pkg = sbn.packageName ?: return
        if (pkg == packageName || PayParser.ignoredPackage(pkg)) return
        val n = sbn.notification ?: return
        if (sbn.isOngoing || (n.flags and Notification.FLAG_GROUP_SUMMARY) != 0) return
        if (n.category == Notification.CATEGORY_PROGRESS || n.category == Notification.CATEGORY_CALL) return

        val ex = n.extras ?: return
        val title = ex.getCharSequence(Notification.EXTRA_TITLE)?.toString().orEmpty()
        val text = (ex.getCharSequence(Notification.EXTRA_BIG_TEXT) ?: ex.getCharSequence(Notification.EXTRA_TEXT))?.toString().orEmpty()
        if (title.length + text.length > 2000) return
        val r = PayParser.parse(pkg, title, text) ?: return

        if (PayCapture.isBlocked(this, pkg)) return

        val app = try {
            packageManager.getApplicationLabel(packageManager.getApplicationInfo(pkg, 0)).toString()
        } catch (_: Exception) { pkg }
        // SMS apps: the sender (bank name) is a better source label than "Messages"
        val smsApp = pkg.contains("messaging") || pkg.contains("mms") || pkg.endsWith(".sms")
        val source = (if (smsApp && title.isNotBlank()) title else app).take(40)

        val at = if (sbn.postTime > 0) sbn.postTime else System.currentTimeMillis()
        val item = JSONObject()
            .put("id", "c" + java.lang.Long.toString(at, 36) + (Math.random() * 1e6).toLong().toString(36))
            .put("at", at)
            .put("amount", r.amount)
            .put("cur", r.currency.take(8))
            .put("merchant", r.merchant)
            .put("method", r.method)
            .put("source", source)
            .put("pkg", pkg)
            .put("text", ("$title\n$text").trim().take(300))
        if (!PayCapture.add(this, item)) return

        val live = PayCapture.onNew
        if (live != null) live()
        else PayCapture.notifyUser(this, PayCapture.pendingCount(this), r.amount, source)
    }
}
