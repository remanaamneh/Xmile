package com.xmile.api.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AdminRejectQuoteDTO {
    @NotBlank(message = "Rejection reason is required")
    private String reason;
}

