package com.xmile.api.service.admin;

import com.xmile.api.dto.admin.ProductionCompanyCreateRequest;
import com.xmile.api.dto.admin.ProductionCompanyUpdateRequest;
import com.xmile.api.exception.BadRequestException;
import com.xmile.api.exception.NotFoundException;
import com.xmile.api.model.ProductionCompany;
import com.xmile.api.repository.ProductionCompanyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class AdminProductionCompanyService {
    private final ProductionCompanyRepository productionCompanyRepository;

    public List<ProductionCompany> listAll() {
        return productionCompanyRepository.findAll();
    }

    public ProductionCompany getById(Long id) {
        return productionCompanyRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Production company not found"));
    }

    @Transactional
    public ProductionCompany create(ProductionCompanyCreateRequest request) {
        String name = request.getName().trim();
        if (productionCompanyRepository.existsByName(name)) {
            throw new BadRequestException("Production company name already exists");
        }

        ProductionCompany entity = ProductionCompany.builder()
                .name(name)
                .contactName(request.getContactName())
                .email(request.getEmail())
                .phone(request.getPhone())
                .commissionPercent(request.getCommissionPercent() == null ? BigDecimal.ZERO : request.getCommissionPercent())
                .isActive(request.getIsActive() == null ? true : request.getIsActive())
                .build();

        return productionCompanyRepository.save(entity);
    }

    @Transactional
    public ProductionCompany update(Long id, ProductionCompanyUpdateRequest request) {
        ProductionCompany entity = getById(id);

        if (request.getName() != null) {
            String newName = request.getName().trim();
            if (!newName.equalsIgnoreCase(entity.getName()) && productionCompanyRepository.existsByName(newName)) {
                throw new BadRequestException("Production company name already exists");
            }
            entity.setName(newName);
        }
        if (request.getContactName() != null) entity.setContactName(request.getContactName());
        if (request.getEmail() != null) entity.setEmail(request.getEmail());
        if (request.getPhone() != null) entity.setPhone(request.getPhone());
        if (request.getCommissionPercent() != null) entity.setCommissionPercent(request.getCommissionPercent());
        if (request.getIsActive() != null) entity.setIsActive(request.getIsActive());

        return productionCompanyRepository.save(entity);
    }

    @Transactional
    public ProductionCompany deactivate(Long id) {
        ProductionCompany entity = getById(id);
        entity.setIsActive(false);
        return productionCompanyRepository.save(entity);
    }
}


