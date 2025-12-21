package com.xmile.api.controller.admin;

import com.xmile.api.model.EventWorkerRequest;
import com.xmile.api.model.WorkerApplication;
import com.xmile.api.model.WorkerApplicationStatus;
import com.xmile.api.repository.WorkerApplicationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import com.xmile.api.model.WorkerRequestStatus;
import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class WorkerApplicationAdminController {

    private final WorkerApplicationRepository workerApplicationRepository;

    /**
     * מנהל מאשר עובד לאירוע
     */
    @PutMapping("/worker-applications/{applicationId}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> approveWorker(@PathVariable Long applicationId) {

        WorkerApplication application = workerApplicationRepository
                .findById(applicationId)
                .orElseThrow(() -> new RuntimeException("Application not found"));

        EventWorkerRequest request = application.getRequest();

        long approvedCount = workerApplicationRepository
                .countByRequest_IdAndStatus(
                        request.getId(),
                        WorkerApplicationStatus.ASSIGNED
                );

        if (approvedCount >= request.getRequestedWorkers()) {
            return ResponseEntity.badRequest()
                    .body("Maximum workers already assigned");
        }

        application.setStatus(WorkerApplicationStatus.ASSIGNED);
        workerApplicationRepository.save(application);

        // 🟢 בדיקה מחדש אחרי האישור
        long updatedApprovedCount = workerApplicationRepository
                .countByRequest_IdAndStatus(
                        request.getId(),
                        WorkerApplicationStatus.ASSIGNED
                );

        // 🟢 אם הגענו למכסה – סוגרים את הבקשה
        if (updatedApprovedCount >= request.getRequestedWorkers()) {
            request.setStatus(WorkerRequestStatus.CLOSED);
            request.setClosedAt(LocalDateTime.now());
        }

        return ResponseEntity.ok("Worker approved successfully");
    }
    
    /**
     * מנהל רואה את כל בקשות העובדים לבקשת עובדים מסוימת
     */
    @GetMapping("/worker-applications/request/{requestId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getApplicationsForRequest(@PathVariable Long requestId) {

        return ResponseEntity.ok(
                workerApplicationRepository.findByRequest_Id(requestId)
        );
    }

}
