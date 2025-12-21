package com.xmile.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuoteRequestDTO {
    private Long id;
    private Long eventId;
    private String eventName;
    private Integer participantCount;
    private String location;
    private String eventDate;
    private String startTime;
    private Long productionCompanyId;
    private String productionCompanyName;
    private Integer workersNeeded;
    private BigDecimal quoteAmount;
    private String status; // submitted (pending_approval), approved, rejected, cancelled (completed)
    private String notes;
    private String adminNote;
    private String rejectReason;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime approvedAt;
    private Long clientUserId;
    private String clientUserName;
    private String clientUserEmail;
}

