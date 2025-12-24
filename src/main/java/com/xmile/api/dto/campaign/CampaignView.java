package com.xmile.api.dto.campaign;

public record CampaignView(
        Long id,
        Long eventId,
        String name,
        String status,
        String channel,
        String subject,
        String messageText,
        Long templateId,
        long recipientsCount
) {}

