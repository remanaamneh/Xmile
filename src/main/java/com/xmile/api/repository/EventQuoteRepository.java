package com.xmile.api.repository;

import com.xmile.api.model.EventQuote;
import com.xmile.api.model.EventQuoteStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EventQuoteRepository extends JpaRepository<EventQuote, Long> {
    List<EventQuote> findByEvent_Id(Long eventId);
    
    // Fetch all quotes for multiple events in one query (optimized for /events/my)
    // Use projection to avoid lazy loading - only fetch event_id and quote_amount
    @Query("SELECT q.event.id, q.quoteAmount FROM EventQuote q WHERE q.event.id IN :eventIds AND q.status = :status")
    List<Object[]> findApprovedQuotesByEventIds(@Param("eventIds") List<Long> eventIds, @Param("status") EventQuoteStatus status);
    
    List<EventQuote> findByProductionCompany_Id(Long productionCompanyId);
    List<EventQuote> findByStatus(EventQuoteStatus status);
    
    // Find quotes by client user ID (through event) - with JOIN FETCH to avoid lazy loading
    @Query("SELECT q FROM EventQuote q JOIN FETCH q.event e JOIN FETCH e.clientUser WHERE e.clientUser.id = :clientUserId ORDER BY q.createdAt DESC")
    List<EventQuote> findByClientUserId(@Param("clientUserId") Long clientUserId);
    
    // Find quote by ID and verify it belongs to client - with JOIN FETCH to avoid lazy loading
    @Query("SELECT q FROM EventQuote q JOIN FETCH q.event e JOIN FETCH e.clientUser WHERE q.id = :quoteId AND e.clientUser.id = :clientUserId")
    Optional<EventQuote> findByIdAndClientUserId(@Param("quoteId") Long quoteId, @Param("clientUserId") Long clientUserId);
    
    // Find pending quotes (submitted status) - with JOIN FETCH to avoid lazy loading
    @Query("SELECT q FROM EventQuote q JOIN FETCH q.event e JOIN FETCH e.clientUser WHERE q.status = :status ORDER BY q.createdAt DESC")
    List<EventQuote> findByStatusOrderByCreatedAtDesc(@Param("status") EventQuoteStatus status);
    
    // Find by ID with all relations eagerly loaded
    @Query("SELECT q FROM EventQuote q JOIN FETCH q.event e JOIN FETCH e.clientUser LEFT JOIN FETCH q.productionCompany WHERE q.id = :id")
    Optional<EventQuote> findByIdWithRelations(@Param("id") Long id);
    
    // Find all quotes with all relations eagerly loaded
    @Query("SELECT DISTINCT q FROM EventQuote q JOIN FETCH q.event e JOIN FETCH e.clientUser LEFT JOIN FETCH q.productionCompany ORDER BY q.createdAt DESC")
    List<EventQuote> findAllWithRelations();
    
    // Find quotes by status list with all relations eagerly loaded
    @Query("SELECT DISTINCT q FROM EventQuote q JOIN FETCH q.event e JOIN FETCH e.clientUser LEFT JOIN FETCH q.productionCompany WHERE q.status IN :statuses ORDER BY q.createdAt DESC")
    List<EventQuote> findByStatusInWithRelations(@Param("statuses") List<EventQuoteStatus> statuses);
    
    // Find pending quotes (SUBMITTED status) with all relations eagerly loaded for admin
    @Query("SELECT DISTINCT q FROM EventQuote q JOIN FETCH q.event e JOIN FETCH e.clientUser LEFT JOIN FETCH q.productionCompany WHERE q.status = :status ORDER BY q.createdAt DESC")
    List<EventQuote> findPendingQuotesWithRelations(@Param("status") EventQuoteStatus status);
}


