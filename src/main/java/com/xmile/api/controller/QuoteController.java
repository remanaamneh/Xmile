package com.xmile.api.controller;

import com.xmile.api.dto.FinalizeQuoteRequest;
import com.xmile.api.dto.QuoteRequest;
import com.xmile.api.dto.QuoteResponse;
import com.xmile.api.service.QuoteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/quotes")
@RequiredArgsConstructor
public class QuoteController {

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

    @PostMapping
    public ResponseEntity<QuoteResponse> createQuote(
            @Valid @RequestBody QuoteRequest request,
            Authentication authentication) {
        Long userId = requireUserId(authentication);
        QuoteResponse response = quoteService.createQuote(request, userId);
        return ResponseEntity.ok(response);
    }

    // Approval endpoint moved to /admin/quotes/{id}/approve (ADMIN only)
    // This endpoint is removed for security - only admins can approve quotes

    @GetMapping
    public ResponseEntity<List<QuoteResponse>> getMyQuotes(
            Authentication authentication) {
        Long userId = requireUserId(authentication);
        List<QuoteResponse> quotes = quoteService.getQuotesByUser(userId);
        return ResponseEntity.ok(quotes);
    }

    @PostMapping("/{quoteId}/finalize")
    public ResponseEntity<QuoteResponse> finalizeQuote(
            @PathVariable Long quoteId,
            @Valid @RequestBody FinalizeQuoteRequest request) {
        // This endpoint is for company/admin to set final price
        QuoteResponse response = quoteService.finalizeQuote(quoteId, request.getFinalPrice(), request.getNotes());
        return ResponseEntity.ok(response);
    }

    /**
     * Get all pending quotes (for manager/admin)
     */
    @GetMapping("/pending")
    public ResponseEntity<List<QuoteResponse>> getPendingQuotes(Authentication authentication) {
        requireUserId(authentication); // Ensure user is authenticated
        // Check if user is admin (you might want to add role check here)
        List<QuoteResponse> quotes = quoteService.getPendingQuotes();
        return ResponseEntity.ok(quotes);
    }
}

