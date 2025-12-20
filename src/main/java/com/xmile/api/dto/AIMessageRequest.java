package com.xmile.api.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AIMessageRequest {
    @NotBlank(message = "Request description is required")
    private String request;

    private Long eventId;
}

