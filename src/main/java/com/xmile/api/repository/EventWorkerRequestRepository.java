package com.xmile.api.repository;

import com.xmile.api.model.EventWorkerRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EventWorkerRequestRepository extends JpaRepository<EventWorkerRequest, Long> {
    List<EventWorkerRequest> findByEvent_Id(Long eventId);
}


