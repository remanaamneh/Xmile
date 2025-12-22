package com.xmile.api.model;

/**
 * Status enum for EventQuote (QuoteRequest)
 * 
 * IMPORTANT: Values must match MySQL ENUM exactly (uppercase).
 * With @Enumerated(EnumType.STRING), Java enum names are stored as strings.
 */
public enum EventQuoteStatus {
    DRAFT,          // Customer editing quote
    QUOTE_PENDING,  // 🔥 חובה – ממתין לאישור מנהל
    SENT_TO_MANAGER, // Legacy: Customer sent to manager (treated as QUOTE_PENDING)
    APPROVED,        // Admin approved and published to workers
    REJECTED,        // Admin rejected
    COMPLETED,       // Event completed
    CANCELLED        // Quote cancelled
}


