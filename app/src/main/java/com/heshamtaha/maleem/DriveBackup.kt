package com.heshamtaha.maleem

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.time.Instant

/**
 * Backups to the user's own Google Drive, through the Drive REST API with an OAuth access token.
 * The scope is drive.file: the app sees only the files and the folder it created itself, nothing else in the Drive.
 * Files go to a folder "Maleem" (made once and remembered per account), and only the newest [KEEP] automatic
 * backups of each member are kept, the same as on the phone.
 * Restore reads them back: [list] finds every backup Maleem uploaded to the account, [download] gets one.
 * Every call here does network work: run it off the main thread.
 */
object DriveBackup {
    const val SCOPE = "https://www.googleapis.com/auth/drive.file"
    private const val API = "https://www.googleapis.com/drive/v3"
    private const val UPLOAD = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id"
    private const val FOLDER_MIME = "application/vnd.google-apps.folder"
    private const val FOLDER_NAME = "Maleem"
    private const val PREFS = "maleem_drive"
    private const val KEEP = 7

    class DriveError(val code: String) : Exception(code)

    private fun prefs(c: Context) = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    private fun call(method: String, url: String, token: String, body: ByteArray? = null, type: String? = null): JSONObject {
        val conn = (URL(url).openConnection() as HttpURLConnection).apply {
            requestMethod = method
            connectTimeout = 15000; readTimeout = 30000
            setRequestProperty("Authorization", "Bearer $token")
            if (body != null) { doOutput = true; setRequestProperty("Content-Type", type ?: "application/json; charset=UTF-8") }
        }
        try {
            if (body != null) conn.outputStream.use { it.write(body) }
            val rc = conn.responseCode
            val stream = if (rc in 200..299) conn.inputStream else conn.errorStream
            val text = stream?.use { s -> val o = ByteArrayOutputStream(); s.copyTo(o); o.toString("UTF-8") } ?: ""
            if (rc in 200..299) return if (text.isBlank()) JSONObject() else JSONObject(text)
            throw failure(rc, text)
        } catch (e: DriveError) { throw e
        } catch (_: Exception) { throw DriveError("net")
        } finally { conn.disconnect() }
    }

    private fun failure(rc: Int, text: String): DriveError = DriveError(when {
        rc == 401 -> "auth"
        rc == 403 && (text.contains("storageQuotaExceeded") || text.contains("quotaExceeded")) -> "full"
        rc == 403 && text.contains("accessNotConfigured") -> "api"
        rc == 403 -> "auth"
        rc == 404 -> "gone"
        else -> "http"
    })

    private fun enc(s: String) = URLEncoder.encode(s, "UTF-8")
    private fun q(s: String) = s.replace("\\", "\\\\").replace("'", "\\'")

    /** The Google account's e-mail, shown in settings ("linked to ..."). about.get works with drive.file. */
    fun email(token: String): String =
        call("GET", "$API/about?fields=${enc("user(emailAddress)")}", token).optJSONObject("user")?.optString("emailAddress") ?: ""

    private fun folderId(c: Context, token: String, account: String, fresh: Boolean): String {
        val key = "folder:${account.lowercase()}"
        if (!fresh) prefs(c).getString(key, null)?.let { id ->
            // the user may have moved the folder to the trash: then make a new one instead of uploading into the trash
            val ok = try { !call("GET", "$API/files/${enc(id)}?fields=trashed", token).optBoolean("trashed", false) }
                     catch (e: DriveError) { if (e.code == "gone") false else throw e }
            if (ok) return id
        }
        val query = "name='${q(FOLDER_NAME)}' and mimeType='$FOLDER_MIME' and trashed=false and 'root' in parents"
        val found = call("GET", "$API/files?q=${enc(query)}&spaces=drive&fields=${enc("files(id)")}&pageSize=1", token)
            .optJSONArray("files")?.optJSONObject(0)?.optString("id")
        val id = if (!found.isNullOrBlank()) found else
            call("POST", "$API/files?fields=id", token,
                JSONObject().put("name", FOLDER_NAME).put("mimeType", FOLDER_MIME).toString().toByteArray(Charsets.UTF_8)).getString("id")
        prefs(c).edit().putString(key, id).apply()
        return id
    }

    private fun upload(token: String, folder: String, name: String, data: ByteArray): String {
        val boundary = "maleem" + System.nanoTime()
        val meta = JSONObject().put("name", name).put("mimeType", "application/json")
            .put("parents", JSONArray().put(folder)).toString()
        val out = ByteArrayOutputStream()
        fun w(s: String) = out.write(s.toByteArray(Charsets.UTF_8))
        w("--$boundary\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n$meta\r\n")
        w("--$boundary\r\nContent-Type: application/json\r\n\r\n"); out.write(data); w("\r\n--$boundary--\r\n")
        return call("POST", UPLOAD, token, out.toByteArray(), "multipart/related; boundary=$boundary").getString("id")
    }

    /** Keeps the newest [KEEP] files of this member (names starting with [prefix]) in the folder; deletes the rest. */
    private fun prune(token: String, folder: String, prefix: String) {
        val query = "'${q(folder)}' in parents and name contains '${q(prefix)}' and trashed=false"
        val files = call("GET", "$API/files?q=${enc(query)}&spaces=drive&orderBy=${enc("createdTime desc")}&fields=${enc("files(id,name)")}&pageSize=100", token)
            .optJSONArray("files") ?: return
        var n = 0
        for (i in 0 until files.length()) {
            val f = files.optJSONObject(i) ?: continue
            // "contains" also matches in the middle of a name: compare the start here, like on the phone
            if (!f.optString("name").startsWith(prefix)) continue
            if (++n > KEEP) try { call("DELETE", "$API/files/${enc(f.optString("id"))}", token) } catch (_: DriveError) { }
        }
    }

    /** Uploads one backup file; a folder the user deleted is made again. Throws DriveError with a short code. */
    fun backup(c: Context, token: String, account: String, name: String, data: ByteArray, prefix: String) {
        var folder = folderId(c, token, account, false)
        try { upload(token, folder, name, data) }
        catch (e: DriveError) {
            if (e.code != "gone") throw e
            folder = folderId(c, token, account, true)
            upload(token, folder, name, data)
        }
        if (prefix.isNotBlank()) try { prune(token, folder, prefix) } catch (_: DriveError) { } // trimming can wait for next time
    }

    /* ---------- Restore: find the backups this app uploaded, and download one ---------- */

    /**
     * Every backup file Maleem uploaded to this account, newest first: [{id, name, at (ms), size}].
     * drive.file only ever shows files this app made, so this finds them even if the user moved the "Maleem" folder.
     */
    fun list(token: String): JSONArray {
        val query = "mimeType='application/json' and name contains 'Maleem' and trashed=false"
        val out = JSONArray()
        var page: String? = null
        var rounds = 0
        do {
            val url = "$API/files?q=${enc(query)}&spaces=drive&orderBy=${enc("createdTime desc")}" +
                "&fields=${enc("nextPageToken,files(id,name,createdTime,size)")}&pageSize=200" +
                (page?.let { "&pageToken=${enc(it)}" } ?: "")
            val res = call("GET", url, token)
            val files = res.optJSONArray("files") ?: JSONArray()
            for (i in 0 until files.length()) {
                val f = files.optJSONObject(i) ?: continue
                val name = f.optString("name")
                if (!name.startsWith("Maleem") || !name.endsWith(".json")) continue
                val at = try { Instant.parse(f.optString("createdTime")).toEpochMilli() } catch (_: Exception) { 0L }
                out.put(JSONObject().put("id", f.optString("id")).put("name", name).put("at", at)
                    .put("size", f.optString("size").toLongOrNull() ?: 0L))
            }
            page = res.optString("nextPageToken").ifBlank { null }
        } while (page != null && ++rounds < 5)
        return out
    }

    /** Downloads one backup file as text (at most [max] bytes). Throws DriveError ("big" when it is larger). */
    fun download(token: String, fileId: String, max: Int): String {
        val conn = (URL("$API/files/${enc(fileId)}?alt=media").openConnection() as HttpURLConnection).apply {
            connectTimeout = 15000; readTimeout = 60000
            setRequestProperty("Authorization", "Bearer $token")
        }
        try {
            val rc = conn.responseCode
            if (rc !in 200..299) {
                val text = conn.errorStream?.use { s -> s.readBytes().toString(Charsets.UTF_8) } ?: ""
                throw failure(rc, text)
            }
            val o = ByteArrayOutputStream()
            conn.inputStream.use { s ->
                val buf = ByteArray(64 * 1024)
                while (true) {
                    val n = s.read(buf); if (n < 0) break
                    o.write(buf, 0, n)
                    if (o.size() > max) throw DriveError("big")
                }
            }
            return o.toString("UTF-8")
        } catch (e: DriveError) { throw e
        } catch (_: Exception) { throw DriveError("net")
        } finally { conn.disconnect() }
    }

    fun forget(c: Context, account: String) { prefs(c).edit().remove("folder:${account.lowercase()}").apply() }
}
