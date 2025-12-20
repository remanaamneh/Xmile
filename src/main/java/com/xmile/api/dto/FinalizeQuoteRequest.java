package com.xmile.api.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class FinalizeQuoteRequest {
    @NotNull(message = "Final price is required")
    private BigDecimal finalPrice;
    
    private String notes;
}

