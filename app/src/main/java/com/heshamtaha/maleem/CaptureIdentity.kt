package com.heshamtaha.maleem

/** Equality means the same notification event, not merely the same payment amount. */
internal data class CaptureIdentity(
    val at: Long,
    val amount: Double,
    val pkg: String,
    val text: String,
    val dir: String,
    val key: String
)
