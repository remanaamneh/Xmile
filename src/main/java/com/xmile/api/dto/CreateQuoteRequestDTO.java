package com.xmile.api.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateQuoteRequestDTO {
    private String eventName;
    
    @NotNull(message = "Participant count is required")
    @Min(value = 1, message = "Participant count must be at least 1")
    private Integer participantCount;
    
    private String location;
    private String eventDate;
    private String startTime;
    private Long productionCompanyId;
    
    @Min(value = 0, message = "Workers needed must be 0 or more")
    private Integer workersNeeded;
    
    private String notes;
}

