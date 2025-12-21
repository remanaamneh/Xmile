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
public class AdminQuoteService {

    private final EventQuoteRepository quoteRepository;
    private final EventRepository eventRepository;

    /**
     * Get all pending quotes (status = SUBMITTED)
     * Uses JOIN FETCH to eagerly load all relations
     */
    @Transactional(readOnly = true)
    public List<AdminQuoteResponse> getPendingQuotes() {
        List<EventQuote> quotes = quoteRepository.findPendingQuotesWithRelations(EventQuoteStatus.SUBMITTED);
        return quotes.stream()
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
        System.out.println("=== ADMIN QUOTE SERVICE: APPROVE QUOTE ===");
        System.out.println("Quote ID: " + id);
        System.out.println("Final Price: " + request.getFinalPrice());
        System.out.println("Requested Workers: " + request.getRequestedWorkers());
        System.out.println("=== END ===");
        
        // Check if quote exists
        EventQuote quote = quoteRepository.findByIdWithRelations(id)
                .orElseThrow(() -> {
                    System.err.println("=== QUOTE NOT FOUND ===");
                    System.err.println("Quote ID: " + id);
                    System.err.println("=== END ===");
                    return new RuntimeException("Quote not found");
                });

        System.out.println("=== QUOTE FOUND ===");
        System.out.println("Quote ID: " + quote.getId());
        System.out.println("Current Status: " + quote.getStatus());
        System.out.println("=== END ===");

        // Only SUBMITTED, SENT_TO_MANAGER, or MANAGER_REVIEW quotes can be approved
        EventQuoteStatus currentStatus = quote.getStatus();
        if (currentStatus != EventQuoteStatus.SUBMITTED && 
            currentStatus != EventQuoteStatus.SENT_TO_MANAGER &&
            currentStatus != EventQuoteStatus.MANAGER_REVIEW) {
            System.err.println("=== INVALID QUOTE STATUS ===");
            System.err.println("Quote ID: " + id);
            System.err.println("Current Status: " + currentStatus);
            System.err.println("Expected: SUBMITTED, SENT_TO_MANAGER, or MANAGER_REVIEW");
            System.err.println("=== END ===");
            throw new IllegalStateException("Only quotes with status SUBMITTED, SENT_TO_MANAGER, or MANAGER_REVIEW can be approved. Current status: " + currentStatus);
        }

        // Update quote amount with final price
        quote.setQuoteAmount(request.getFinalPrice());

        // Update requested workers
        quote.setRequestedWorkers(request.getRequestedWorkers());

        // Update status to APPROVED
        quote.setStatus(EventQuoteStatus.APPROVED);
        quote.setApprovedAt(LocalDateTime.now());

        // Store admin notes (optional) - append to existing notes
        if (request.getAdminNotes() != null && !request.getAdminNotes().trim().isEmpty()) {
            String existingNotes = quote.getNotes() != null ? quote.getNotes() : "";
            quote.setNotes(existingNotes + (existingNotes.isEmpty() ? "" : "\n\n") +
                    "הערת מנהל: " + request.getAdminNotes());
        }

        // Clear rejection reason if it exists
        quote.setAdminRejectionReason(null);

        quote = quoteRepository.save(quote);

        // Reload quote with all relations for response
        quote = quoteRepository.findByIdWithRelations(quote.getId())
                .orElseThrow(() -> new RuntimeException("Failed to reload quote with relations"));

        // Update event status
        Event event = quote.getEvent();
        System.out.println("=== UPDATING EVENT STATUS ===");
        System.out.println("Event ID: " + (event != null ? event.getId() : "null"));
        System.out.println("Current Event Status: " + (event != null ? event.getStatus() : "null"));
        System.out.println("Setting Event Status to: " + EventStatus.APPROVED);
        System.out.println("EventStatus.APPROVED enum value: " + EventStatus.APPROVED.name());
        
        if (event != null) {
            event.setStatus(EventStatus.APPROVED);
            System.out.println("Event Status after setStatus: " + event.getStatus());
            System.out.println("Event Status name (string): " + event.getStatus().name());
            event = eventRepository.save(event);
            System.out.println("Event Status after save: " + event.getStatus());
        } else {
            System.err.println("ERROR: Event is null!");
        }
        System.out.println("=== END EVENT STATUS UPDATE ===");

        return toAdminQuoteResponse(quote);
    }

    /**
     * Reject a quote
     * Sets status=REJECTED, approvedAt=null, stores reason in admin_rejection_reason
     */
    @Transactional
    public AdminQuoteResponse rejectQuote(Long id, AdminRejectQuoteDTO request) {
        EventQuote quote = quoteRepository.findByIdWithRelations(id)
                .orElseThrow(() -> new RuntimeException("Quote not found"));

        // Only SUBMITTED quotes can be rejected
        if (quote.getStatus() != EventQuoteStatus.SUBMITTED) {
            throw new IllegalStateException("Only quotes with status SUBMITTED can be rejected. Current status: " + quote.getStatus());
        }

        // Update status to REJECTED
        quote.setStatus(EventQuoteStatus.REJECTED);
        quote.setApprovedAt(null);

        // Store rejection reason in dedicated column
        quote.setAdminRejectionReason(request.getReason());

        quote = quoteRepository.save(quote);

        // Reload quote with all relations for response
        quote = quoteRepository.findByIdWithRelations(quote.getId())
                .orElseThrow(() -> new RuntimeException("Failed to reload quote with relations"));

        // Update event status
        Event event = quote.getEvent();
        event.setStatus(EventStatus.CANCELLED);
        eventRepository.save(event);

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
                .status(quote.getStatus().name()) // UPPERCASE enum name
                .notes(notes)
                .adminNotes(adminNotes)
                .adminRejectionReason(quote.getAdminRejectionReason())
                .createdAt(quote.getCreatedAt())
                .updatedAt(quote.getUpdatedAt())
                .approvedAt(quote.getApprovedAt())
                .clientUserId(clientUser != null ? clientUser.getId() : null)
                .clientUserName(clientUser != null ? clientUser.getName() : null)
                .clientUserEmail(clientUser != null ? clientUser.getEmail() : null)
                .build();
    }
}

