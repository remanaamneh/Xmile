package com.xmile.api.controller.client;

import com.xmile.api.dto.CreateQuoteRequestDTO;
import com.xmile.api.dto.QuoteRequestDTO;
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

@RestController
@RequestMapping("/client/quote-requests")
@RequiredArgsConstructor
@PreAuthorize("hasRole('CLIENT')")
public class ClientQuoteRequestController {

    private final QuoteService quoteService;

    /**
     * Helper method to extract user ID from Authentication principal
     * Supports multiple principal types: Long, String, Spring Security Jwt
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
     * Create a new quote request
     * POST /client/quote-requests
     */
    @PostMapping
    public ResponseEntity<QuoteRequestDTO> createQuoteRequest(
            @Valid @RequestBody CreateQuoteRequestDTO request,
            Authentication authentication) {
        Long userId = requireUserId(authentication);
        QuoteRequestDTO response = quoteService.createQuoteRequest(request, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Get all quote requests for the logged-in client
     * GET /client/quote-requests
     */
    @GetMapping
    public ResponseEntity<List<QuoteRequestDTO>> getMyQuoteRequests(
            Authentication authentication) {
        try {
            Long userId = requireUserId(authentication);
            System.out.println("=== GET QUOTE REQUESTS: User ID = " + userId + " ===");
            List<QuoteRequestDTO> quotes = quoteService.getQuoteRequestsByClient(userId);
            return ResponseEntity.ok(quotes);
        } catch (Exception e) {
            System.err.println("=== ERROR IN ClientQuoteRequestController.getMyQuoteRequests ===");
            e.printStackTrace(System.err);
            System.err.println("=== END ERROR ===");
            throw e;
        }
    }

    /**
     * Get a specific quote request by ID (only if it belongs to the client)
     * GET /client/quote-requests/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<QuoteRequestDTO> getQuoteRequestById(
            @PathVariable Long id,
            Authentication authentication) {
        Long userId = requireUserId(authentication);
        try {
            QuoteRequestDTO quote = quoteService.getQuoteRequestByIdForClient(id, userId);
            return ResponseEntity.ok(quote);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
    }

    /**
     * Send quote request to manager for approval
     * POST /client/quote-requests/{id}/send
     */
    @PostMapping("/{id}/send")
    public ResponseEntity<?> sendToManager(
            @PathVariable Long id,
            Authentication authentication) {
        System.out.println("=== SEND TO MANAGER ENDPOINT CALLED ===");
        System.out.println("Quote ID from path: " + id);
        System.out.println("Authentication: " + (authentication != null ? "present" : "null"));
        if (authentication != null && authentication.getPrincipal() != null) {
            System.out.println("Principal type: " + authentication.getPrincipal().getClass().getName());
            System.out.println("Principal value: " + authentication.getPrincipal());
        }
        
        Long userId = requireUserId(authentication);
        System.out.println("User ID from requireUserId: " + userId);
        System.out.println("=== END ===");
        try {
            QuoteRequestDTO quote = quoteService.sendQuoteToManager(id, userId);
            return ResponseEntity.ok(quote);
        } catch (IllegalStateException e) {
            // Return error message for invalid state
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(java.util.Map.of("error", e.getMessage() != null ? e.getMessage() : "Cannot send quote to manager"));
        } catch (RuntimeException e) {
            // Return error message for not found or access denied
            String errorMessage = e.getMessage() != null ? e.getMessage() : "Quote request not found or access denied";
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(java.util.Map.of("error", errorMessage));
        }
    }

    /**
     * Client approves the final quote
     * PUT /client/quote-requests/{id}/approve
     */
    @PutMapping("/{id}/approve")
    public ResponseEntity<QuoteRequestDTO> approveFinalQuote(
            @PathVariable Long id,
            Authentication authentication) {
        Long userId = requireUserId(authentication);
        try {
            QuoteRequestDTO quote = quoteService.approveFinalQuoteByClient(id, userId);
            return ResponseEntity.ok(quote);
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .build();
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .build();
        }
    }

    /**
     * Client rejects the final quote
     * PUT /client/quote-requests/{id}/reject
     */
    @PutMapping("/{id}/reject")
    public ResponseEntity<QuoteRequestDTO> rejectFinalQuote(
            @PathVariable Long id,
            Authentication authentication) {
        Long userId = requireUserId(authentication);
        try {
            QuoteRequestDTO quote = quoteService.rejectFinalQuoteByClient(id, userId);
            return ResponseEntity.ok(quote);
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .build();
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .build();
        }
    }
}

