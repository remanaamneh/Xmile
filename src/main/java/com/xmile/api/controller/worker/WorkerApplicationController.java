package com.xmile.api.controller.worker;
import com.xmile.api.model.EventWorkerRequest;
import com.xmile.api.model.User;
import com.xmile.api.model.WorkerApplication;
import com.xmile.api.model.WorkerApplicationStatus;
import com.xmile.api.repository.EventWorkerRequestRepository;
import com.xmile.api.repository.WorkerApplicationRepository;
import com.xmile.api.service.AuthService;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;


// DISABLED: WORKER role removed from system
//@RestController
@RequestMapping("/api/worker")
@RequiredArgsConstructor
public class WorkerApplicationController {

    private final EventWorkerRequestRepository eventWorkerRequestRepository;
    private final WorkerApplicationRepository workerApplicationRepository;
    private final AuthService authService;

    /**
     * עובד שולח בקשה לעבוד באירוע
     */
    @PostMapping("/applications/{requestId}")
    @PreAuthorize("hasRole('WORKER')")
    public ResponseEntity<?> applyToEvent(@PathVariable Long requestId) {
    	
    	User worker = authService.getCurrentUser();

        EventWorkerRequest request = eventWorkerRequestRepository
                .findById(requestId)
                .orElseThrow(() -> new RuntimeException("Worker request not found"));

        // בדיקה: לא להגיש פעמיים
        if (workerApplicationRepository.existsByRequest_IdAndUser_Id(requestId, worker.getId())) {
            return ResponseEntity.badRequest().body("Already applied to this event");
        }

        // בדיקה: לא עברנו את מספר העובדים
        long approvedCount = workerApplicationRepository
                .countByRequest_IdAndStatus(requestId, WorkerApplicationStatus.ASSIGNED);

        if (approvedCount >= request.getRequiredCount()) {
            return ResponseEntity.badRequest().body("No more workers needed");
        }

        WorkerApplication application = WorkerApplication.builder()
                .request(request)
                .user(worker)
                .status(WorkerApplicationStatus.INVITED)
                .build();

        workerApplicationRepository.save(application);

        return ResponseEntity.ok("Application sent successfully");
    }
    /**
     * עובד רואה את כל הבקשות שלו והסטטוס שלהן
     */
    @GetMapping("/applications/my")
    @PreAuthorize("hasRole('WORKER')")
    public ResponseEntity<?> getMyApplications() {

    	User worker = authService.getCurrentUser();

        return ResponseEntity.ok(
                workerApplicationRepository.findByUser_Id(worker.getId())
        );
    }

    
}


