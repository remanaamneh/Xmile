package com.xmile.api.repository;

import com.xmile.api.model.Event;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EventRepository extends JpaRepository<Event, Long> {
    List<Event> findByClientUser_Id(Long clientUserId);
    
    // Find events by client user and status
    List<Event> findByClientUser_IdAndStatus(Long clientUserId, com.xmile.api.model.EventStatus status);
    
    // Find events by client user with status in list (for APPROVED or CONFIRMED)
    @Query("SELECT e FROM Event e WHERE e.clientUser.id = :clientUserId AND e.status IN :statuses")
    List<Event> findByClientUser_IdAndStatusIn(@Param("clientUserId") Long clientUserId, @Param("statuses") List<com.xmile.api.model.EventStatus> statuses);
    
    // Optimized query with JOIN FETCH to avoid lazy loading issues
    @Query("SELECT e FROM Event e JOIN FETCH e.clientUser WHERE e.clientUser.id = :clientUserId")
    List<Event> findByClientUser_IdWithUser(@Param("clientUserId") Long clientUserId);
    
    List<Event> findByCompany_Id(Long companyId);
    List<Event> findByProductionCompany_Id(Long productionCompanyId);
    
    // Check if date and time are available (no conflicting events)
    List<Event> findByEventDateAndStartTime(java.time.LocalDate eventDate, java.time.LocalTime startTime);
    
    // Load event with acceptedQuote for deletion
    @Query("SELECT e FROM Event e LEFT JOIN FETCH e.acceptedQuote WHERE e.id = :eventId")
    java.util.Optional<Event> findByIdWithAcceptedQuote(@Param("eventId") Long eventId);
    
    // Clear accepted_quote_id before deletion to avoid foreign key constraint violation
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = "UPDATE events SET accepted_quote_id = NULL WHERE id = :eventId", nativeQuery = true)
    void clearAcceptedQuoteId(@Param("eventId") Long eventId);
}


