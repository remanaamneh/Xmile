package com.xmile.api.service.campaign;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class NotificationSenderImpl implements NotificationSender {

    private final JavaMailSender mailSenderOrNull;

    public NotificationSenderImpl(ObjectProvider<JavaMailSender> mailSenderProvider) {
        this.mailSenderOrNull = mailSenderProvider.getIfAvailable(); // יכול להיות null
    }

    @Override
    public void sendEmail(String to, String subject, String body) {
        if (mailSenderOrNull == null) {
            // DEV fallback: log instead of sending
            System.out.println("[MAIL-DEV] Skipping email (no JavaMailSender configured).");
            System.out.println("[MAIL-DEV] To: " + to);
            System.out.println("[MAIL-DEV] Subject: " + (subject != null ? subject : "(no subject)"));
            System.out.println("[MAIL-DEV] Body: " + (body != null && body.length() > 100 ? body.substring(0, 100) + "..." : body));
            return;
        }
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setTo(to);
            msg.setSubject(subject == null || subject.isBlank() ? "XMILE" : subject);
            msg.setText(body);
            mailSenderOrNull.send(msg);
            System.out.println("[MAIL] Email sent successfully to " + to);
        } catch (Exception e) {
            System.err.println("Failed to send email to " + to + ": " + e.getMessage());
            throw new RuntimeException("Failed to send email: " + e.getMessage(), e);
        }
    }

    @Override
    public void sendSms(String to, String body) {
        // Placeholder for Twilio integration
        // For now, just log
        System.out.println("[SMS] to=" + to + " body=" + body);
        // TODO: Integrate with Twilio when API keys are available
    }

    @Override
    public void sendWhatsApp(String to, String body) {
        // Placeholder for Twilio WhatsApp integration
        // For now, just log
        System.out.println("[WHATSAPP] to=" + to + " body=" + body);
        // TODO: Integrate with Twilio WhatsApp when API keys are available
    }
}

