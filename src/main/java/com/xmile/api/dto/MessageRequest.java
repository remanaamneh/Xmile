package com.xmile.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class MessageRequest {
    @NotNull(message = "Event ID is required")
    private Long eventId;

    @NotBlank(message = "Content is required")
    private String content;

    private Integer designOption;

    @NotNull(message = "Participants list is required")
    private List<String> participants;

    @NotNull(message = "Send email flag is required")
    private Boolean sendEmail;

    @NotNull(message = "Send SMS flag is required")
    private Boolean sendSMS;
}

