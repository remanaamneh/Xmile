package com.xmile.api.service.campaign;

public interface NotificationSender {
    void sendEmail(String to, String subject, String body);
    void sendSms(String to, String body);
    void sendWhatsApp(String to, String body);
}

