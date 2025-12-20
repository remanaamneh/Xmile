package com.xmile.api.controller;

import com.xmile.api.dto.ApproveQuoteRequest;
import com.xmile.api.dto.FinalizeQuoteRequest;
import com.xmile.api.dto.QuoteRequest;
import com.xmile.api.dto.QuoteResponse;
import com.xmile.api.service.QuoteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/quotes")
@RequiredArgsConstructor
public class QuoteController {

    private final QuoteService quoteService;

    @PostMapping
    public ResponseEntity<QuoteResponse> createQuote(
            @Valid @RequestBody QuoteRequest request,
            Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            throw new RuntimeException("Authentication required");
        }
        Long userId = (Long) authentication.getPrincipal();
        QuoteResponse response = quoteService.createQuote(request, userId);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{quoteId}/approve")
    public ResponseEntity<QuoteResponse> approveQuote(
            @PathVariable Long quoteId,
            @Valid @RequestBody ApproveQuoteRequest request,
            Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            throw new RuntimeException("Authentication required");
        }
        Long userId = (Long) authentication.getPrincipal();
        QuoteResponse response = quoteService.approveQuote(quoteId, request, userId);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<List<QuoteResponse>> getMyQuotes(
            Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            throw new RuntimeException("Authentication required");
        }
        Long userId = (Long) authentication.getPrincipal();
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
}

