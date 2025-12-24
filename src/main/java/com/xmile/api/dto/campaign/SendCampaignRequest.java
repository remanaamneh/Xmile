package com.xmile.api.dto.campaign;

import jakarta.validation.constraints.NotBlank;

public record SendCampaignRequest(
        @NotBlank String channel, // EMAIL/SMS/WHATSAPP
        String subject,
        String messageText
) {}

