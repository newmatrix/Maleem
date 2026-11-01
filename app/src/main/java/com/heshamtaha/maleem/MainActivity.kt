package com.heshamtaha.maleem

import android.Manifest
import android.accounts.Account
import android.accounts.AccountManager
import android.annotation.SuppressLint
import android.app.StatusBarManager
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.ContentUris
import android.content.ContentValues
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.BitmapFactory
import android.graphics.Color
import android.graphics.drawable.ColorDrawable
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
import androidx.activity.result.IntentSenderRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricManager.Authenticators.BIOMETRIC_WEAK
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.webkit.WebViewAssetLoader
import androidx.webkit.WebViewClientCompat
import com.google.android.gms.auth.api.identity.AuthorizationRequest
import com.google.android.gms.auth.api.identity.Identity
import com.google.android.gms.common.api.ApiException
import com.google.android.gms.common.api.CommonStatusCodes
import com.google.android.gms.common.api.Scope
import com.google.mlkit.common.MlKitException
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
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
    private var openCaptures = false
    private var recognizer: SpeechRecognizer? = null
    private var voiceWanted = false
    /** true only while our own page (https://appassets.androidplatform.net) is loaded: the JS bridge refuses anything else */
    @Volatile private var pageOk = false
    // Android's splash (background colour only) stays until the page is ready (3 seconds at most), then the page plays its own opening animation
    @Volatile private var splashDone = false

    private val pickFile = registerForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        fileCallback?.onReceiveValue(if (uri != null) arrayOf(uri) else null)
        fileCallback = null
    }
    /** Receipt photos: <input capture> opens the camera app straight away (no CAMERA permission needed for that). */
    private var cameraUri: Uri? = null
    private val takePhoto = registerForActivityResult(ActivityResultContracts.TakePicture()) { ok ->
        val u = cameraUri
        fileCallback?.onReceiveValue(if (ok && u != null) arrayOf(u) else null)
        fileCallback = null
    }
    private val askNotifications = registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted) Reminders.apply(this)
    }
    private val askStorage = registerForActivityResult(ActivityResultContracts.RequestPermission()) { }

    /* ---- Google Drive backup: the user picks his Google account once and allows "files made by Maleem" (drive.file) ---- */
    private var driveCb: ((String?, String?) -> Unit)? = null
    private val driveAuth = registerForActivityResult(ActivityResultContracts.StartIntentSenderForResult()) { res ->
        val cb = driveCb ?: return@registerForActivityResult
        driveCb = null
        try {
            val r = Identity.getAuthorizationClient(this).getAuthorizationResultFromIntent(res.data)
            cb(r.accessToken, if (r.accessToken == null) "auth" else null)
        } catch (e: ApiException) {
            cb(null, if (e.statusCode == CommonStatusCodes.DEVELOPER_ERROR) "config" else "cancel")
        } catch (_: Exception) { cb(null, "cancel") }
    }

    /**
     * Gets a Drive access token for [account] (null = let the user choose). With [interactive] false nothing is shown:
     * if Google needs the user (first time, access removed) the answer is the error "auth".
     */
    private fun driveToken(account: String?, interactive: Boolean, cb: (String?, String?) -> Unit) {
        runOnUiThread {
            try {
                val b = AuthorizationRequest.builder().setRequestedScopes(listOf(Scope(DriveBackup.SCOPE)))
                if (!account.isNullOrBlank()) b.setAccount(Account(account, "com.google"))
                Identity.getAuthorizationClient(this).authorize(b.build())
                    .addOnSuccessListener { r ->
                        val pi = r.pendingIntent
                        if (r.hasResolution() && pi != null) {
                            if (!interactive) { cb(null, "auth"); return@addOnSuccessListener }
                            driveCb?.invoke(null, "cancel")
                            driveCb = cb
                            try { driveAuth.launch(IntentSenderRequest.Builder(pi.intentSender).build()) }
                            catch (_: Exception) { driveCb = null; cb(null, "auth") }
                        } else cb(r.accessToken, if (r.accessToken == null) "auth" else null)
                    }
                    .addOnFailureListener { e ->
                        cb(null, if (e is ApiException && e.statusCode == CommonStatusCodes.DEVELOPER_ERROR) "config" else "gms")
                    }
            } catch (_: Exception) { cb(null, "gms") } // no Google Play services on this phone
        }
    }

    /* ---- Restore from Drive: the user picks one of the phone's Google accounts with Android's own chooser ---- */
    private var pickCb: ((String?, String?) -> Unit)? = null
    private val pickAccount = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { res ->
        val cb = pickCb ?: return@registerForActivityResult
        pickCb = null
        val name = if (res.resultCode == RESULT_OK) res.data?.getStringExtra(AccountManager.KEY_ACCOUNT_NAME) else null
        if (name.isNullOrBlank()) cb(null, "cancel") else cb(name, null)
    }

    /** Always shows the list of Google accounts on the phone (and "add account"), so any of them can be chosen. */
    private fun chooseAccount(cb: (String?, String?) -> Unit) {
        runOnUiThread {
            try {
                @Suppress("DEPRECATION") // the newer overload has no "always ask": with one account it would pick it silently
                val i = AccountManager.newChooseAccountIntent(null, null, arrayOf("com.google"), true, null, null, null, null)
                pickCb?.invoke(null, "cancel")
                pickCb = cb
                pickAccount.launch(i)
            } catch (_: Exception) { pickCb = null; cb(null, "gms") }
        }
    }

    /** A downloaded backup waits here until the page takes it (driveTake): big text doesn't go through evaluateJavascript. */
    @Volatile private var driveHeld: String? = null

    /** Set when the user was sent to "allow installing apps": the update installs as soon as he comes back with it allowed. */
    private var installWanted = false

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
        installSplashScreen().setKeepOnScreenCondition { !splashDone }
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        // Faster start: hash the page for the CSP header while the WebView is being created, not when the page is requested
        Thread { csp }.start()
        // an update APK left in the cache after it was installed is useless: free the space
        Thread { Updater.cleanup(this) }.start()

        // The page's own background (theme / accent the user picked), saved last time, so the screen opens in the
        // right colour instead of flashing the default one until the page has drawn.
        val ui = getSharedPreferences(UI_PREFS, MODE_PRIVATE)
        val startBg = if (ui.contains("bg")) ui.getInt("bg", 0) else ContextCompat.getColor(this, R.color.app_bg)
        window.setBackgroundDrawable(ColorDrawable(startBg))

        root = FrameLayout(this)
        root.setBackgroundColor(startBg)
        web = WebView(this)
        root.addView(web, FrameLayout.LayoutParams(-1, -1))
        setContentView(root)
        root.postDelayed({ if (!splashDone) { splashDone = true; js("window.__splashGo && window.__splashGo()") } }, 3000)
        if (ui.contains("dark")) {
            val dark = ui.getBoolean("dark", false)
            WindowCompat.getInsetsController(window, root).apply {
                isAppearanceLightStatusBars = !dark
                isAppearanceLightNavigationBars = !dark
            }
        }

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
        // no native scrollbar (in RTL it shows up on the left edge while scrolling)
        web.isVerticalScrollBarEnabled = false
        web.isHorizontalScrollBarEnabled = false
        web.setBackgroundColor(startBg)

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
                // let the page paint its first frame, then lift the splash
                view.postDelayed({ splashDone = true; js("window.__splashGo && window.__splashGo()") }, 80)
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
                // Opened from the "لقيت عملية دفع" notification: show the captured payments
                if (openCaptures) {
                    openCaptures = false
                    js("window.__captures && window.__captures(true)")
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
                if (wantsImage && params?.isCaptureEnabled == true) {
                    try {
                        val dir = File(cacheDir, "camera").apply { mkdirs() }
                        dir.listFiles()?.forEach { it.delete() } // only the photo being taken stays in the cache
                        val f = File(dir, "receipt-${System.currentTimeMillis()}.jpg")
                        val u = FileProvider.getUriForFile(this@MainActivity, "$packageName.files", f)
                        cameraUri = u
                        takePhoto.launch(u)
                        return true
                    } catch (_: Exception) { /* no camera app: fall back to the gallery */ }
                }
                return try { pickFile.launch(if (wantsImage) "image/*" else "*/*"); true } catch (_: Exception) { fileCallback = null; false }
            }
        }

        web.addJavascriptInterface(Bridge(), "AndroidBridge")
        // Only a fresh start acts on the shortcut / widget / notification action. When the activity is recreated
        // (dark-mode switch, font size, process restore...) the same intent comes back and must not reopen the sheet.
        if (savedInstanceState == null) {
            quickAdd = intent?.action == ACTION_ADD_EXPENSE
            quickVoice = intent?.action == ACTION_ADD_VOICE
            openCaptures = intent?.action == ACTION_CAPTURES
        }
        // restoreState returns null when the saved WebView state can't be used: load the page instead of a blank screen
        if (savedInstanceState == null || web.restoreState(savedInstanceState) == null) {
            web.loadUrl("https://$APP_HOST/assets/www/index.html")
        }

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
        if (intent.action == ACTION_CAPTURES) js("window.__captures && window.__captures(true)")
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        web.saveState(outState)
    }

    override fun onPause() {
        super.onPause()
        PayCapture.onNew = null
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
        // free the WebView (renderer, JS bridge) together with the activity
        try {
            web.removeJavascriptInterface("AndroidBridge")
            root.removeView(web)
            web.destroy()
        } catch (_: Exception) { }
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
        // payments captured while the app is open appear right away; the ones caught while it was closed are picked up now
        PayCapture.onNew = { js("window.__captures && window.__captures(false)") }
        js("window.__captures && window.__captures(false)")
        // back from "allow installing apps" for the update
        if (installWanted) {
            installWanted = false
            if (Updater.canInstall(this)) Updater.installIntent(this)?.let { try { startActivity(it) } catch (_: Exception) { } }
            else js("window.__updPermDenied && window.__updPermDenied()")
        }
    }

    private fun js(code: String) = web.post { web.evaluateJavascript(code, null) }

    /**
     * Keeps the newest [keep] automatic backups that start with [prefix]. Each member has his own prefix
     * ("Maleem-هشام-auto-"), so one member's backups never push out another's. The names are compared here
     * in Kotlin, not with SQL LIKE, because a member's name may contain "_" or "%".
     */
    private fun pruneAutoBackups(prefix: String, keep: Int) {
        try {
            if (Build.VERSION.SDK_INT >= 29) {
                val base = MediaStore.Downloads.EXTERNAL_CONTENT_URI
                val cursor = contentResolver.query(
                    base,
                    arrayOf(MediaStore.Downloads._ID, MediaStore.Downloads.DISPLAY_NAME),
                    "${MediaStore.Downloads.RELATIVE_PATH} = ?",
                    arrayOf(Environment.DIRECTORY_DOWNLOADS + "/Maleem/"),
                    "${MediaStore.Downloads.DATE_ADDED} DESC"
                ) ?: return
                cursor.use { c ->
                    var n = 0
                    while (c.moveToNext()) {
                        if (!(c.getString(1) ?: "").startsWith(prefix)) continue
                        n++
                        if (n > keep) contentResolver.delete(ContentUris.withAppendedId(base, c.getLong(0)), null, null)
                    }
                }
            } else {
                listOf(legacyPublicDir(), File(getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), "Maleem")).forEach { dir ->
                    dir.listFiles()
                        ?.filter { it.name.startsWith(prefix) }
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

        /**
         * Reads the text in a receipt photo (JPEG, base64) on the phone with ML Kit (Latin letters and digits).
         * Answers later with window.__ocrResult(id, json): {ok, lines:[{t,x,y,w,h}], w, h} or {ok:false, err}.
         * The photo is not sent anywhere.
         */
        @JavascriptInterface
        fun ocrImage(id: String, base64: String): Boolean {
            if (!pageOk || base64.length > 12_000_000) return false
            val key = JSONObject.quote(id.filter { it.isLetterOrDigit() }.take(24))
            fun reply(o: JSONObject) = js("window.__ocrResult && window.__ocrResult($key, ${JSONObject.quote(o.toString())})")
            Thread {
                try {
                    val bytes = Base64.decode(base64, Base64.DEFAULT)
                    val bmp = BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
                    if (bmp == null) { reply(JSONObject().put("ok", false).put("err", "image")); return@Thread }
                    val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
                    recognizer.process(InputImage.fromBitmap(bmp, 0))
                        .addOnSuccessListener { text ->
                            val lines = JSONArray()
                            for (block in text.textBlocks) for (line in block.lines) {
                                val o = JSONObject().put("t", line.text)
                                line.boundingBox?.let { r -> o.put("x", r.left).put("y", r.top).put("w", r.width()).put("h", r.height()) }
                                lines.put(o)
                            }
                            reply(JSONObject().put("ok", true).put("lines", lines).put("w", bmp.width).put("h", bmp.height))
                        }
                        .addOnFailureListener { e ->
                            val model = e is MlKitException && e.errorCode == MlKitException.UNAVAILABLE
                            reply(JSONObject().put("ok", false).put("err", if (model) "model" else "read"))
                        }
                        .addOnCompleteListener { try { recognizer.close() } catch (_: Exception) { } }
                } catch (_: Throwable) {
                    reply(JSONObject().put("ok", false).put("err", "read"))
                }
            }.start()
            return true
        }

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
                val file = safeName(name, "maleem-auto.json")
                val ok = writeDownload(file, "application/json", Base64.decode(base64, Base64.DEFAULT), true)
                // "Maleem-هشام-auto-2026-10-30.json" -> prune that member's files only
                val prefix = Regex("^(.*-auto-)\\d{4}-\\d{2}-\\d{2}\\.json$").find(file)?.groupValues?.get(1) ?: "maleem-auto-"
                if (ok) pruneAutoBackups(prefix, 7)
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
        fun cancelVoice() {
            if (!pageOk) return
            runOnUiThread {
                voiceWanted = false
                stopVoice()
            }
        }

        @JavascriptInterface
        fun haptic() {
            if (!pageOk) return
            runOnUiThread { root.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY) }
        }

        @JavascriptInterface
        fun canBiometric(): Boolean = pageOk &&
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
        fun setSecure(on: Boolean) {
            if (!pageOk) return
            runOnUiThread {
                if (on) window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
                else window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
            }
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
        fun exactAlarmsAllowed(): Boolean = pageOk && Reminders.exactAllowed(this@MainActivity)

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

        /* ===== Automatic capture from payment notifications ===== */

        /** {"on":bool,"access":bool,"sdk":int} */
        @JavascriptInterface
        fun captureState(): String {
            if (!pageOk) return "{}"
            return JSONObject()
                .put("on", PayCapture.enabled(this@MainActivity))
                .put("access", PayCapture.hasAccess(this@MainActivity))
                .put("sdk", Build.VERSION.SDK_INT)
                .toString()
        }

        @JavascriptInterface
        fun captureSet(on: Boolean) {
            if (!pageOk) return
            PayCapture.setEnabled(this@MainActivity, on)
        }

        /** The web app says whether money coming IN should also be picked up (only when the user has accounts). */
        @JavascriptInterface
        fun captureIncoming(on: Boolean) {
            if (!pageOk) return
            PayCapture.setIncoming(this@MainActivity, on)
        }

        /** Opens Android's "notification access" screen (straight to Maleem's switch on Android 11+). */
        @JavascriptInterface
        fun captureOpenSettings() {
            if (!pageOk) return
            runOnUiThread {
                val cn = PayCapture.component(this@MainActivity)
                try {
                    if (Build.VERSION.SDK_INT >= 30) startActivity(
                        Intent(Settings.ACTION_NOTIFICATION_LISTENER_DETAIL_SETTINGS)
                            .putExtra(Settings.EXTRA_NOTIFICATION_LISTENER_COMPONENT_NAME, cn.flattenToString())
                    ) else startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
                } catch (_: Exception) {
                    try { startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)) } catch (_: Exception) { }
                }
            }
        }

        /** Android 13+ blocks notification access for apps installed from an APK file until
         *  "Allow restricted settings" is turned on from the app's info screen (⋮ menu). */
        @JavascriptInterface
        fun openAppInfo() {
            if (!pageOk) return
            runOnUiThread {
                try { startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:$packageName"))) } catch (_: Exception) { }
            }
        }

        /** The captured payments waiting for the user (JSON array). They move to the web app's storage. */
        @JavascriptInterface
        fun takeCaptures(): String = if (!pageOk) "[]" else PayCapture.take(this@MainActivity)

        /** Apps the user chose to ignore: JSON array of {pkg,name}. */
        @JavascriptInterface
        fun captureBlocked(): String = if (!pageOk) "[]" else PayCapture.blocked(this@MainActivity).toString()

        @JavascriptInterface
        fun captureBlock(pkg: String, name: String, on: Boolean) {
            if (!pageOk) return
            PayCapture.setBlocked(this@MainActivity, pkg, name, on)
        }

        /* ---------- updates from GitHub (see Updater.kt) ---------- */

        /** The app's version and the last update.json read (synchronous, small: call it after the first frame). */
        @JavascriptInterface
        fun updateState(): String = if (!pageOk) "{}" else Updater.cached(this@MainActivity)

        /** Reads update.json (every 6 hours at most unless [force]); answers with window.__updInfo(json|null, err). */
        @JavascriptInterface
        fun updateCheck(force: Boolean) {
            if (!pageOk) return
            Updater.check(this@MainActivity, force) { json, err ->
                js("window.__updInfo && window.__updInfo(${if (json != null) JSONObject.quote(json) else "null"}, ${JSONObject.quote(err ?: "")})")
            }
        }

        /** The last rates.json we read plus when (synchronous, small). */
        @JavascriptInterface
        fun ratesState(): String = if (!pageOk) "{}" else Rates.cached(this@MainActivity)

        /** Reads rates.json (every 3 hours at most unless [force]); answers with window.__ratesInfo(json|null, err). */
        @JavascriptInterface
        fun ratesRefresh(force: Boolean) {
            if (!pageOk) return
            Rates.refresh(this@MainActivity, force) { json, err ->
                js("window.__ratesInfo && window.__ratesInfo(${if (json != null) JSONObject.quote(json) else "null"}, ${JSONObject.quote(err ?: "")})")
            }
        }

        /** Downloads + checks the APK: window.__updProgress(pct), then window.__updDone(err) ("" = ready). */
        @JavascriptInterface
        fun updateDownload(url: String, sha256: String, code: String) {
            if (!pageOk) return
            val c = code.toLongOrNull() ?: return
            Updater.download(this@MainActivity, url, sha256, c,
                { p -> js("window.__updProgress && window.__updProgress($p)") },
                { err -> js("window.__updDone && window.__updDone(${JSONObject.quote(err ?: "")})") })
        }

        /** Opens Android's installer ("ok"), or first the "allow installing apps" screen ("perm"). */
        @JavascriptInterface
        fun updateInstall(): String {
            if (!pageOk) return "err"
            if (!Updater.canInstall(this@MainActivity)) {
                installWanted = true
                runOnUiThread { try { startActivity(Updater.installPermissionIntent(this@MainActivity)) } catch (_: Exception) { installWanted = false } }
                return "perm"
            }
            val i = Updater.installIntent(this@MainActivity) ?: return "missing"
            runOnUiThread { try { startActivity(i) } catch (_: Exception) { } }
            return "ok"
        }

        /* ---------- Google Drive backup (see DriveBackup.kt) ---------- */

        private fun driveReply(id: String, o: JSONObject) {
            val key = JSONObject.quote(id.filter { it.isLetterOrDigit() }.take(24))
            js("window.__driveRes && window.__driveRes($key, ${JSONObject.quote(o.toString())})")
        }

        /** Lets the user choose his Google account and allow Drive; answers {ok, email} or {ok:false, err}. */
        @JavascriptInterface
        fun driveLink(id: String) {
            if (!pageOk) return
            driveToken(null, true) { token, err ->
                if (token == null) { driveReply(id, JSONObject().put("ok", false).put("err", err ?: "auth")); return@driveToken }
                Thread {
                    val o = try { JSONObject().put("ok", true).put("email", DriveBackup.email(token)) }
                            catch (e: DriveBackup.DriveError) { JSONObject().put("ok", false).put("err", e.code) }
                    driveReply(id, o)
                }.start()
            }
        }

        /**
         * Uploads one backup to the linked account's Drive (folder "Maleem") and keeps the newest 7 of that member.
         * [interactive]: may show Google's screen if access must be given again (only when the user pressed a button).
         */
        @JavascriptInterface
        fun driveUpload(id: String, account: String, name: String, base64: String, interactive: Boolean) {
            if (!pageOk || account.isBlank() || base64.length > 30_000_000) return
            val file = safeName(name, "maleem-auto.json")
            val prefix = Regex("^(.*-auto-)\\d{4}-\\d{2}-\\d{2}\\.json$").find(file)?.groupValues?.get(1) ?: ""
            val data = try { Base64.decode(base64, Base64.DEFAULT) } catch (_: Exception) { return }
            driveToken(account, interactive) { token, err ->
                if (token == null) { driveReply(id, JSONObject().put("ok", false).put("err", err ?: "auth")); return@driveToken }
                Thread {
                    val o = try { DriveBackup.backup(this@MainActivity, token, account, file, data, prefix); JSONObject().put("ok", true) }
                            catch (e: DriveBackup.DriveError) { JSONObject().put("ok", false).put("err", e.code) }
                            catch (_: Exception) { JSONObject().put("ok", false).put("err", "other") }
                    driveReply(id, o)
                }.start()
            }
        }

        /**
         * Restore, step 1: the user picks a Google account and allows Drive; answers
         * {ok, email, files:[{id, name, at, size}]} (newest first: every backup Maleem uploaded there) or {ok:false, err}.
         */
        @JavascriptInterface
        fun driveList(id: String) {
            if (!pageOk) return
            chooseAccount { account, perr ->
                if (account == null) { driveReply(id, JSONObject().put("ok", false).put("err", perr ?: "cancel")); return@chooseAccount }
                driveToken(account, true) { token, err ->
                    if (token == null) { driveReply(id, JSONObject().put("ok", false).put("err", err ?: "auth")); return@driveToken }
                    Thread {
                        val o = try { JSONObject().put("ok", true).put("email", account).put("files", DriveBackup.list(token)) }
                                catch (e: DriveBackup.DriveError) { JSONObject().put("ok", false).put("err", e.code) }
                                catch (_: Exception) { JSONObject().put("ok", false).put("err", "other") }
                        driveReply(id, o)
                    }.start()
                }
            }
        }

        /** Restore, step 2: downloads one backup file; answers {ok} and the page then takes the text with driveTake(). */
        @JavascriptInterface
        fun driveFetch(id: String, account: String, fileId: String) {
            if (!pageOk || account.isBlank() || fileId.isBlank() || fileId.length > 200) return
            driveHeld = null
            driveToken(account, true) { token, err ->
                if (token == null) { driveReply(id, JSONObject().put("ok", false).put("err", err ?: "auth")); return@driveToken }
                Thread {
                    val o = try { driveHeld = DriveBackup.download(token, fileId, 40_000_000); JSONObject().put("ok", true) }
                            catch (e: DriveBackup.DriveError) { JSONObject().put("ok", false).put("err", e.code) }
                            catch (_: Throwable) { JSONObject().put("ok", false).put("err", "other") } // OutOfMemoryError included
                    driveReply(id, o)
                }.start()
            }
        }

        /** Hands the downloaded backup to the page once, then forgets it. */
        @JavascriptInterface
        fun driveTake(): String {
            if (!pageOk) return ""
            val t = driveHeld ?: ""
            driveHeld = null
            return t
        }

        /** Unlink: forget the remembered Drive folder of that account. */
        @JavascriptInterface
        fun driveForget(account: String) {
            if (!pageOk) return
            DriveBackup.forget(this@MainActivity, account)
        }

        @JavascriptInterface
        fun setBars(color: String, dark: Boolean) {
            if (!pageOk) return
            runOnUiThread {
                try {
                    val c = Color.parseColor(color)
                    root.setBackgroundColor(c)
                    getSharedPreferences(UI_PREFS, MODE_PRIVATE).edit().putInt("bg", c).putBoolean("dark", dark).apply()
                } catch (_: Exception) { }
                WindowCompat.getInsetsController(window, root).apply {
                    isAppearanceLightStatusBars = !dark
                    isAppearanceLightNavigationBars = !dark
                }
            }
        }
    }

    companion object {
        const val APP_HOST = "appassets.androidplatform.net"
        private const val UI_PREFS = "maleem_ui"
        const val ACTION_ADD_EXPENSE = "com.heshamtaha.maleem.ADD_EXPENSE"
        const val ACTION_ADD_VOICE = "com.heshamtaha.maleem.ADD_EXPENSE_VOICE"
        const val ACTION_CAPTURES = "com.heshamtaha.maleem.CAPTURES"
    }
}
