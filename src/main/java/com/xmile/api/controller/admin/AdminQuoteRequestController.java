package com.xmile.api.controller.admin;

import com.xmile.api.dto.AdminApproveQuoteDTO;
import com.xmile.api.dto.AdminRejectQuoteDTO;
import com.xmile.api.dto.QuoteRequestDTO;
import com.xmile.api.model.EventQuoteStatus;
import com.xmile.api.service.QuoteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/admin/quote-requests")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminQuoteRequestController {

    private final QuoteService quoteService;

    /**
     * Get all quote requests (with optional status filter)
     * GET /admin/quote-requests?status=submitted
     */
    @GetMapping
    public ResponseEntity<List<QuoteRequestDTO>> getQuoteRequests(
            @RequestParam(required = false) String status) {
        try {
            System.out.println("=== ADMIN GET QUOTE REQUESTS ===");
            System.out.println("Status parameter: " + status);
            
            EventQuoteStatus statusFilter = null;
            if (status != null && !status.trim().isEmpty()) {
                try {
                    // Map status strings to enum values
                    String statusUpper = status.toUpperCase();
                    if ("pending_approval".equalsIgnoreCase(status) || 
                        "QUOTE_PENDING".equalsIgnoreCase(status)) {
                        // Map to QUOTE_PENDING
                        statusFilter = EventQuoteStatus.QUOTE_PENDING;
                        System.out.println("Mapped " + status + " to QUOTE_PENDING");
                    } else {
                        statusFilter = EventQuoteStatus.valueOf(statusUpper);
                        System.out.println("Using status: " + statusFilter);
                    }
                } catch (IllegalArgumentException e) {
                    System.err.println("Invalid status: " + status);
                    e.printStackTrace(System.err);
                    return ResponseEntity.badRequest().build();
                }
            }
            List<QuoteRequestDTO> quotes = quoteService.getQuoteRequestsForAdmin(statusFilter);
            System.out.println("Returning " + quotes.size() + " quotes");
            System.out.println("=== END ADMIN GET QUOTE REQUESTS ===");
            return ResponseEntity.ok(quotes);
        } catch (Exception e) {
            System.err.println("=== ERROR IN AdminQuoteRequestController.getQuoteRequests ===");
            e.printStackTrace(System.err);
            System.err.println("=== END ERROR ===");
            throw e;
        }
    }

    /**
     * Get a specific quote request by ID
     * GET /admin/quote-requests/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<QuoteRequestDTO> getQuoteRequestById(@PathVariable Long id) {
        try {
            QuoteRequestDTO quote = quoteService.getQuoteRequestByIdForAdmin(id);
            return ResponseEntity.ok(quote);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    /**
     * Approve a quote request
     * POST /admin/quote-requests/{id}/approve
     */
    @PostMapping("/{id}/approve")
    public ResponseEntity<QuoteRequestDTO> approveQuoteRequest(
            @PathVariable Long id,
            @Valid @RequestBody AdminApproveQuoteDTO request) {
        try {
            QuoteRequestDTO quote = quoteService.approveQuoteByAdmin(id, request);
            return ResponseEntity.ok(quote);
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    /**
     * Reject a quote request
     * POST /admin/quote-requests/{id}/reject
     */
    @PostMapping("/{id}/reject")
    public ResponseEntity<QuoteRequestDTO> rejectQuoteRequest(
            @PathVariable Long id,
            @Valid @RequestBody AdminRejectQuoteDTO request) {
        try {
            QuoteRequestDTO quote = quoteService.rejectQuoteByAdmin(id, request);
            return ResponseEntity.ok(quote);
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }
}

