package com.tripnote.support

import java.util.concurrent.CopyOnWriteArrayList
import org.springframework.mail.SimpleMailMessage
import org.springframework.mail.javamail.JavaMailSenderImpl

class RecordingMailSender : JavaMailSenderImpl() {
    val sent = CopyOnWriteArrayList<SimpleMailMessage>()

    override fun send(vararg simpleMessages: SimpleMailMessage) {
        sent.addAll(simpleMessages)
    }
}
