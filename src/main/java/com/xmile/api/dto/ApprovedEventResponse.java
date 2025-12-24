package com.xmile.api.dto;

import com.xmile.api.model.EventStatus;
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
public class ApprovedEventResponse {
    private Long id;
    private String name;  // title/name
    private LocalDate eventDate;
    private LocalTime startTime;
    private String location;
    private EventStatus status;
}

