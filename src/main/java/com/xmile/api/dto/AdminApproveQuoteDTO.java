package com.xmile.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class AdminApproveQuoteDTO {
    @NotNull(message = "Final price is required")
    @DecimalMin(value = "0.0", inclusive = false, message = "Final price must be positive")
    private BigDecimal finalPrice;
    
    @NotNull(message = "Requested workers is required")
    @Min(value = 0, message = "Requested workers must be 0 or more")
    private Integer requestedWorkers;
    
    private String adminNotes; // Optional admin notes
}

