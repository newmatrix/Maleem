package com.heshamtaha.maleem

/**
 * Reads a bank / wallet notification and decides whether it is money that LEFT the user's account.
 * Pure Kotlin (no Android classes) so it can be tested on its own.
 *
 * Returns null for anything that is not clearly a payment: OTP codes, money received, failed / declined
 * operations, balance-only messages, chats... The user still reviews every result before it becomes an expense.
 */
object PayParser {

    data class Result(val amount: Double, val currency: String, val merchant: String, val method: String)

    /** Chat / social apps: people write "دفعت 200 جنيه" there all the time, it is never a bank message. */
    private val IGNORED_PACKAGES = setOf(
        "com.whatsapp", "com.whatsapp.w4b", "org.telegram.messenger", "org.thoughtcrime.securesms",
        "com.facebook.orca", "com.facebook.katana", "com.facebook.mlite", "com.instagram.android",
        "com.viber.voip", "com.snapchat.android", "com.twitter.android", "com.zhiliaoapp.musically",
        "com.google.android.gm", "com.microsoft.office.outlook", "com.discord", "com.skype.raider",
        "com.google.android.apps.dynamite", "com.slack", "com.microsoft.teams"
    )

    fun ignoredPackage(pkg: String) = pkg in IGNORED_PACKAGES

    private val OTP = Regex(
        "(?i)\\b(otp|one[- ]time|verification|passcode|password|pin code|security code)\\b|" +
            "رمز|كود التحقق|كود التفعيل|كلمة (ال)?سر|كلمة المرور|لا تشارك|لا تعطي|متشاركش"
    )
    private val FAILED = Regex(
        "(?i)\\b(declined|failed|unsuccessful|rejected|insufficient|reversed|cancell?ed)\\b|" +
            "مرفوض|رفض|فشل|لم تتم|غير ناجح|رصيد غير كاف|غير كافي|تم الغاء|تم إلغاء|ملغا|عكس العملية"
    )
    private val INCOMING = Regex(
        "(?i)\\b(received|credited|deposit(ed)?|refund(ed)?|cash ?back|incoming|added to your|into your|to your (account|wallet)|sent you)\\b|" +
            "استلام|استلمت|تم استلام|وارد|واردة|إيداع|ايداع|تم إضافة|تم اضافة|أضيف|اضيف|استرداد|مرتجع|كاش باك|" +
            "إلى حسابك|الى حسابك|لحسابك|إلى محفظتك|الى محفظتك|لمحفظتك|حوالة واردة"
    )
    private val OUTGOING = Regex(
        "(?i)\\b(debited|debit|purchase|purchased|withdrawn|withdrawal|paid|payment|spent|charged|sent|transfer(red)?|pos|atm)\\b|" +
            "خصم|سحب|شراء|مشتريات|دفع|مدفوع|سداد|تحويل|حولت|حوالة|ارسال|إرسال|أرسلت|ارسلت|مخصوم"
    )

    private const val NUM = "(\\d{1,3}(?:[,٬]\\d{3})+|\\d+)([.٫]\\d{1,2})?"
    private const val CUR = "(EGP|LE|L\\.E\\.?|جنيه(?:ا|ات)?|جنية|ج\\.م\\.?|جم|ج)"
    private val CUR_THEN_NUM = Regex("(?i)(?<![A-Za-z\\u0600-\\u06FF])$CUR\\s*[:.]?\\s*$NUM")
    private val NUM_THEN_CUR = Regex("(?i)$NUM\\s*$CUR(?![A-Za-z\\u0600-\\u06FF])")
    private val AMOUNT_WORD = Regex("(?i)(?:مبلغ|بمبلغ|قيمة|بقيمة|amount|amt)\\s*[:.]?\\s*$NUM")
    /**
     * An amount right after one of these words is the balance / limit, not the payment.
     * Arabic words are matched as whole words (with the usual و/ب/ل/ال prefixes and ك/ه/ة/ي suffixes),
     * so "حد" no longer matches inside "واحد" / "أحد" / "حدث".
     */
    private val NOT_PAYMENT_BEFORE = Regex(
        "(?i)(?:(?<![\\u0600-\\u06FF])[وبل]?(?:ال|ل)?(?:رصيد|متاح|حد)(?:ك|كم|ه|ة|ي)?(?![\\u0600-\\u06FF])" +
            "|\\b(?:balance|bal|avail|available|avl|limit)\\b)[^\\d]{0,22}$"
    )

    private val MERCHANT_EN = Regex("(?i)\\b(?:at|from merchant|merchant)\\s*:?\\s+([A-Za-z0-9][A-Za-z0-9 &'.*\\-]{1,38}?)(?=\\s+(?:on|at|ref|card|with|via|using|approved|was|is|has|successful(?:ly)?)\\b|\\s*[,.;]|\\s+\\d|$)")
    private val MERCHANT_TO_EN = Regex("(?i)\\bto\\s+([A-Za-z][A-Za-z0-9 &'.\\-]{1,38}?)(?=\\s+(?:on|at|ref|from|via|using|was|is|has|successful(?:ly)?)\\b|\\s*[,.;]|\\s+\\d|$)")
    private val MERCHANT_AR = Regex("(?:لدى|لدي|عند|التاجر|إلى|الى)\\s*:?\\s+([^\\d\\n,.،؛:]{2,30}?)(?=\\s+(?:في|بتاريخ|يوم|من|برقم|رقم|بنجاح|عن طريق|عبر)(?:\\s|$)|\\s*[\\n,.،؛:]|\\s+\\d|$)")

    private fun normDigits(s: String): String {
        val b = StringBuilder(s.length)
        for (ch in s) b.append(
            when (ch) {
                in '٠'..'٩' -> '0' + (ch - '٠')
                in '۰'..'۹' -> '0' + (ch - '۰')
                '\u200f', '\u200e', '\u202a', '\u202b', '\u202c', '\u00a0' -> ' '
                else -> ch
            }
        )
        return b.toString()
    }

    private fun toNumber(intPart: String, frac: String?): Double? {
        val n = (intPart.replace(",", "").replace("٬", "") + (frac?.replace("٫", ".") ?: "")).toDoubleOrNull() ?: return null
        return if (n > 0 && n < 10_000_000_000.0) n else null
    }

    private fun pickAmount(t: String): Pair<Double, String>? {
        data class Hit(val at: Int, val v: Double, val cur: String)
        val hits = ArrayList<Hit>()
        CUR_THEN_NUM.findAll(t).forEach { m -> toNumber(m.groupValues[2], m.groups[3]?.value)?.let { hits += Hit(m.range.first, it, m.groupValues[1]) } }
        NUM_THEN_CUR.findAll(t).forEach { m -> toNumber(m.groupValues[1], m.groups[2]?.value)?.let { hits += Hit(m.range.first, it, m.groupValues[3]) } }
        val good = hits.sortedBy { it.at }.filter { !NOT_PAYMENT_BEFORE.containsMatchIn(t.substring(maxOf(0, it.at - 30), it.at)) }
        good.firstOrNull()?.let { return it.v to it.cur }
        // "تم خصم مبلغ 250 من حسابك" (no currency next to the number)
        AMOUNT_WORD.find(t)?.let { m -> toNumber(m.groupValues[1], m.groups[2]?.value)?.let { return it to "" } }
        return null
    }

    private fun merchant(t: String): String {
        val m = MERCHANT_EN.find(t) ?: MERCHANT_AR.find(t) ?: MERCHANT_TO_EN.find(t) ?: return ""
        return m.groupValues[1].trim().trim('-', '*', '.', ' ').take(40)
    }

    private fun method(pkg: String, t: String): String {
        val s = (pkg + " " + t).lowercase()
        return when {
            "instapay" in s || "انستاباي" in s || "إنستاباي" in s || "ipn" in s -> "instapay"
            Regex("vodafone|fawry|etisalat|orange|wepay|we pay|cash wallet|wallet|valu|محفظ|فودافون|كاش|فوري|اتصالات|أورانج|اورنج").containsMatchIn(s) -> "wallet"
            Regex("card|visa|master|meeza|debit|credit|بطاق|كارت|فيزا|ميزة").containsMatchIn(s) -> "card"
            else -> ""
        }
    }

    fun parse(pkg: String, title: String, text: String): Result? {
        if (ignoredPackage(pkg)) return null
        val t = normDigits("$title\n$text").trim()
        if (t.length < 8) return null
        if (OTP.containsMatchIn(t) || FAILED.containsMatchIn(t)) return null
        if (!OUTGOING.containsMatchIn(t)) return null
        // "تم تحويل 500 جنيه إلى حسابك" is money coming in, even though it says تحويل
        if (INCOMING.containsMatchIn(t)) return null
        val (amount, cur) = pickAmount(t) ?: return null
        return Result(amount, cur, merchant(t), method(pkg, t))
    }
}
