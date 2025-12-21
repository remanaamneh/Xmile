package com.xmile.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuoteResponse {
    private Long id;
    private Long eventId;
    private String eventName;
    private Integer participantCount;
    private String location;
    private String eventDate;
    private String startTime;
    private Long productionCompanyId;
    private String productionCompanyName;
    private BigDecimal price;
    private BigDecimal totalPrice;
    private String currency;
    private String status;
    private String notes;
    private Map<String, Object> breakdown;
    private LocalDateTime createdAt;
    private LocalDateTime approvedAt;
    private Integer requestedWorkers;
    
    // Client information
    private Long clientUserId;
    private String clientUserName;
    private String clientUserEmail;
}

