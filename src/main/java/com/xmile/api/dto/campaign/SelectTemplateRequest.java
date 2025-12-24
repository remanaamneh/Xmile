package com.xmile.api.dto.campaign;

import jakarta.validation.constraints.NotNull;

public record SelectTemplateRequest(
        @NotNull Long templateId
) {}

