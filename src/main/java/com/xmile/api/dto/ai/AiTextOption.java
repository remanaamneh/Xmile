package com.xmile.api.dto.ai;

/**
 * Represents a single text option with its channel type
 */
public record AiTextOption(
        String channel,
        String text
) {}
