package com.tripnote.trip

import com.tripnote.trip.internal.FractionalIndex
import kotlin.random.Random
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test

class FractionalIndexTest {
    @Test
    fun `appending produces increasing keys`() {
        var previous: String? = null
        val keys = (1..200).map { FractionalIndex.between(previous, null).also { key -> previous = key } }
        assertThat(keys).isSorted()
        assertThat(keys).doesNotHaveDuplicates()
    }

    @Test
    fun `a key fits between two neighbours`() {
        assertThat(FractionalIndex.between("A", "B")).isGreaterThan("A").isLessThan("B")
        assertThat(FractionalIndex.between(null, "1")).isLessThan("1")
        assertThat(FractionalIndex.between("AZ", "B0")).isGreaterThan("AZ").isLessThan("B0")
    }

    @Test
    fun `random inserts keep a total order`() {
        val random = Random(42)
        val keys = mutableListOf(FractionalIndex.between(null, null))
        repeat(2_000) {
            val index = random.nextInt(keys.size + 1)
            val key = FractionalIndex.between(keys.getOrNull(index - 1), keys.getOrNull(index))
            keys.add(index, key)
        }
        assertThat(keys).isSorted()
        assertThat(keys).doesNotHaveDuplicates()
        assertThat(keys).allSatisfy { assertThat(it).doesNotEndWith("0") }
    }

    @Test
    fun `wrong order is rejected`() {
        assertThatThrownBy { FractionalIndex.between("B", "A") }.isInstanceOf(IllegalArgumentException::class.java)
    }

    @Test
    fun `bounds with no key between them are rejected`() {
        assertThatThrownBy { FractionalIndex.between(null, "0") }.isInstanceOf(IllegalArgumentException::class.java)
        assertThatThrownBy { FractionalIndex.between("A", "A0") }.isInstanceOf(IllegalArgumentException::class.java)
    }

    @Test
    fun `characters outside the alphabet are rejected`() {
        assertThatThrownBy { FractionalIndex.between("A-", null) }.isInstanceOf(IllegalArgumentException::class.java)
        assertThatThrownBy { FractionalIndex.between(null, "B!") }.isInstanceOf(IllegalArgumentException::class.java)
    }
}
