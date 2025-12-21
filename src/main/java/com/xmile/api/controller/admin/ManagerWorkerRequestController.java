package com.xmile.api.controller.admin;

import com.xmile.api.dto.CreateWorkerRequestDto;
import com.xmile.api.model.EventWorkerRequest;
import com.xmile.api.service.EventWorkerRequestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/admin/worker-requests")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class ManagerWorkerRequestController {

    private final EventWorkerRequestService workerRequestService;

    /**
     * Create a worker request for an event (send task to workers)
     */
    @PostMapping
    public ResponseEntity<EventWorkerRequest> createWorkerRequest(
            @Valid @RequestBody CreateWorkerRequestDto request) {
        EventWorkerRequest workerRequest = workerRequestService.createWorkerRequest(
                request.getEventId(),
                request.getRequestedWorkers(),
                request.getRadiusKm()
        );
        return ResponseEntity.ok(workerRequest);
    }

    /**
     * Get all worker requests for an event
     */
    @GetMapping("/event/{eventId}")
    public ResponseEntity<List<EventWorkerRequest>> getWorkerRequestsByEvent(@PathVariable Long eventId) {
        List<EventWorkerRequest> requests = workerRequestService.getWorkerRequestsByEvent(eventId);
        return ResponseEntity.ok(requests);
    }

    /**
     * Get all open worker requests
     */
    @GetMapping("/open")
    public ResponseEntity<List<EventWorkerRequest>> getAllOpenWorkerRequests() {
        List<EventWorkerRequest> requests = workerRequestService.getAllOpenWorkerRequests();
        return ResponseEntity.ok(requests);
    }
}

