package com.xmile.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkerShiftResponse {
    private Long id;
    private Long eventId;
    private String eventName;
    private LocalDate workDate;
    private BigDecimal hours;
    private String notes;
}


