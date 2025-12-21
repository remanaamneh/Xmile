package com.xmile.api.repository;

import com.xmile.api.model.Event;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EventRepository extends JpaRepository<Event, Long> {
    List<Event> findByClientUser_Id(Long clientUserId);
    
    // Optimized query with JOIN FETCH to avoid lazy loading issues
    @Query("SELECT e FROM Event e JOIN FETCH e.clientUser WHERE e.clientUser.id = :clientUserId")
    List<Event> findByClientUser_IdWithUser(@Param("clientUserId") Long clientUserId);
    
    List<Event> findByCompany_Id(Long companyId);
    List<Event> findByProductionCompany_Id(Long productionCompanyId);
    
    // Check if date and time are available (no conflicting events)
    List<Event> findByEventDateAndStartTime(java.time.LocalDate eventDate, java.time.LocalTime startTime);
}


