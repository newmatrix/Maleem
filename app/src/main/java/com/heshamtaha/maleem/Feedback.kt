package com.heshamtaha.maleem

import android.content.Context
import android.os.Build
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

/**
 * Suggestions and problems from the "اقتراحات وملاحظات" page, sent to the developer's Google Form.
 *
 * It is the same request the form's own "إرسال" button makes: a POST of the answers to .../formResponse. The answers land in the Google
 * Sheet linked to the form and the developer gets an email for each one. The form id and the entry ids below are public (anyone can see them in
 * the form's link); they are the form's four questions: name, email, type, text.
 *
 * Google does not document this as an API, so a failure is reported and the page offers to open the form in the browser, pre-filled.
 * Only what the person typed is sent, plus Maleem's version and the Android version. Nothing about their money.
 */
object Feedback {
    private const val FORM_ID = "1FAIpQLSef3Dr3rdUU4nS_vrxcmjElgBxFT5-mk2fg_PKiUJGcn10QMw"
    internal var endpoint = "https://docs.google.com/forms/d/e/$FORM_ID/formResponse" // a variable only so a test can point it at a local server
    private const val E_NAME = "entry.1144655711"
    private const val E_EMAIL = "entry.391619419"
    private const val E_KIND = "entry.789292250"
    private const val E_TEXT = "entry.1444139243"
    // the two choices exactly as they are spelled in the form (إقتراح has the hamza under the alef): any other text makes Google refuse the answer
    private const val KIND_SUGGESTION = "\u0625\u0642\u062A\u0631\u0627\u062D"
    private const val KIND_PROBLEM = "\u0645\u0634\u0643\u0644\u0629"
    private const val PREFS = "maleem_feedback"
    private const val EVERY = 60_000L

    internal fun body(name: String, email: String, kind: String, text: String, meta: String): ByteArray {
        val fields = listOf(
            E_NAME to name.trim().take(60),
            E_EMAIL to email.trim().take(100),
            E_KIND to (if (kind == "bug") KIND_PROBLEM else KIND_SUGGESTION),
            E_TEXT to (text.trim().take(2000) + "\n\n" + meta)
        )
        return fields.joinToString("&") { URLEncoder.encode(it.first, "UTF-8") + "=" + URLEncoder.encode(it.second, "UTF-8") }
            .toByteArray(Charsets.UTF_8)
    }

    /** [done] gets null when Google accepted it, otherwise a code: bad (too short), rate (one a minute), net, or http<status>. */
    fun send(c: Context, name: String, email: String, kind: String, text: String, done: (String?) -> Unit) {
        if (text.trim().length < 5) { done("bad"); return }
        val prefs = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val now = System.currentTimeMillis()
        if (now - prefs.getLong("last", 0L) < EVERY) { done("rate"); return }
        prefs.edit().putLong("last", now).apply() // before the request, so a double tap sends once
        val meta = "\u2014 \u0645\u0644\u064A\u0645 ${Updater.currentName(c)} (${Updater.currentCode(c)}) \u00B7 Android ${Build.VERSION.RELEASE}"
        val data = body(name, email, kind, text, meta)
        Thread {
            var err: String? = "net"
            try {
                val conn = (URL(endpoint).openConnection() as HttpURLConnection).apply {
                    requestMethod = "POST"; doOutput = true; instanceFollowRedirects = false
                    connectTimeout = 10000; readTimeout = 15000
                    setRequestProperty("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8")
                    setRequestProperty("User-Agent", "Maleem-Android")
                    setFixedLengthStreamingMode(data.size)
                }
                conn.outputStream.use { it.write(data) }
                val code = conn.responseCode
                conn.disconnect()
                err = if (code in 200..299) null else "http$code" // a redirect (for example to a sign-in page) is not an accepted answer
            } catch (_: Exception) { }
            if (err != null) prefs.edit().putLong("last", 0L).apply() // it did not go: no need to wait a minute to try again
            done(err)
        }.start()
    }
}
