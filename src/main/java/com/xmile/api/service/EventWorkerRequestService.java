package com.xmile.api.service;

import com.xmile.api.model.*;
import com.xmile.api.repository.EventRepository;
import com.xmile.api.repository.EventWorkerRequestRepository;
import com.xmile.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class EventWorkerRequestService {

    private final EventWorkerRequestRepository workerRequestRepository;
    private final EventRepository eventRepository;

    /**
     * Create a worker request for an event (manager sends task to workers)
     */
    @Transactional
    public EventWorkerRequest createWorkerRequest(Long eventId, Integer requestedWorkers, BigDecimal radiusKm) {
        Event event = eventRepository.findById(eventId)
                .orElseThrow(() -> new RuntimeException("Event not found"));

        EventWorkerRequest request = EventWorkerRequest.builder()
                .event(event)
                .requiredCount(requestedWorkers)
                .requestedWorkers(requestedWorkers)
                .radiusKm(radiusKm != null ? radiusKm : new BigDecimal("50.00"))
                .status(WorkerRequestStatus.OPEN)
                .build();

        return workerRequestRepository.save(request);
    }

    /**
     * Get all worker requests for an event
     */
    public List<EventWorkerRequest> getWorkerRequestsByEvent(Long eventId) {
        return workerRequestRepository.findByEvent_Id(eventId);
    }

    /**
     * Get all open worker requests
     */
    public List<EventWorkerRequest> getAllOpenWorkerRequests() {
        return workerRequestRepository.findAll().stream()
                .filter(r -> r.getStatus() == WorkerRequestStatus.OPEN)
                .toList();
    }
}

