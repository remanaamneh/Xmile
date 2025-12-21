package com.xmile.api.controller.admin;

import com.xmile.api.dto.AdminApproveQuoteDTO;
import com.xmile.api.dto.AdminQuoteResponse;
import com.xmile.api.dto.AdminRejectQuoteDTO;
import com.xmile.api.dto.QuoteResponse;
import com.xmile.api.service.AdminQuoteService;
import com.xmile.api.service.QuoteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/**
 * Admin-only endpoints for managing event quotes
 * All endpoints require ADMIN role
 */
@RestController
@RequestMapping("/admin/quotes")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('ROLE_ADMIN')")
public class AdminQuoteController {

    private final AdminQuoteService adminQuoteService;
    private final QuoteService quoteService;

    /**
     * Helper method to extract user ID from Authentication principal
     * Supports multiple principal types: Long, String, Spring Security Jwt
     * 
     * @param authentication Spring Security Authentication object
     * @return User ID as Long
     * @throws ResponseStatusException with 401 if cannot extract user ID
     */
    private Long requireUserId(Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
        }

        Object principal = authentication.getPrincipal();

        // Spring Security JWT
        if (principal instanceof Jwt jwt) {
            return Long.parseLong(jwt.getSubject()); // sub = "4"
        }

        if (principal instanceof String s) {
            return Long.parseLong(s);
        }

        if (principal instanceof Long l) {
            return l;
        }

        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
    }

    /**
     * GET /admin/quotes/pending
     * Returns list of quotes with status SUBMITTED
     */
    @GetMapping("/pending")
    public ResponseEntity<List<AdminQuoteResponse>> getPendingQuotes() {
        List<AdminQuoteResponse> quotes = adminQuoteService.getPendingQuotes();
        return ResponseEntity.ok(quotes);
    }

    /**
     * GET /admin/quotes/{id}
     * Returns full quote details with client info
     */
    @GetMapping("/{id}")
    public ResponseEntity<AdminQuoteResponse> getQuoteById(@PathVariable Long id) {
        try {
            AdminQuoteResponse quote = adminQuoteService.getQuoteById(id);
            return ResponseEntity.ok(quote);
        } catch (RuntimeException e) {
            if (e.getMessage() != null && e.getMessage().contains("not found")) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Quote not found");
            }
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Error retrieving quote");
        }
    }

    /**
     * PUT /admin/quotes/{quoteId}/approve
     * Accepts body {finalPrice, requestedWorkers, adminNotes}
     * Sets status=APPROVED, approvedAt=now, updates quote_amount
     * Returns QuoteResponse (same format as client endpoints)
     * Secured with @PreAuthorize - only ADMIN can access
     */
    @PutMapping("/{quoteId}/approve")
    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    public ResponseEntity<QuoteResponse> approveQuote(
            @PathVariable("quoteId") Long quoteId,
            @Valid @RequestBody AdminApproveQuoteDTO request) {
        System.out.println("=== APPROVE QUOTE REQUEST ===");
        System.out.println("Quote ID: " + quoteId);
        System.out.println("Final Price: " + request.getFinalPrice());
        System.out.println("Requested Workers: " + request.getRequestedWorkers());
        System.out.println("Admin Notes: " + request.getAdminNotes());
        System.out.println("=== END ===");
        
        try {
            // Use AdminQuoteService for approval logic, then convert to QuoteResponse
            adminQuoteService.approveQuote(quoteId, request);
            
            // Fetch the updated quote and convert to QuoteResponse
            QuoteResponse quote = quoteService.getQuoteByIdForResponse(quoteId);
            System.out.println("=== QUOTE APPROVED SUCCESSFULLY ===");
            System.out.println("Quote ID: " + quote.getId());
            System.out.println("New Status: " + quote.getStatus());
            System.out.println("=== END ===");
            return ResponseEntity.ok(quote);
        } catch (IllegalStateException e) {
            // Return 400 for invalid state (e.g., quote already approved, wrong status)
            System.err.println("=== APPROVE QUOTE: ILLEGAL STATE ===");
            System.err.println("Quote ID: " + quoteId);
            System.err.println("Error: " + e.getMessage());
            e.printStackTrace(System.err);
            System.err.println("=== END ===");
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Invalid quote status: " + e.getMessage());
        } catch (RuntimeException e) {
            // Log the full exception for debugging
            System.err.println("=== APPROVE QUOTE: RUNTIME EXCEPTION ===");
            System.err.println("Quote ID: " + quoteId);
            System.err.println("Exception Type: " + e.getClass().getName());
            System.err.println("Exception Message: " + e.getMessage());
            e.printStackTrace(System.err);
            System.err.println("=== END ===");
            
            // Return 404 for not found
            if (e.getMessage() != null && e.getMessage().contains("not found")) {
                throw new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Quote not found");
            }
            // For other runtime exceptions, return 500 with detailed error
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR, 
                    "Error approving quote: " + (e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName()));
        }
    }

    /**
     * PUT /admin/quotes/{id}/reject
     * Accepts body {reason}
     * Sets status=REJECTED, approvedAt=null, stores reason in admin_rejection_reason
     */
    @PutMapping("/{id}/reject")
    public ResponseEntity<AdminQuoteResponse> rejectQuote(
            @PathVariable Long id,
            @Valid @RequestBody AdminRejectQuoteDTO request) {
        try {
            AdminQuoteResponse quote = adminQuoteService.rejectQuote(id, request);
            return ResponseEntity.ok(quote);
        } catch (IllegalStateException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid quote status: " + e.getMessage());
        } catch (RuntimeException e) {
            if (e.getMessage() != null && e.getMessage().contains("not found")) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Quote not found");
            }
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Error processing rejection");
        }
    }
}

