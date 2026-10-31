package com.heshamtaha.maleem

import android.content.Context
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/**
 * Exchange rates for changing the currency (and for showing a shared expense in the viewer's own currency).
 *
 * rates.json lives in the repo on main, next to update.json. A GitHub workflow refreshes it once a day, so the phones
 * only ever talk to GitHub (the same host the updater uses), never to a rates service.
 * Shape: {"base":"USD","updated":<unix seconds>,"rates":{"USD":1,"EGP":48.5,...}}  (1 USD = rates[X] units of X)
 *
 * The last good copy is kept in SharedPreferences, so the app can still convert with no internet.
 */
object Rates {
    const val RATES_URL = "https://raw.githubusercontent.com/newmatrix/Maleem/main/rates.json"
    private const val PREFS = "maleem_rates"
    private const val CHECK_EVERY = 3 * 60 * 60 * 1000L

    private fun prefs(c: Context) = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    /** The last good rates.json (or {}), plus when we last read it. Synchronous and small. */
    fun cached(c: Context): String {
        val o = JSONObject()
        o.put("checkedAt", prefs(c).getLong("at", 0L))
        try { o.put("data", JSONObject(prefs(c).getString("json", "{}") ?: "{}")) } catch (_: Exception) { o.put("data", JSONObject()) }
        return o.toString()
    }

    /** A file we accept: base USD, a recent-enough date, and at least a few positive numbers. */
    private fun valid(j: JSONObject): Boolean {
        if (j.optString("base") != "USD") return false
        val r = j.optJSONObject("rates") ?: return false
        if (j.optLong("updated", 0L) <= 0L) return false
        var n = 0
        val it = r.keys()
        while (it.hasNext()) {
            val v = r.optDouble(it.next(), -1.0)
            if (v.isNaN() || v.isInfinite() || v <= 0.0) return false
            n++
        }
        return n >= 3
    }

    /** Reads rates.json (at most every 3 hours unless [force]) and answers with [done] (cached() format, or null + error code). */
    fun refresh(c: Context, force: Boolean, done: (String?, String?) -> Unit) {
        val last = prefs(c).getLong("at", 0L)
        if (!force && System.currentTimeMillis() - last < CHECK_EVERY && prefs(c).contains("json")) { done(cached(c), null); return }
        Thread {
            try {
                val conn = (URL("$RATES_URL?t=${System.currentTimeMillis() / 60000}").openConnection() as HttpURLConnection).apply {
                    connectTimeout = 8000; readTimeout = 8000
                    setRequestProperty("Cache-Control", "no-cache")
                    setRequestProperty("User-Agent", "Maleem-Android")
                }
                val code = conn.responseCode
                if (code != 200) { conn.disconnect(); done(null, "http"); return@Thread }
                val body = conn.inputStream.use { it.readBytes() }
                conn.disconnect()
                if (body.size > 16 * 1024) { done(null, "big"); return@Thread }
                val json = JSONObject(String(body, Charsets.UTF_8)) // throws if the file is broken: keep the old copy then
                if (!valid(json)) { done(null, "bad"); return@Thread }
                prefs(c).edit().putString("json", json.toString()).putLong("at", System.currentTimeMillis()).apply()
                done(cached(c), null)
            } catch (_: Exception) { done(null, "net") }
        }.start()
    }
}
