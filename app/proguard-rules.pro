# Keep the JavaScript bridge methods called from the web app
-keepclassmembers class com.heshamtaha.maleem.MainActivity$Bridge {
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes JavascriptInterface
