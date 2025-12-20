package com.xmile.api.dto.admin;

import com.xmile.api.model.Role;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateUserRoleRequest {
    @NotNull(message = "role is required")
    private Role role;
}


