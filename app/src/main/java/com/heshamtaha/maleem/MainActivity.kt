package com.heshamtaha.maleem

import android.Manifest
import android.annotation.SuppressLint
import android.app.StatusBarManager
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.ContentUris
import android.content.ContentValues
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.graphics.drawable.Icon
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.util.Base64
import android.provider.Settings
import android.view.HapticFeedbackConstants
import android.view.View
import android.view.WindowManager
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.widget.FrameLayout
import androidx.activity.OnBackPressedCallback
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricManager.Authenticators.BIOMETRIC_WEAK
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewClientCompat
import java.io.File
import java.security.MessageDigest
import org.json.JSONArray
import org.json.JSONObject

class MainActivity : AppCompatActivity() {

    private lateinit var root: FrameLayout
    private lateinit var web: WebView
    private var fileCallback: ValueCallback<Array<Uri>>? = null
    private var pausedAt = 0L
    private var quickAdd = false
    private var quickVoice = false
    private var recognizer: SpeechRecognizer? = null
    private var voiceWanted = false
    /** true only while our own page (https://appassets.androidplatform.net) is loaded: the JS bridge refuses anything else */
    @Volatile private var pageOk = false

    private val pickFile = registerForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        fileCallback?.onReceiveValue(if (uri != null) arrayOf(uri) else null)
        fileCallback = null
    }
    private val askNotifications = registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted) Reminders.apply(this)
    }
    private val askStorage = registerForActivityResult(ActivityResultContracts.RequestPermission()) { }

    /**
     * Content-Security-Policy for index.html, sent as a response header (Android only, so the web version is untouched).
     * Inline scripts are allowed only by their SHA-256 hash, computed here from the shipped file, so injected
     * <script> tags or onerror="..." attributes never run. If anything goes wrong we send no header rather than a broken one.
     */
    private val csp: String? by lazy {
        try {
            val html = assets.open("www/index.html").bufferedReader(Charsets.UTF_8).use { it.readText() }
                .replace("\r\n", "\n").replace('\r', '\n')
            val md = MessageDigest.getInstance("SHA-256")
            val hashes = Regex("<script>([\\s\\S]*?)</script>").findAll(html).map {
                "'sha256-" + Base64.encodeToString(md.digest(it.groupValues[1].toByteArray(Charsets.UTF_8)), Base64.NO_WRAP) + "'"
            }.toList()
            if (hashes.isEmpty()) null
            else "default-src 'self'; script-src 'self' ${hashes.joinToString(" ")}; style-src 'self' 'unsafe-inline'; " +
                "img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://*.googleapis.com; " +
                "frame-src 'self' blob: data:; object-src 'none'; base-uri 'none'; form-action 'none'"
        } catch (_: Exception) { null }
    }
    private val askMic = registerForActivityResult(ActivityResultContracts.RequestPermission()) { ok ->
        if (!voiceWanted) return@registerForActivityResult
        if (ok) beginListening() else { voiceWanted = false; js("window.__voiceError && window.__voiceError(9)") }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)

        root = FrameLayout(this)
        web = WebView(this)
        root.addView(web, FrameLayout.LayoutParams(-1, -1))
        setContentView(root)

        // Keep the page clear of the status bar, navigation bar and keyboard
        ViewCompat.setOnApplyWindowInsetsListener(root) { v, insets ->
            val b = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.ime())
            v.setPadding(b.left, b.top, b.right, b.bottom)
            WindowInsetsCompat.CONSUMED
        }

        val loader = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = false
            allowContentAccess = false
            textZoom = 100
            setSupportZoom(false)
        }
        web.overScrollMode = View.OVER_SCROLL_NEVER
        web.setBackgroundColor(ContextCompat.getColor(this, R.color.app_bg))

        web.webViewClient = object : WebViewClientCompat() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? {
                val res = loader.shouldInterceptRequest(request.url) ?: return null
                if (request.isForMainFrame && request.url.path?.endsWith("/index.html") == true) {
                    csp?.let { policy ->
                        val headers = HashMap<String, String>(res.responseHeaders ?: emptyMap())
                        headers["Content-Security-Policy"] = policy
                        res.responseHeaders = headers
                    }
                }
                return res
            }

            override fun onPageStarted(view: WebView, url: String, favicon: android.graphics.Bitmap?) {
                super.onPageStarted(view, url, favicon)
                pageOk = Uri.parse(url).host == APP_HOST
            }

            override fun onPageFinished(view: WebView, url: String) {
                super.onPageFinished(view, url)
                pageOk = Uri.parse(url).host == APP_HOST
                // Opened from the "مصروف جديد" shortcut: show the add sheet once the page is ready
                if (quickAdd) {
                    quickAdd = false
                    js("window.__quickAdd && window.__quickAdd()")
                }
                // Opened from the "تسجيل مصروف بالصوت" shortcut: open the voice card once the page is ready
                if (quickVoice) {
                    quickVoice = false
                    js("window.__quickVoice && window.__quickVoice()")
                }
            }

            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                if (request.url.host == APP_HOST) return false
                // Facebook / YouTube / GitHub links open outside the app
                try { startActivity(Intent(Intent.ACTION_VIEW, request.url)) } catch (_: Exception) { }
                return true
            }
        }

        web.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                webView: WebView?, callback: ValueCallback<Array<Uri>>?, params: FileChooserParams?
            ): Boolean {
                fileCallback?.onReceiveValue(null)
                fileCallback = callback
                val wantsImage = params?.acceptTypes?.any { it.startsWith("image") } == true
                return try { pickFile.launch(if (wantsImage) "image/*" else "*/*"); true } catch (_: Exception) { fileCallback = null; false }
            }
        }

        web.addJavascriptInterface(Bridge(), "AndroidBridge")
        quickAdd = intent?.action == ACTION_ADD_EXPENSE
        quickVoice = intent?.action == ACTION_ADD_VOICE
        if (savedInstanceState == null) web.loadUrl("https://$APP_HOST/assets/www/index.html")
        else web.restoreState(savedInstanceState)

        Reminders.createChannel(this)
        // The notification permission is no longer asked on first launch: the web app asks for it
        // (AndroidBridge.askNotifications) when the user turns reminders on or finishes the welcome screens.

        // Back button: close sheets / go to the home tab first, then leave the app
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                web.evaluateJavascript("window.__onBack ? window.__onBack() : false") { result ->
                    if (result != "true") {
                        isEnabled = false
                        onBackPressedDispatcher.onBackPressed()
                        isEnabled = true
                    }
                }
            }
        })
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        // App already open in the background and the shortcut was tapped
        if (intent.action == ACTION_ADD_EXPENSE) js("window.__quickAdd && window.__quickAdd()")
        if (intent.action == ACTION_ADD_VOICE) js("window.__quickVoice && window.__quickVoice()")
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        web.saveState(outState)
    }

    override fun onPause() {
        super.onPause()
        pausedAt = System.currentTimeMillis()
        // Leaving the app while listening: stop the mic and close the voice card.
        // (The permission dialog also pauses the activity, so only do this once listening has started.)
        if (recognizer != null) {
            voiceWanted = false
            stopVoice()
            js("window.__voiceStop && window.__voiceStop()")
        }
    }

    override fun onDestroy() {
        stopVoice()
        super.onDestroy()
    }

    /** Voice entry: Android's own speech service (ar-EG) turns speech into text; the web app parses it. */
    private fun beginListening() {
        if (!SpeechRecognizer.isRecognitionAvailable(this)) {
            voiceWanted = false
            js("window.__voiceError && window.__voiceError(-1)")
            return
        }
        stopVoice()
        val r = SpeechRecognizer.createSpeechRecognizer(this)
        recognizer = r
        r.setRecognitionListener(object : RecognitionListener {
            override fun onReadyForSpeech(params: Bundle?) { js("window.__voiceState && window.__voiceState('listening')") }
            override fun onBeginningOfSpeech() {}
            override fun onRmsChanged(rmsdB: Float) {}
            override fun onBufferReceived(buffer: ByteArray?) {}
            override fun onEndOfSpeech() { if (recognizer === r) js("window.__voiceState && window.__voiceState('processing')") }
            override fun onEvent(eventType: Int, params: Bundle?) {}
            override fun onError(error: Int) {
                if (recognizer !== r) return
                voiceWanted = false
                stopVoice()
                js("window.__voiceError && window.__voiceError($error)")
            }
            override fun onPartialResults(partial: Bundle?) {
                if (recognizer !== r) return
                val t = partial?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull() ?: return
                js("window.__voicePartial && window.__voicePartial(${JSONObject.quote(t)})")
            }
            override fun onResults(results: Bundle?) {
                if (recognizer !== r) return
                val list = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION) ?: arrayListOf()
                voiceWanted = false
                stopVoice()
                js("window.__voiceResult && window.__voiceResult(${JSONArray(list)})")
            }
        })
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, "ar-EG")
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, "ar-EG")
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
            putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 5)
            putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, packageName)
        }
        r.startListening(intent)
    }

    private fun stopVoice() {
        val r = recognizer
        recognizer = null
        if (r != null) {
            try { r.cancel() } catch (_: Exception) { }
            try { r.destroy() } catch (_: Exception) { }
        }
    }

    override fun onResume() {
        super.onResume()
        // Lock again if the app was in the background for more than 30 seconds
        if (pausedAt > 0 && System.currentTimeMillis() - pausedAt > 30_000) {
            js("window.__relock && window.__relock()")
        }
        pausedAt = 0
        // the exact-alarm permission may have been granted / revoked in system settings meanwhile
        try { Reminders.apply(this) } catch (_: Exception) { }
    }

    private fun js(code: String) = web.post { web.evaluateJavascript(code, null) }

    /** Keeps only the newest [keep] automatic backups (maleem-auto-*.json) in Download/Maleem. */
    private fun pruneAutoBackups(keep: Int) {
        try {
            if (Build.VERSION.SDK_INT >= 29) {
                val base = MediaStore.Downloads.EXTERNAL_CONTENT_URI
                val cursor = contentResolver.query(
                    base,
                    arrayOf(MediaStore.Downloads._ID),
                    "${MediaStore.Downloads.RELATIVE_PATH} = ? AND ${MediaStore.Downloads.DISPLAY_NAME} LIKE ?",
                    arrayOf(Environment.DIRECTORY_DOWNLOADS + "/Maleem/", "maleem-auto-%"),
                    "${MediaStore.Downloads.DATE_ADDED} DESC"
                ) ?: return
                cursor.use { c ->
                    var n = 0
                    while (c.moveToNext()) {
                        n++
                        if (n > keep) contentResolver.delete(ContentUris.withAppendedId(base, c.getLong(0)), null, null)
                    }
                }
            } else {
                listOf(legacyPublicDir(), File(getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), "Maleem")).forEach { dir ->
                    dir.listFiles()
                        ?.filter { it.name.startsWith("maleem-auto-") }
                        ?.sortedByDescending { it.lastModified() }
                        ?.drop(keep)
                        ?.forEach { it.delete() }
                }
            }
        } catch (_: Exception) { }
    }

    /** Android 9 and older: the real public Download/Maleem folder (needs WRITE_EXTERNAL_STORAGE). */
    @Suppress("DEPRECATION")
    private fun legacyPublicDir() = File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "Maleem")

    private fun hasLegacyWrite() = Build.VERSION.SDK_INT >= 29 ||
        ContextCompat.checkSelfPermission(this, Manifest.permission.WRITE_EXTERNAL_STORAGE) == PackageManager.PERMISSION_GRANTED

    /** A plain file name only: no folders, no "..", no control characters. */
    private fun safeName(name: String, fallback: String): String {
        val n = name.replace(Regex("[\\\\/:*?\"<>|\\p{Cntrl}]"), "_").trim().trimStart('.').take(120)
        return n.ifBlank { fallback }
    }

    /** Writes into Download/Maleem. Android 10+: MediaStore with IS_PENDING, so a failed write never leaves an empty file. */
    private fun writeDownload(name: String, mime: String, bytes: ByteArray, legacyFallbackToAppDir: Boolean): Boolean {
        if (Build.VERSION.SDK_INT >= 29) {
            val values = ContentValues().apply {
                put(MediaStore.Downloads.DISPLAY_NAME, name)
                put(MediaStore.Downloads.MIME_TYPE, mime)
                put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/Maleem")
                put(MediaStore.Downloads.IS_PENDING, 1)
            }
            val uri = contentResolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values) ?: return false
            try {
                val out = contentResolver.openOutputStream(uri) ?: throw IllegalStateException("no stream")
                out.use { it.write(bytes) }
                contentResolver.update(uri, ContentValues().apply { put(MediaStore.Downloads.IS_PENDING, 0) }, null, null)
            } catch (e: Exception) {
                try { contentResolver.delete(uri, null, null) } catch (_: Exception) { }
                throw e
            }
            return true
        }
        val dir = if (hasLegacyWrite()) legacyPublicDir()
            else if (legacyFallbackToAppDir) File(getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), "Maleem")
            else return false
        dir.mkdirs()
        File(dir, name).writeBytes(bytes)
        return true
    }

    /** Methods the web app calls through window.AndroidBridge. Every call is refused unless our own page is loaded. */
    inner class Bridge {

        /** Returns "ok", "perm" (Android 9-: storage permission requested, try again) or "err". */
        @JavascriptInterface
        fun saveFile(name: String, base64: String, mime: String): String {
            if (!pageOk) return "err"
            return try {
                if (Build.VERSION.SDK_INT < 29 && !hasLegacyWrite()) {
                    runOnUiThread { try { askStorage.launch(Manifest.permission.WRITE_EXTERNAL_STORAGE) } catch (_: Exception) { } }
                    "perm"
                } else if (writeDownload(safeName(name, "maleem"), mime, Base64.decode(base64, Base64.DEFAULT), false)) "ok" else "err"
            } catch (_: Exception) { "err" }
        }

        /** Automatic backup: writes the JSON to Download/Maleem without any dialog, then trims old automatic files. */
        @JavascriptInterface
        fun autoBackup(name: String, base64: String): Boolean {
            if (!pageOk) return false
            return try {
                val ok = writeDownload(safeName(name, "maleem-auto.json"), "application/json", Base64.decode(base64, Base64.DEFAULT), true)
                if (ok) pruneAutoBackups(7)
                ok
            } catch (_: Exception) { false }
        }

        @JavascriptInterface
        fun shareFile(name: String, base64: String, mime: String): Boolean {
            if (!pageOk) return false
            return try {
                val dir = File(cacheDir, "share").apply { mkdirs() }
                dir.listFiles()?.forEach { it.delete() } // don't keep old copies of your data in the cache
                val file = File(dir, safeName(name, "maleem-backup.json")).apply { writeBytes(Base64.decode(base64, Base64.DEFAULT)) }
                val uri = FileProvider.getUriForFile(this@MainActivity, "$packageName.files", file)
                val send = Intent(Intent.ACTION_SEND).apply {
                    type = mime
                    putExtra(Intent.EXTRA_STREAM, uri)
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }
                runOnUiThread { startActivity(Intent.createChooser(send, "احفظ النسخة الاحتياطية")) }
                true
            } catch (_: Exception) { false }
        }

        @JavascriptInterface
        fun startVoice() {
            if (!pageOk) return
            runOnUiThread {
                voiceWanted = true
                if (ContextCompat.checkSelfPermission(this@MainActivity, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) beginListening()
                else askMic.launch(Manifest.permission.RECORD_AUDIO)
            }
        }

        @JavascriptInterface
        fun cancelVoice() = runOnUiThread {
            voiceWanted = false
            stopVoice()
        }

        @JavascriptInterface
        fun haptic() = runOnUiThread {
            root.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY)
        }

        @JavascriptInterface
        fun canBiometric(): Boolean =
            BiometricManager.from(this@MainActivity).canAuthenticate(BIOMETRIC_WEAK) == BiometricManager.BIOMETRIC_SUCCESS

        @JavascriptInterface
        fun authenticate() {
            if (!pageOk) return
            runOnUiThread {
                val prompt = BiometricPrompt(this@MainActivity, ContextCompat.getMainExecutor(this@MainActivity),
                    object : BiometricPrompt.AuthenticationCallback() {
                        override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                            js("window.__bioResult && window.__bioResult(true)")
                        }
                        override fun onAuthenticationError(code: Int, msg: CharSequence) {
                            js("window.__bioResult && window.__bioResult(false)")
                        }
                    })
                val info = BiometricPrompt.PromptInfo.Builder()
                    .setTitle("افتح مليم")
                    .setSubtitle("استخدم بصمتك")
                    .setNegativeButtonText("الرقم السري")
                    .setAllowedAuthenticators(BIOMETRIC_WEAK)
                    .build()
                prompt.authenticate(info)
            }
        }

        /** While a PIN is on: no screenshots / screen recording, and the recent-apps preview stays blank. */
        @JavascriptInterface
        fun setSecure(on: Boolean) = runOnUiThread {
            if (on) window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
            else window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
        }

        /** Android 13+: asks for the notification permission (called when reminders are turned on). */
        @JavascriptInterface
        fun askNotifications() {
            if (!pageOk || Build.VERSION.SDK_INT < 33) return
            if (checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) return
            runOnUiThread { try { askNotifications.launch(Manifest.permission.POST_NOTIFICATIONS) } catch (_: Exception) { } }
        }

        /** false when Android may delay the reminders (exact alarms not allowed, Android 12+). */
        @JavascriptInterface
        fun exactAlarmsAllowed(): Boolean = Reminders.exactAllowed(this@MainActivity)

        @JavascriptInterface
        fun openExactAlarmSettings() {
            if (!pageOk || Build.VERSION.SDK_INT < 31) return
            runOnUiThread {
                try {
                    startActivity(Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:$packageName")))
                } catch (_: Exception) {
                    try { startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:$packageName"))) } catch (_: Exception) { }
                }
            }
        }

        @JavascriptInterface
        fun syncReminders(json: String) {
            if (!pageOk || json.length > 200_000) return
            Reminders.save(this@MainActivity, json)
            Reminders.apply(this@MainActivity)
        }

        /** Summary for the home-screen widgets (today, period total, budget...). */
        @JavascriptInterface
        fun syncWidget(json: String) {
            if (!pageOk || json.length > 20_000) return
            WidgetData.save(this@MainActivity, json)
            WidgetData.updateAll(this@MainActivity)
        }

        /** Asks the launcher to pin a widget ("small" or "medium"). Returns false if the launcher can't. */
        @JavascriptInterface
        fun pinWidget(kind: String): Boolean {
            if (!pageOk) return false
            val am = AppWidgetManager.getInstance(this@MainActivity)
            if (!am.isRequestPinAppWidgetSupported) return false
            val cls = if (kind == "medium") MaleemWidgetMedium::class.java else MaleemWidgetSmall::class.java
            return try { am.requestPinAppWidget(ComponentName(this@MainActivity, cls), null, null) } catch (_: Exception) { false }
        }

        /** Android 13+: shows the system "add tile" prompt for the voice tile. Returns false on older versions. */
        @JavascriptInterface
        fun addTile(): Boolean {
            if (!pageOk || Build.VERSION.SDK_INT < 33) return false
            runOnUiThread {
                try {
                    val sbm = getSystemService(StatusBarManager::class.java)
                    sbm.requestAddTileService(
                        ComponentName(this@MainActivity, MaleemTileService::class.java),
                        getString(R.string.tile_voice),
                        Icon.createWithResource(this@MainActivity, R.drawable.ic_tile_mic),
                        ContextCompat.getMainExecutor(this@MainActivity)
                    ) { }
                } catch (_: Exception) { }
            }
            return true
        }

        @JavascriptInterface
        fun setBars(color: String, dark: Boolean) = runOnUiThread {
            try { root.setBackgroundColor(Color.parseColor(color)) } catch (_: Exception) { }
            WindowCompat.getInsetsController(window, root).apply {
                isAppearanceLightStatusBars = !dark
                isAppearanceLightNavigationBars = !dark
            }
        }
    }

    companion object {
        const val APP_HOST = "appassets.androidplatform.net"
        const val ACTION_ADD_EXPENSE = "com.heshamtaha.maleem.ADD_EXPENSE"
        const val ACTION_ADD_VOICE = "com.heshamtaha.maleem.ADD_EXPENSE_VOICE"
    }
}
