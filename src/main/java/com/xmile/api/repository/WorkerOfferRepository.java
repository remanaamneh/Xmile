package com.xmile.api.repository;

import com.xmile.api.model.WorkerOffer;
import com.xmile.api.model.WorkerOfferStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WorkerOfferRepository extends JpaRepository<WorkerOffer, Long> {
    
    // Find all offers for a specific worker
    List<WorkerOffer> findByWorkerUser_IdOrderByOfferedAtDesc(Long workerUserId);
    
    // Find all offers for a specific quote
    List<WorkerOffer> findByQuote_Id(Long quoteId);
    
    // Find offers by status for a worker
    List<WorkerOffer> findByWorkerUser_IdAndStatusOrderByOfferedAtDesc(Long workerUserId, WorkerOfferStatus status);
    
    // Find a specific offer by quote and worker
    Optional<WorkerOffer> findByQuote_IdAndWorkerUser_Id(Long quoteId, Long workerUserId);
    
    // Count accepted offers for a quote
    @Query("SELECT COUNT(wo) FROM WorkerOffer wo WHERE wo.quote.id = :quoteId AND wo.status = :status")
    long countByQuoteIdAndStatus(@Param("quoteId") Long quoteId, @Param("status") WorkerOfferStatus status);
}

