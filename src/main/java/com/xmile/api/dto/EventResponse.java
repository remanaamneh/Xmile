package com.xmile.api.dto;

import com.xmile.api.model.EventStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EventResponse {
    private Long id;
    private String name;
    private String description;
    private String location;
    private LocalDate eventDate;
    private LocalTime startTime;
    private Integer participantCount;
    private EventStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    // Contact information
    private String contactName;
    private String contactEmail;
    private String contactPhone;
    
    // User info
    private Long clientUserId;
    private String clientUserName;
    private String clientUserEmail;
}

