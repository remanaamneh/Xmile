package com.xmile.api.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CreateWorkerRequestDto {
    @NotNull(message = "Event ID is required")
    private Long eventId;

    @NotNull(message = "Requested workers count is required")
    @Min(value = 1, message = "Requested workers must be at least 1")
    private Integer requestedWorkers;

    private BigDecimal radiusKm; // Optional, default 50km
}

