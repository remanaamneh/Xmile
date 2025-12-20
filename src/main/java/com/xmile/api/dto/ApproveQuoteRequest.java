package com.xmile.api.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ApproveQuoteRequest {
    @NotNull(message = "Representatives count is required")
    @Min(value = 1, message = "Representatives count must be at least 1")
    private Integer representativesCount;
}

