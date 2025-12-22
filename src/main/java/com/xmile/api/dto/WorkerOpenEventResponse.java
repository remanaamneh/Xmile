package com.xmile.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkerOpenEventResponse {
    private Long eventId;
    private Long requestId;
    private String eventName;
    private String location;
    private LocalDate eventDate;
    private LocalTime startTime;
    private Integer requiredWorkers;
    private Integer currentApplications;
}


