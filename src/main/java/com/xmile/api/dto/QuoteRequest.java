package com.xmile.api.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class QuoteRequest {
    @NotNull(message = "Event ID is required")
    private Long eventId;

    @NotNull(message = "Participant count is required")
    @Min(value = 1, message = "Participant count must be at least 1")
    private Integer participantCount;

    private String notes;

    @Min(value = 0, message = "Requested workers must be 0 or more")
    private Integer requestedWorkers;

    private Long productionCompanyId;
}

