package com.xmile.api.controller;

import com.xmile.api.model.ProductionCompany;
import com.xmile.api.repository.ProductionCompanyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/production-companies")
@RequiredArgsConstructor
public class ProductionCompanyController {

    private final ProductionCompanyRepository productionCompanyRepository;

    @GetMapping
    public ResponseEntity<List<ProductionCompanyResponse>> getAllActive() {
        List<ProductionCompany> companies = productionCompanyRepository.findAll()
                .stream()
                .filter(ProductionCompany::getIsActive)
                .collect(Collectors.toList());
        
        List<ProductionCompanyResponse> response = companies.stream()
                .map(c -> new ProductionCompanyResponse(c.getId(), c.getName()))
                .collect(Collectors.toList());
        
        return ResponseEntity.ok(response);
    }

    record ProductionCompanyResponse(Long id, String name) {}
}

