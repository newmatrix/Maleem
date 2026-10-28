package com.heshamtaha.maleem

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.service.quicksettings.Tile
import android.service.quicksettings.TileService
import android.view.View
import android.widget.RemoteViews
import org.json.JSONObject
import java.text.DecimalFormat
import java.text.DecimalFormatSymbols
import java.util.Calendar
import java.util.Locale

/**
 * Home-screen widgets (small + medium). The web app sends a tiny summary through
 * AndroidBridge.syncWidget() every time data changes; the widgets only read that summary.
 */
object WidgetData {
    private const val PREFS = "maleem_widget"

    fun save(c: Context, json: String) =
        c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString("data", json).apply()

    private fun load(c: Context): JSONObject = try {
        JSONObject(c.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("data", "{}") ?: "{}")
    } catch (_: Exception) { JSONObject() }

    /** Redraws every placed widget (both sizes). */
    fun updateAll(c: Context) {
        try {
            val am = AppWidgetManager.getInstance(c)
            val small = am.getAppWidgetIds(ComponentName(c, MaleemWidgetSmall::class.java))
            if (small.isNotEmpty()) am.updateAppWidget(small, build(c, false))
            val medium = am.getAppWidgetIds(ComponentName(c, MaleemWidgetMedium::class.java))
            if (medium.isNotEmpty()) am.updateAppWidget(medium, build(c, true))
        } catch (_: Exception) { }
    }

    fun update(c: Context, am: AppWidgetManager, ids: IntArray, medium: Boolean) {
        try { am.updateAppWidget(ids, build(c, medium)) } catch (_: Exception) { }
    }

    private fun fmt(v: Double): String =
        DecimalFormat("#,##0.##", DecimalFormatSymbols(Locale.US)).format(v)

    private fun dayKeyNow(): String {
        val cal = Calendar.getInstance()
        return String.format(
            Locale.US, "%04d-%02d-%02d",
            cal.get(Calendar.YEAR), cal.get(Calendar.MONTH) + 1, cal.get(Calendar.DAY_OF_MONTH)
        )
    }

    private fun act(c: Context, code: Int, action: String?): PendingIntent {
        val i = Intent(c, MainActivity::class.java)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        if (action != null) i.action = action
        return PendingIntent.getActivity(c, code, i, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }

    private fun build(c: Context, medium: Boolean): RemoteViews {
        val d = load(c)
        val hide = d.optBoolean("hide", false)
        val cur = d.optString("cur", "ج.م")
        val hasData = d.has("day")
        val now = System.currentTimeMillis()
        // The summary is only as fresh as the last time the app saved something, so check the day / period
        val sameDay = d.optString("day") == dayKeyNow()
        val live = now < d.optLong("end", 0L)
        val today = if (sameDay) d.optDouble("today", 0.0) else 0.0
        val spent = if (live) d.optDouble("spent", 0.0) else 0.0
        val budget = d.optDouble("budget", 0.0)
        val topName = if (live) d.optString("topName", "") else ""
        val label = if (live) d.optString("label", "") else ""
        // "month" = calendar-month spending, "period" = a budget period that may start on any day
        val perWord = if (d.optString("per", "month") == "period") "الفترة" else "الشهر"
        val pct = if (budget > 0) Math.round(spent / budget * 100).toInt() else -1
        val dots = "\u2022\u2022\u2022\u2022"
        fun money(v: Double): String = if (hide) dots else fmt(v)
        val curTxt = if (hide) "" else " $cur"

        val rv = RemoteViews(c.packageName, if (medium) R.layout.wg_medium else R.layout.wg_small)
        rv.setOnClickPendingIntent(R.id.wg_root, act(c, 10, null))
        rv.setOnClickPendingIntent(R.id.wg_add, act(c, 11, MainActivity.ACTION_ADD_EXPENSE))
        rv.setOnClickPendingIntent(R.id.wg_mic, act(c, 12, MainActivity.ACTION_ADD_VOICE))

        if (!medium) {
            rv.setTextViewText(R.id.wg_today, if (hasData) money(today) else "\u2014")
            rv.setTextViewText(R.id.wg_cur, if (hasData && !hide) cur else "")
            val sub = when {
                !hasData -> "افتح مليم مرة"
                !live -> "فترة جديدة"
                budget > 0 -> "$perWord: $pct% من الميزانية"
                else -> "$perWord: " + money(spent) + curTxt
            }
            rv.setTextViewText(R.id.wg_sub, sub)
        } else {
            rv.setTextViewText(R.id.wg_period, if (!hasData) "مليم" else if (live) label else "فترة جديدة")
            rv.setTextViewText(R.id.wg_todaysm, "اليوم: " + (if (hasData) money(today) else "\u2014"))
            rv.setTextViewText(R.id.wg_big, if (hasData) money(spent) else "\u2014")
            val ofTxt = when {
                !hasData -> ""
                budget > 0 -> "/ " + money(budget) + curTxt
                hide -> ""
                else -> cur
            }
            rv.setTextViewText(R.id.wg_of, ofTxt)

            val showBar = hasData && live && budget > 0
            val bad = pct >= 90
            val level = pct.coerceIn(0, 100)
            rv.setViewVisibility(R.id.wg_bar_wrap, if (showBar) View.VISIBLE else View.GONE)
            rv.setViewVisibility(R.id.wg_bar, if (showBar && !bad) View.VISIBLE else View.INVISIBLE)
            rv.setViewVisibility(R.id.wg_bar_bad, if (showBar && bad) View.VISIBLE else View.INVISIBLE)
            rv.setProgressBar(R.id.wg_bar, 100, level, false)
            rv.setProgressBar(R.id.wg_bar_bad, 100, level, false)

            val rem = budget - spent
            val parts = ArrayList<String>()
            if (showBar) parts.add((if (rem >= 0) "باقي " else "متجاوز بـ ") + money(Math.abs(rem)) + curTxt)
            if (topName.isNotEmpty()) parts.add("أكتر فئة: $topName")
            rv.setTextViewText(R.id.wg_foot, parts.joinToString(" \u00B7 "))
        }
        return rv
    }
}

class MaleemWidgetSmall : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        WidgetData.update(context, appWidgetManager, appWidgetIds, false)
    }
}

class MaleemWidgetMedium : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        WidgetData.update(context, appWidgetManager, appWidgetIds, true)
    }
}

/** Quick Settings tile "مصروف بالصوت": opens the app straight on the voice card. */
class MaleemTileService : TileService() {
    override fun onStartListening() {
        super.onStartListening()
        qsTile?.let {
            it.state = Tile.STATE_INACTIVE
            it.updateTile()
        }
    }

    override fun onClick() {
        super.onClick()
        if (isLocked) unlockAndRun { launch() } else launch()
    }

    private fun launch() {
        val i = Intent(this, MainActivity::class.java)
            .setAction(MainActivity.ACTION_ADD_VOICE)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        if (Build.VERSION.SDK_INT >= 34) {
            val pi = PendingIntent.getActivity(this, 13, i, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
            startActivityAndCollapse(pi)
        } else {
            @Suppress("DEPRECATION")
            startActivityAndCollapse(i)
        }
    }
}
