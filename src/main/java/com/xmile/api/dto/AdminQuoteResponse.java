package com.xmile.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * DTO for admin quote responses
 * Includes full quote details with client information
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminQuoteResponse {
    private Long id;
    private Long eventId;
    private String eventName;
    private Integer participantCount;
    private String location;
    private String eventDate;
    private String startTime;
    private Long productionCompanyId;
    private String productionCompanyName;
    private Integer requestedWorkers;
    private BigDecimal quoteAmount;
    private String status; // UPPERCASE: SUBMITTED, APPROVED, REJECTED, etc.
    private String notes;
    private String adminNotes;
    private String adminRejectionReason;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime approvedAt;
    private LocalDateTime rejectedAt;
    
    // Client information
    private Long clientUserId;
    private String clientUserName;
    private String clientUserEmail;
}

