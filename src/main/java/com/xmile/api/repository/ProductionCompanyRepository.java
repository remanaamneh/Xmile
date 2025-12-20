package com.xmile.api.repository;

import com.xmile.api.model.ProductionCompany;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ProductionCompanyRepository extends JpaRepository<ProductionCompany, Long> {
    Optional<ProductionCompany> findByName(String name);
    boolean existsByName(String name);
}


