package com.xmile.api.dto.campaign;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateCampaignRequest(
        @NotNull Long eventId,
        @NotBlank String name
) {}

