package com.xmile.api.controller.admin;

import com.xmile.api.dto.admin.AdminUserResponse;
import com.xmile.api.dto.admin.UpdateUserActiveRequest;
import com.xmile.api.dto.admin.UpdateUserRoleRequest;
import com.xmile.api.dto.common.ApiResponse;
import com.xmile.api.model.User;
import com.xmile.api.service.admin.AdminUserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/admin/users")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminUserController {
    private final AdminUserService adminUserService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<AdminUserResponse>>> list() {
        List<AdminUserResponse> items = adminUserService.listAll()
                .stream()
                .map(AdminUserController::toResponse)
                .toList();

        return ResponseEntity.ok(ApiResponse.<List<AdminUserResponse>>builder()
                .message("ok")
                .data(items)
                .build());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<AdminUserResponse>> get(@PathVariable Long id) {
        User user = adminUserService.getById(id);
        return ResponseEntity.ok(ApiResponse.<AdminUserResponse>builder()
                .message("ok")
                .data(toResponse(user))
                .build());
    }

    @PatchMapping("/{id}/role")
    public ResponseEntity<ApiResponse<AdminUserResponse>> updateRole(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserRoleRequest request
    ) {
        User user = adminUserService.updateRole(id, request.getRole());
        return ResponseEntity.ok(ApiResponse.<AdminUserResponse>builder()
                .message("updated")
                .data(toResponse(user))
                .build());
    }

    @PatchMapping("/{id}/active")
    public ResponseEntity<ApiResponse<AdminUserResponse>> setActive(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserActiveRequest request
    ) {
        User user = adminUserService.setActive(id, request.getIsActive());
        return ResponseEntity.ok(ApiResponse.<AdminUserResponse>builder()
                .message("updated")
                .data(toResponse(user))
                .build());
    }

    private static AdminUserResponse toResponse(User user) {
        return AdminUserResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole())
                .isActive(user.getIsActive())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }
}


