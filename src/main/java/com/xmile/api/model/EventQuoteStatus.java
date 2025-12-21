package com.xmile.api.model;

/**
 * Status enum for EventQuote (QuoteRequest)
 * 
 * IMPORTANT: Values must match MySQL ENUM exactly (uppercase).
 * With @Enumerated(EnumType.STRING), Java enum names are stored as strings.
 * 
 * Status flow:
 * - SUBMITTED: Initial quote created (default)
 * - DRAFT: Customer editing quote
 * - SENT_TO_MANAGER: Customer sent to manager
 * - MANAGER_REVIEW: Visible in admin "Pending approvals"
 * - APPROVED: Admin approved and published to workers
 * - REJECTED: Admin rejected
 * - CANCELLED: Quote cancelled
 * - CLOSED: Event finished/cancelled
 */
public enum EventQuoteStatus {
    // All values in UPPERCASE to match MySQL ENUM
    SUBMITTED,        // Initial quote created (default)
    DRAFT,          // Customer editing quote
    SENT_TO_MANAGER,   // Customer sent to manager
    MANAGER_REVIEW,    // Visible in admin "Pending approvals"
    APPROVED,          // Admin approved and published to workers
    REJECTED,          // Admin rejected
    CANCELLED,         // Quote cancelled
    CLOSED             // Event finished/cancelled
    
    // Legacy lowercase values removed - use uppercase equivalents:
    // submitted -> SUBMITTED
    // approved -> APPROVED
    // rejected -> REJECTED
    // cancelled -> CANCELLED
}


