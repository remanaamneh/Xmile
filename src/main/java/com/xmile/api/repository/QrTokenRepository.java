package com.xmile.api.repository;

import com.xmile.api.model.QrToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface QrTokenRepository extends JpaRepository<QrToken, Long> {
    Optional<QrToken> findByToken(String token);
}


