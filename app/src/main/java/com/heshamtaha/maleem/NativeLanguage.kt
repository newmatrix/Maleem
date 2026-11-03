package com.heshamtaha.maleem

/** Pure mapping shared by speech recognition and its regression tests. */
object NativeLanguage {
    fun speechLocale(language: String?): String = when (language) {
        "en" -> "en-GB"
        "ar" -> "ar-SA"
        else -> "ar-EG"
    }
}
