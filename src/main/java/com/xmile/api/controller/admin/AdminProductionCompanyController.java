package com.xmile.api.controller.admin;

import com.xmile.api.dto.admin.ProductionCompanyAdminResponse;
import com.xmile.api.dto.admin.ProductionCompanyCreateRequest;
import com.xmile.api.dto.admin.ProductionCompanyUpdateRequest;
import com.xmile.api.dto.common.ApiResponse;
import com.xmile.api.model.ProductionCompany;
import com.xmile.api.service.admin.AdminProductionCompanyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/admin/production-companies")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminProductionCompanyController {
    private final AdminProductionCompanyService adminProductionCompanyService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<ProductionCompanyAdminResponse>>> list() {
        List<ProductionCompanyAdminResponse> items = adminProductionCompanyService.listAll()
                .stream()
                .map(AdminProductionCompanyController::toResponse)
                .toList();

        return ResponseEntity.ok(ApiResponse.<List<ProductionCompanyAdminResponse>>builder()
                .message("ok")
                .data(items)
                .build());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ProductionCompanyAdminResponse>> get(@PathVariable Long id) {
        ProductionCompany pc = adminProductionCompanyService.getById(id);
        return ResponseEntity.ok(ApiResponse.<ProductionCompanyAdminResponse>builder()
                .message("ok")
                .data(toResponse(pc))
                .build());
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ProductionCompanyAdminResponse>> create(
            @Valid @RequestBody ProductionCompanyCreateRequest request
    ) {
        ProductionCompany created = adminProductionCompanyService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.<ProductionCompanyAdminResponse>builder()
                .message("created")
                .data(toResponse(created))
                .build());
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<ProductionCompanyAdminResponse>> update(
            @PathVariable Long id,
            @Valid @RequestBody ProductionCompanyUpdateRequest request
    ) {
        ProductionCompany updated = adminProductionCompanyService.update(id, request);
        return ResponseEntity.ok(ApiResponse.<ProductionCompanyAdminResponse>builder()
                .message("updated")
                .data(toResponse(updated))
                .build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<ProductionCompanyAdminResponse>> deactivate(@PathVariable Long id) {
        ProductionCompany updated = adminProductionCompanyService.deactivate(id);
        return ResponseEntity.ok(ApiResponse.<ProductionCompanyAdminResponse>builder()
                .message("deactivated")
                .data(toResponse(updated))
                .build());
    }

    private static ProductionCompanyAdminResponse toResponse(ProductionCompany pc) {
        return ProductionCompanyAdminResponse.builder()
                .id(pc.getId())
                .name(pc.getName())
                .contactName(pc.getContactName())
                .email(pc.getEmail())
                .phone(pc.getPhone())
                .commissionPercent(pc.getCommissionPercent())
                .isActive(pc.getIsActive())
                .createdAt(pc.getCreatedAt())
                .updatedAt(pc.getUpdatedAt())
                .build();
    }
}


