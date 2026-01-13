package com.xmile.api.dto.ai;

import java.util.List;

/**
 * Response DTO for AI text generation endpoint
 * 
 * JSON format: 
 * {
 *   "texts": ["אופציה 1", "אופציה 2", "אופציה 3"],
 *   "options": [
 *     {"channel": "SMS", "text": "..."},
 *     {"channel": "WHATSAPP", "text": "..."},
 *     {"channel": "FORMAL", "text": "..."}
 *   ]
 * }
 * Always contains exactly 3 text options
 */
public record AiTextsResponse(
        List<String> texts,
        List<AiTextOption> options
) {
    // Backward compatibility constructor
    public AiTextsResponse(List<String> texts) {
        this(texts, texts.stream()
                .map(text -> new AiTextOption("", text))
                .toList());
    }
}
