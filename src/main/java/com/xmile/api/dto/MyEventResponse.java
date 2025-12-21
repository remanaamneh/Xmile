package com.xmile.api.dto;

import com.xmile.api.model.EventStatus;
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
public class MyEventResponse {
    private Long id;
    private String name;
    private EventStatus status;
    private LocalDate eventDate;
    private String location;
    private BigDecimal finalPrice; // nullable - only if quote is approved
}

