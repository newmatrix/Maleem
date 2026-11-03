package com.heshamtaha.maleem

fun main() {
    check(NativeLanguage.speechLocale("en") == "en-GB")
    check(NativeLanguage.speechLocale("ar") == "ar-SA")
    check(NativeLanguage.speechLocale("eg") == "ar-EG")
    check(NativeLanguage.speechLocale(null) == "ar-EG")
    check(NativeLanguage.speechLocale("unknown") == "ar-EG")
    fun incoming(text: String) {
        val r = PayParser.parse("bank.test", "Bank", text)
        check(r != null && r.dir == "in" && r.amount == 100.0) { "Expected refund: $text; got $r" }
    }
    incoming("Payment of EGP 100 was reversed")
    incoming("EGP 100 refunded to your account")
    incoming("تم عكس العملية بمبلغ 100 جنيه")
    incoming("تم رد مبلغ 100 جنيه إلى حسابك")
    check(PayParser.parse("bank.test", "Bank", "Payment of EGP 100 failed") == null)
    check(PayParser.parse("bank.test", "Bank", "Refund of EGP 100 failed") == null)
    check(PayParser.parse("bank.test", "Bank", "Payment of EGP 100 was not reversed") == null)
    check(PayParser.parse("bank.test", "Bank", "لم يتم عكس العملية بمبلغ 100 جنيه") == null)
    check(PayParser.parse("bank.test", "Bank", "OTP 1234 for EGP 100 refunded") == null)
    check(PayParser.parse("com.whatsapp", "Someone", "تم خصم 100 جنيه") == null)
    check(PayParser.parse("bank.test", "Bank", "EGP 100 debited from your account")?.dir == "out")
    val event = CaptureIdentity(1000, 100.0, "bank.one", "paid", "out", "key1")
    check(event == event.copy())
    check(event != event.copy(pkg = "bank.two"))
    check(event != event.copy(at = 1001))
    check(event != event.copy(key = "key2"))
    check(event != event.copy(amount = 101.0))
    check(event != event.copy(dir = "in"))
    println("PASS: 22 native parser, notification identity and speech locale checks")
}
