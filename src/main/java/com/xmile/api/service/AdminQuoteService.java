package com.xmile.api.service;

import com.xmile.api.dto.AdminApproveQuoteDTO;
import com.xmile.api.dto.AdminQuoteResponse;
import com.xmile.api.dto.AdminRejectQuoteDTO;
import com.xmile.api.model.Event;
import com.xmile.api.model.EventQuote;
import com.xmile.api.model.EventQuoteStatus;
import com.xmile.api.model.EventStatus;
import com.xmile.api.model.User;
import com.xmile.api.repository.EventQuoteRepository;
import com.xmile.api.repository.EventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Service for admin quote management
 * All methods use @Transactional to ensure eager loading works correctly
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AdminQuoteService {

    private final EventQuoteRepository quoteRepository;
    private final EventRepository eventRepository;

    /**
     * Get all pending quotes (status = QUOTE_PENDING or SENT_TO_MANAGER)
     * For ADMIN users, returns ALL quotes with pending status (no production_company_id filter)
     * Uses findByStatusInWithRelations to eagerly load all relations (event, clientUser, productionCompany)
     */
    @Transactional(readOnly = true)
    public List<AdminQuoteResponse> getPendingQuotes() {
        System.out.println("=== ADMIN GET PENDING QUOTES ===");
        System.out.println("Looking for quotes with status: QUOTE_PENDING or SENT_TO_MANAGER");
        
        // Use findByStatusInWithRelations to eagerly load all relations (same as history endpoint)
        List<EventQuoteStatus> pendingStatuses = List.of(
            EventQuoteStatus.QUOTE_PENDING,
            EventQuoteStatus.SENT_TO_MANAGER
        );
        
        // This query eagerly loads event, clientUser, and productionCompany (same as findAllWithRelations)
        List<EventQuote> allPendingQuotes = quoteRepository.findByStatusInWithRelations(pendingStatuses);
        
        System.out.println("=== PENDING QUOTES DEBUG ===");
        System.out.println("Total pending quotes found: " + allPendingQuotes.size());
        System.out.println("Statuses searched: QUOTE_PENDING, SENT_TO_MANAGER");
        
        // Count by status for debugging
        long quotePendingCount = allPendingQuotes.stream()
            .filter(q -> q.getStatus() == EventQuoteStatus.QUOTE_PENDING)
            .count();
        long sentToManagerCount = allPendingQuotes.stream()
            .filter(q -> q.getStatus() == EventQuoteStatus.SENT_TO_MANAGER)
            .count();
        
        System.out.println("  - QUOTE_PENDING: " + quotePendingCount);
        System.out.println("  - SENT_TO_MANAGER: " + sentToManagerCount);
        
        // Log each quote for debugging
        allPendingQuotes.forEach(q -> {
            System.out.println("  Quote ID=" + q.getId() + 
                             ", Status=" + q.getStatus() + 
                             ", Event ID=" + (q.getEvent() != null ? q.getEvent().getId() : "null") +
                             ", Event Name=" + (q.getEvent() != null ? q.getEvent().getName() : "null") +
                             ", Client User ID=" + (q.getEvent() != null && q.getEvent().getClientUser() != null ? q.getEvent().getClientUser().getId() : "null"));
        });
        System.out.println("=== END PENDING QUOTES DEBUG ===");

        return allPendingQuotes.stream()
                .map(this::toAdminQuoteResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get quote by ID with full details including client info
     * Uses JOIN FETCH to eagerly load all relations
     */
    @Transactional(readOnly = true)
    public AdminQuoteResponse getQuoteById(Long id) {
        EventQuote quote = quoteRepository.findByIdWithRelations(id)
                .orElseThrow(() -> new RuntimeException("Quote not found"));
        return toAdminQuoteResponse(quote);
    }

    /**
     * Approve a quote
     * Sets status=APPROVED, approvedAt=now, updates quote_amount and requestedWorkers
     */
    @Transactional
    public AdminQuoteResponse approveQuote(Long id, AdminApproveQuoteDTO request) {
        // Signature log to identify updated code is running
        log.info("=== ADMIN QUOTE SERVICE: APPROVE QUOTE (UPDATED CODE v1.0.7) ===");
        log.info("Quote ID: {}", id);
        log.info("Final Price: {}", request.getFinalPrice());
        log.info("Requested Workers: {}", request.getRequestedWorkers());
        
        // Check if quote exists
        EventQuote quote = quoteRepository.findByIdWithRelations(id)
                .orElseThrow(() -> {
                    log.error("Quote not found. Quote ID: {}", id);
                    return new RuntimeException("Quote not found");
                });

        log.info("Quote found. Quote ID: {}", quote.getId());
        
        // Log currentStatus before validation
        EventQuoteStatus currentStatus = quote.getStatus();
        log.info("Approve quoteId={} currentStatus={}", id, currentStatus);

        // Only QUOTE_PENDING quotes can be approved
        if (currentStatus != EventQuoteStatus.QUOTE_PENDING) {
            log.error("Invalid status for approval. Quote ID: {}, Current Status: {}", id, currentStatus);
            throw new IllegalStateException("Only quotes with status QUOTE_PENDING can be approved. Current status: " + currentStatus);
        }

        // Update final price (separate field for manager's final quote)
        quote.setFinalPrice(request.getFinalPrice());
        
        // Also update quote_amount for backward compatibility
        quote.setQuoteAmount(request.getFinalPrice());

        // Update requested workers
        quote.setRequestedWorkers(request.getRequestedWorkers());

        // Update status to PENDING_CLIENT_FINAL (waiting for client approval)
        quote.setStatus(EventQuoteStatus.PENDING_CLIENT_FINAL);
        quote.setApprovedAt(LocalDateTime.now());

        // Store admin notes in dedicated field
        if (request.getAdminNotes() != null && !request.getAdminNotes().trim().isEmpty()) {
            quote.setAdminNotes(request.getAdminNotes());
        }

        // Clear rejection reason if it exists
        quote.setAdminRejectionReason(null);

        quote = quoteRepository.save(quote);

        // Reload quote with all relations for response
        quote = quoteRepository.findByIdWithRelations(quote.getId())
                .orElseThrow(() -> new RuntimeException("Failed to reload quote with relations"));

        // Update event status to QUOTE_PENDING (waiting for client final approval)
        Event event = quote.getEvent();
        if (event != null) {
            event.setStatus(EventStatus.QUOTE_PENDING);
            eventRepository.save(event);
        }

        return toAdminQuoteResponse(quote);
    }

    /**
     * Reject a quote
     * Sets status=REJECTED, approvedAt=null, stores reason in admin_rejection_reason, sets rejected_at
     * Allows rejection for quotes with status: SENT_TO_MANAGER, MANAGER_REVIEW, or QUOTE_PENDING
     */
    @Transactional
    public AdminQuoteResponse rejectQuote(Long id, AdminRejectQuoteDTO request) {
        // Signature log to identify updated code is running
        log.info("=== ADMIN REJECT QUOTE (UPDATED CODE v1.0.7) ===");
        log.info("Quote ID: {}", id);
        log.info("Rejection reason: {}", request.getReason());
        
        EventQuote quote = quoteRepository.findByIdWithRelations(id)
                .orElseThrow(() -> {
                    log.error("Quote not found. Quote ID: {}", id);
                    return new RuntimeException("Quote not found");
                });

        // Log currentStatus before validation
        EventQuoteStatus currentStatus = quote.getStatus();
        log.info("Reject quoteId={} currentStatus={}", id, currentStatus);

        // Allow rejection for pending statuses: SENT_TO_MANAGER, MANAGER_REVIEW, or QUOTE_PENDING
        if (!(currentStatus == EventQuoteStatus.SENT_TO_MANAGER
           || currentStatus == EventQuoteStatus.MANAGER_REVIEW
           || currentStatus == EventQuoteStatus.QUOTE_PENDING)) {
            log.error("Invalid status for rejection. Quote ID: {}, Current Status: {}", id, currentStatus);
            throw new IllegalStateException(
                "Only quotes with status SENT_TO_MANAGER, MANAGER_REVIEW, or QUOTE_PENDING can be rejected. Current status: " + currentStatus
            );
        }

        // Update status to REJECTED
        quote.setStatus(EventQuoteStatus.REJECTED);
        quote.setApprovedAt(null);
        quote.setRejectedAt(LocalDateTime.now());
        quote.setUpdatedAt(LocalDateTime.now());

        // Store rejection reason in dedicated column
        quote.setAdminRejectionReason(request.getReason());

        log.info("Setting status to REJECTED. rejected_at: {}, admin_rejection_reason: {}", 
                quote.getRejectedAt(), quote.getAdminRejectionReason());

        quote = quoteRepository.save(quote);

        // Reload quote with all relations for response
        quote = quoteRepository.findByIdWithRelations(quote.getId())
                .orElseThrow(() -> new RuntimeException("Failed to reload quote with relations"));

        // Update event status to CANCELLED when quote is rejected
        Event event = quote.getEvent();
        if (event != null) {
            event.setStatus(EventStatus.CANCELLED);
            eventRepository.save(event);
        }

        log.info("Quote rejected successfully. Quote ID: {}, Final status: {}", quote.getId(), quote.getStatus());
        log.info("=== END ADMIN REJECT QUOTE ===");

        return toAdminQuoteResponse(quote);
    }

    /**
     * Convert EventQuote to AdminQuoteResponse
     * All relations should be eagerly loaded via JOIN FETCH queries
     */
    private AdminQuoteResponse toAdminQuoteResponse(EventQuote quote) {
        Event event = quote.getEvent();
        User clientUser = event != null ? event.getClientUser() : null;

        // Extract admin notes from notes field
        String notes = quote.getNotes();
        String adminNotes = null;
        if (notes != null && notes.contains("הערת מנהל:")) {
            int idx = notes.indexOf("הערת מנהל:");
            adminNotes = notes.substring(idx + "הערת מנהל:".length()).trim();
            // Remove newlines and extra spaces
            adminNotes = adminNotes.replaceAll("\\n+", " ").trim();
        }

        return AdminQuoteResponse.builder()
                .id(quote.getId())
                .eventId(event != null ? event.getId() : null)
                .eventName(event != null ? event.getName() : null)
                .participantCount(event != null ? event.getParticipantCount() : null)
                .location(event != null ? event.getLocation() : null)
                .eventDate(event != null && event.getEventDate() != null ? event.getEventDate().toString() : null)
                .startTime(event != null && event.getStartTime() != null ? event.getStartTime().toString() : null)
                .productionCompanyId(quote.getProductionCompany() != null ? quote.getProductionCompany().getId() : null)
                .productionCompanyName(quote.getProductionCompany() != null ? quote.getProductionCompany().getName() : null)
                .requestedWorkers(quote.getRequestedWorkers())
                .quoteAmount(quote.getQuoteAmount())
                .finalPrice(quote.getFinalPrice())
                .status(quote.getStatus().name()) // UPPERCASE enum name
                .notes(notes)
                .adminNotes(quote.getAdminNotes() != null ? quote.getAdminNotes() : adminNotes)
                .adminRejectionReason(quote.getAdminRejectionReason())
                .createdAt(quote.getCreatedAt())
                .updatedAt(quote.getUpdatedAt())
                .approvedAt(quote.getApprovedAt())
                .rejectedAt(quote.getRejectedAt())
                .clientUserId(clientUser != null ? clientUser.getId() : null)
                .clientUserName(clientUser != null ? clientUser.getName() : null)
                .clientUserEmail(clientUser != null ? clientUser.getEmail() : null)
                .build();
    }
}

