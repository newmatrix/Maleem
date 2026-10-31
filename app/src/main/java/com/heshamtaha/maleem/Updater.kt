package com.heshamtaha.maleem

import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.content.FileProvider
import androidx.core.content.pm.PackageInfoCompat
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest

/**
 * Updates outside Google Play, controlled from GitHub.
 *
 * update.json (in the repo, on main) says which version is the newest, where its APK is (a GitHub Release asset),
 * its SHA-256, the oldest version still allowed (older ones must update first), and an optional message.
 * The release workflow fills "latest" by itself; "minCode" and "message" are edited by hand on GitHub.
 *
 * The APK is downloaded into the app's cache, then checked before Android's installer opens:
 * same package, a newer version, the SHA-256 from update.json, and (where Android can read it) the same signing key.
 * Android itself also refuses an APK signed with another key.
 */
object Updater {
    const val UPDATE_URL = "https://raw.githubusercontent.com/newmatrix/Maleem/main/update.json"
    private const val PREFS = "maleem_update"
    private const val CHECK_EVERY = 6 * 60 * 60 * 1000L
    private const val MAX_APK = 150L * 1024 * 1024
    private val ALLOWED_HOSTS = listOf("github.com", "objects.githubusercontent.com", "release-assets.githubusercontent.com")

    @Volatile private var busy = false

    private fun prefs(c: Context) = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    /** Test builds (".debug") never look for updates: the release APK would install as a separate app next to them. */
    fun enabled(c: Context) = (c.applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE) == 0

    fun currentCode(c: Context): Long = try {
        PackageInfoCompat.getLongVersionCode(c.packageManager.getPackageInfo(c.packageName, 0))
    } catch (_: Exception) { 0L }

    fun currentName(c: Context): String = try {
        c.packageManager.getPackageInfo(c.packageName, 0).versionName ?: ""
    } catch (_: Exception) { "" }

    /** The last update.json we read (kept, so "update required" still applies with no internet), plus the app's own version. */
    fun cached(c: Context): String {
        val o = JSONObject()
        o.put("cur", currentCode(c)).put("curName", currentName(c)).put("enabled", enabled(c))
        o.put("checkedAt", prefs(c).getLong("at", 0L))
        try { o.put("info", JSONObject(prefs(c).getString("json", "{}") ?: "{}")) } catch (_: Exception) { o.put("info", JSONObject()) }
        return o.toString()
    }

    /** Reads update.json (at most every 6 hours unless [force]) and answers with [done] (cached() format, or null on failure). */
    fun check(c: Context, force: Boolean, done: (String?, String?) -> Unit) {
        if (!enabled(c)) { done(cached(c), null); return }
        val last = prefs(c).getLong("at", 0L)
        if (!force && System.currentTimeMillis() - last < CHECK_EVERY) { done(cached(c), null); return }
        Thread {
            try {
                val conn = (URL("$UPDATE_URL?t=${System.currentTimeMillis() / 60000}").openConnection() as HttpURLConnection).apply {
                    connectTimeout = 8000; readTimeout = 8000
                    setRequestProperty("Cache-Control", "no-cache")
                    setRequestProperty("User-Agent", "Maleem-Android")
                }
                val code = conn.responseCode
                if (code != 200) { conn.disconnect(); done(null, "http"); return@Thread }
                val body = conn.inputStream.use { it.readBytes() }
                conn.disconnect()
                if (body.size > 64 * 1024) { done(null, "big"); return@Thread }
                val json = JSONObject(String(body, Charsets.UTF_8)) // throws if the file is broken: keep the old copy then
                prefs(c).edit().putString("json", json.toString()).putLong("at", System.currentTimeMillis()).apply()
                done(cached(c), null)
            } catch (_: Exception) { done(null, "net") }
        }.start()
    }

    private fun apkDir(c: Context) = File(c.cacheDir, "updates").apply { mkdirs() }
    fun apkFile(c: Context) = File(apkDir(c), "maleem-update.apk")

    private fun hostOk(u: URL) = u.protocol == "https" && ALLOWED_HOSTS.any { u.host == it || u.host.endsWith(".$it") }

    /**
     * Downloads the APK (continuing a download that stopped half way), checks it, and reports through
     * [progress] (0..100) and [done] (null = ready to install, otherwise an error code).
     */
    fun download(c: Context, url: String, sha256: String, code: Long, progress: (Int) -> Unit, done: (String?) -> Unit) {
        if (busy) { done("busy"); return }
        busy = true
        Thread {
            try {
                val start = URL(url)
                if (!hostOk(start)) { done("url"); return@Thread }
                if (code <= currentCode(c)) { done("old"); return@Thread }
                val part = File(apkDir(c), "maleem-update.part")
                val tag = prefs(c).getString("partFor", "")
                if (tag != "$code|$sha256") { part.delete(); prefs(c).edit().putString("partFor", "$code|$sha256").apply() }
                apkFile(c).delete()

                var u = start
                var conn: HttpURLConnection
                var hops = 0
                while (true) { // follow GitHub's redirects ourselves, only to GitHub hosts
                    conn = (u.openConnection() as HttpURLConnection).apply {
                        instanceFollowRedirects = false
                        connectTimeout = 15000; readTimeout = 30000
                        setRequestProperty("User-Agent", "Maleem-Android")
                        if (part.length() > 0) setRequestProperty("Range", "bytes=${part.length()}-")
                    }
                    val rc = conn.responseCode
                    if (rc in 300..399) {
                        val loc = conn.getHeaderField("Location"); conn.disconnect()
                        if (loc == null || ++hops > 5) { done("net"); return@Thread }
                        u = URL(u, loc)
                        if (!hostOk(u)) { done("url"); return@Thread }
                        continue
                    }
                    break
                }
                val rc = conn.responseCode
                val append = rc == 206
                if (rc == 416) { conn.disconnect(); part.delete(); done("retry"); return@Thread }
                if (rc != 200 && rc != 206) { conn.disconnect(); done("http"); return@Thread }
                if (!append) part.delete()
                val have = if (append) part.length() else 0L
                val total = have + conn.contentLengthLong.coerceAtLeast(0L)
                if (total > MAX_APK) { conn.disconnect(); done("big"); return@Thread }
                var got = have
                var lastPct = -1
                conn.inputStream.use { inp ->
                    FileOutputStream(part, append).use { out ->
                        val buf = ByteArray(64 * 1024)
                        while (true) {
                            val n = inp.read(buf); if (n < 0) break
                            out.write(buf, 0, n); got += n
                            if (got > MAX_APK) { done("big"); return@Thread }
                            if (total > 0) { val p = (got * 100 / total).toInt(); if (p != lastPct) { lastPct = p; progress(p) } }
                        }
                    }
                }
                conn.disconnect()

                // 1) the file is exactly the one in update.json
                if (sha256.isNotBlank() && !sha256.equals(sha256Of(part), ignoreCase = true)) { part.delete(); done("sha"); return@Thread }
                // 2) it is Maleem, newer than this one, signed like this one
                val err = verifyApk(c, part, code)
                if (err != null) { part.delete(); done(err); return@Thread }
                if (!part.renameTo(apkFile(c))) { done("io"); return@Thread }
                progress(100)
                done(null)
            } catch (_: Exception) {
                done("net") // the half-downloaded file stays, the next try continues it
            } finally { busy = false }
        }.start()
    }

    private fun sha256Of(f: File): String {
        val md = MessageDigest.getInstance("SHA-256")
        f.inputStream().use { inp -> val b = ByteArray(64 * 1024); while (true) { val n = inp.read(b); if (n < 0) break; md.update(b, 0, n) } }
        return md.digest().joinToString("") { "%02x".format(it) }
    }

    @Suppress("DEPRECATION")
    private fun archiveInfo(pm: PackageManager, path: String): PackageInfo? =
        if (Build.VERSION.SDK_INT >= 28) pm.getPackageArchiveInfo(path, PackageManager.GET_SIGNING_CERTIFICATES)
        else pm.getPackageArchiveInfo(path, PackageManager.GET_SIGNATURES)

    @Suppress("DEPRECATION")
    private fun signerSet(info: PackageInfo?): Set<String>? {
        info ?: return null
        val sigs = if (Build.VERSION.SDK_INT >= 28) info.signingInfo?.let { si ->
            if (si.hasMultipleSigners()) si.apkContentsSigners else si.signingCertificateHistory
        } else info.signatures
        if (sigs.isNullOrEmpty()) return null
        return sigs.map { s -> MessageDigest.getInstance("SHA-256").digest(s.toByteArray()).joinToString("") { "%02x".format(it) } }.toSet()
    }

    @Suppress("DEPRECATION")
    private fun installedInfo(c: Context): PackageInfo =
        if (Build.VERSION.SDK_INT >= 28) c.packageManager.getPackageInfo(c.packageName, PackageManager.GET_SIGNING_CERTIFICATES)
        else c.packageManager.getPackageInfo(c.packageName, PackageManager.GET_SIGNATURES)

    private fun verifyApk(c: Context, f: File, code: Long): String? {
        val pm = c.packageManager
        val info = archiveInfo(pm, f.absolutePath) ?: return "apk"
        if (info.packageName != c.packageName) return "pkg"
        val v = PackageInfoCompat.getLongVersionCode(info)
        if (v <= currentCode(c) || v != code) return "old"
        val mine = try { signerSet(installedInfo(c)) } catch (_: Exception) { null }
        val theirs = signerSet(info)
        // when Android can't read the archive's signature we let its installer decide (it refuses another key anyway)
        if (mine != null && theirs != null && mine.intersect(theirs).isEmpty()) return "sig"
        return null
    }

    /** Android 8+ asks once whether Maleem may install apps. */
    fun canInstall(c: Context) = Build.VERSION.SDK_INT < 26 || c.packageManager.canRequestPackageInstalls()

    fun installPermissionIntent(c: Context) =
        Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:${c.packageName}"))

    /** Opens Android's installer for the downloaded APK. */
    fun installIntent(c: Context): Intent? {
        val f = apkFile(c)
        if (!f.exists()) return null
        val uri = FileProvider.getUriForFile(c, "${c.packageName}.files", f)
        return Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(uri, "application/vnd.android.package-archive")
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
        }
    }

    /** After the update is installed (or a newer one is), the old APK in the cache is useless: free the space. */
    fun cleanup(c: Context) {
        try {
            val f = apkFile(c)
            if (f.exists()) {
                val info = archiveInfo(c.packageManager, f.absolutePath)
                if (info == null || PackageInfoCompat.getLongVersionCode(info) <= currentCode(c)) f.delete()
            }
        } catch (_: Exception) { }
    }
}
