package com.xmile.api.dto.admin;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class ProductionCompanyUpdateRequest {
    @Size(max = 160, message = "name must not exceed 160 characters")
    private String name;

    @Size(max = 160, message = "contactName must not exceed 160 characters")
    private String contactName;

    @Email(message = "email must be valid")
    @Size(max = 190, message = "email must not exceed 190 characters")
    private String email;

    @Size(max = 30, message = "phone must not exceed 30 characters")
    private String phone;

    @DecimalMin(value = "0.00", message = "commissionPercent must be >= 0.00")
    private BigDecimal commissionPercent;

    private Boolean isActive;
}


