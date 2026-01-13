package com.xmile.api.dto.campaign;

import java.util.List;

public record AiGenerateResponse(
        String subject,
        String messageText,
        String suggestedTemplateCode,
        List<String> contentOptions  // Optional: 3 different content options (SMS, WhatsApp, Email)
) {
    public AiGenerateResponse(String subject, String messageText, String suggestedTemplateCode) {
        this(subject, messageText, suggestedTemplateCode, null);
    }
}

