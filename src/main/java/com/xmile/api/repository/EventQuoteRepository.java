package com.xmile.api.repository;

import com.xmile.api.model.EventQuote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EventQuoteRepository extends JpaRepository<EventQuote, Long> {
    List<EventQuote> findByEvent_Id(Long eventId);
    List<EventQuote> findByProductionCompany_Id(Long productionCompanyId);
}


