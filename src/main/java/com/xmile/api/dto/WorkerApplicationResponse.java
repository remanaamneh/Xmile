package com.xmile.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkerApplicationResponse {
    private Long id;
    private Long eventId;
    private Long requestId;
    private String eventName;
    private LocalDate eventDate;
    private String location;
    private String status; // PENDING, APPROVED, REJECTED (mapped from INVITED/APPLIED, ASSIGNED, DECLINED/CANCELLED)
    private String rejectionReason;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}


