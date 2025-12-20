package com.xmile.api.repository;

import com.xmile.api.model.RegistrationFormField;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RegistrationFormFieldRepository extends JpaRepository<RegistrationFormField, Long> {
    List<RegistrationFormField> findByForm_IdOrderBySortOrderAsc(Long formId);
}


