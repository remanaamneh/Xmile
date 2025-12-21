package com.xmile.api.dto;

import com.xmile.api.model.WorkerOfferStatus;
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
public class WorkerOfferDTO {
    private Long id;
    private Long quoteId;
    private Long eventId;
    private String eventName;
    private String location;
    private String eventDate;
    private String startTime;
    private Integer participantCount;
    private BigDecimal payAmount;
    private BigDecimal distanceKm;
    private WorkerOfferStatus status;
    private LocalDateTime offeredAt;
    private LocalDateTime respondedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

