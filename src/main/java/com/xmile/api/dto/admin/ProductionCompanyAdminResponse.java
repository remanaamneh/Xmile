package com.xmile.api.dto.admin;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class ProductionCompanyAdminResponse {
    private Long id;
    private String name;
    private String contactName;
    private String email;
    private String phone;
    private BigDecimal commissionPercent;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}


