package com.xmile.api.dto.campaign;

public record AiGenerateResponse(
        String subject,
        String messageText,
        String suggestedTemplateCode
) {}

