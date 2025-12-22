package com.xmile.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkerProfileDTO {
    private Long id;
    private Long userId;
    private String phone;
    private String city; // City/area for matching
    private String locationText; // Detailed location text
    private String availability; // Availability info
    private String skills; // Skills/tags (comma-separated or JSON)
    private BigDecimal homeLat;
    private BigDecimal homeLng;
    private Boolean isActive;
}

