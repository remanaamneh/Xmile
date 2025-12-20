package com.xmile.api.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class QuoteRequest {
    private String eventName;

    @NotNull(message = "Participant count is required")
    @Min(value = 1, message = "Participant count must be at least 1")
    private Integer participantCount;

    private String location;

    private String eventDate;

    private String startTime;

    private Long productionCompanyId;

    private String notes;
}

