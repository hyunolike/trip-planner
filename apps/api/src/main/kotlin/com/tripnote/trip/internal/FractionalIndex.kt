package com.tripnote.trip.internal

/**
 * 두 키 사이에 들어갈 문자열 키를 만든다. 문자는 base-62이고 비교는 바이트 순서다(DB 컬럼은 COLLATE "C").
 * 마지막 문자는 항상 가장 작은 숫자 '0'보다 크다. 그래서 어떤 키 앞에도 새 키가 들어갈 자리가 남는다.
 */
object FractionalIndex {
    private const val DIGITS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"

    fun between(before: String?, after: String?): String {
        require(before == null || after == null || before < after) { "before must sort before after: $before, $after" }
        require(before?.endsWith('0') != true) { "keys must not end with '0'" }
        require(before.orEmpty().all { it in DIGITS } && after.orEmpty().all { it in DIGITS }) { "keys must use only base-62 characters: $before, $after" }
        val low = before ?: ""
        val result = StringBuilder()
        var index = 0
        var afterBound = after // 앞쪽 자리가 after보다 작아진 뒤에는 위쪽 경계가 없다
        while (true) {
            require(afterBound == null || index < afterBound.length) { "no key fits between $before and $after" }
            val lowDigit = if (index < low.length) DIGITS.indexOf(low[index]) else 0
            val highDigit = if (afterBound != null && index < afterBound.length) DIGITS.indexOf(afterBound[index]) else DIGITS.length
            if (highDigit - lowDigit > 1) {
                result.append(DIGITS[(lowDigit + highDigit) / 2])
                return result.toString()
            }
            if (lowDigit < highDigit) afterBound = null
            result.append(DIGITS[lowDigit])
            index++
        }
    }
}
