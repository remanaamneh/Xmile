package com.xmile.api.dto.campaign;

import jakarta.validation.constraints.NotBlank;

public record AiGenerateRequest(
        @NotBlank String prompt,
        String tone,        // "friendly" / "formal"...
        String language     // "he" / "ar" / "en"
) {}

