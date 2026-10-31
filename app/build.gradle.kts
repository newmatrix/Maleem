plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.heshamtaha.maleem"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.heshamtaha.maleem"
        minSdk = 26
        targetSdk = 36
        // GitHub Actions رقم كل بناء بيزيد لوحده، والمتجر محتاج رقم أكبر في كل تحديث
        versionCode = (System.getenv("VERSION_CODE") ?: "1").toInt() + 100 // offset keeps the code above anything already uploaded
        // the release workflow passes the tag ("v1.1" -> "1.1"); local and test builds stay "1.0"
        versionName = (System.getenv("VERSION_NAME") ?: "").removePrefix("v").ifBlank { "1.0" }
    }

    signingConfigs {
        // مفتاح ثابت للنسخة التجريبية، عشان كل APK تجريبي جديد يتثبت فوق القديم من غير ما تمسح التطبيق.
        // لو فيه مفتاح تجريبي سري (DEBUG_KEYSTORE_FILE من GitHub Secrets) بنستخدمه، لأن المفتاح اللي في الريبو
        // معروف للكل: أي حد يقدر يعمل بيه APK "تحديث" لنسخة .debug ويقرا بيانات المختبرين.
        // المفتاح اللي في الريبو بيفضل للبناء المحلي بس. نسخة Release بتتوقع بمفتاح سري من GitHub Secrets.
        getByName("debug") {
            val dks = System.getenv("DEBUG_KEYSTORE_FILE")
            if (dks != null && file(dks).exists()) {
                storeFile = file(dks)
                storePassword = System.getenv("DEBUG_KEYSTORE_PASSWORD")
                keyAlias = System.getenv("DEBUG_KEY_ALIAS") ?: "debug"
                keyPassword = System.getenv("DEBUG_KEYSTORE_PASSWORD")
            } else {
                storeFile = file("debug.keystore")
                storePassword = "android"
                keyAlias = "androiddebugkey"
                keyPassword = "android"
            }
        }
        create("release") {
            val ks = System.getenv("KEYSTORE_FILE")
            if (ks != null && file(ks).exists()) {
                storeFile = file(ks)
                storePassword = System.getenv("KEYSTORE_PASSWORD")
                keyAlias = System.getenv("KEY_ALIAS") ?: "upload"
                keyPassword = System.getenv("KEYSTORE_PASSWORD")
            }
        }
    }

    buildTypes {
        debug {
            applicationIdSuffix = ".debug"
            versionNameSuffix = "-debug"
        }
        release {
            if (System.getenv("KEYSTORE_FILE") != null) signingConfig = signingConfigs.getByName("release")
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    androidResources {
        noCompress += listOf("woff2")
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.core:core-splashscreen:1.0.1")
    // Reading receipt photos on the phone (Latin text and digits). Unbundled: the model comes with Google Play services, so the APK barely grows
    implementation("com.google.android.gms:play-services-mlkit-text-recognition:19.0.0")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.activity:activity-ktx:1.9.3")
    implementation("androidx.webkit:webkit:1.12.1")
    implementation("androidx.biometric:biometric:1.1.0")
    // Google Drive backup: the user picks his account and allows "files made by Maleem" (drive.file) with Google's own screen
    implementation("com.google.android.gms:play-services-auth:21.2.0")
}
