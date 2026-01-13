package com.xmile.api.dto.ai;

import java.util.List;

/**
 * Response DTO for AI text generation endpoint
 * 
 * JSON format: { "texts": ["אופציה 1", "אופציה 2", "אופציה 3"] }
 * Always contains exactly 3 text options
 */
public record AiTextsResponse(
        List<String> texts
) {}
