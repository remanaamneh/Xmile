package com.xmile.api.dto.ai;

public record AiTextsRequest(
        Long campaignId,
        String prompt
) {}
