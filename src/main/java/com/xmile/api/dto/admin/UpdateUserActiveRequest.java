package com.xmile.api.dto.admin;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateUserActiveRequest {
    @NotNull(message = "isActive is required")
    private Boolean isActive;
}


