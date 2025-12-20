package com.xmile.api.repository;

import com.xmile.api.model.RegistrationForm;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RegistrationFormRepository extends JpaRepository<RegistrationForm, Long> {
    Optional<RegistrationForm> findByEvent_Id(Long eventId);
}


