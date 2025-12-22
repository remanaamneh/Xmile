package com.xmile.api.model;

import jakarta.persistence.*;
import lombok.*;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "event_quotes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor

@Builder
public class EventQuote {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id", nullable = false)
    private Event event;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "production_company_id", nullable = true)
    private ProductionCompany productionCompany;

    @Column(name = "quote_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal quoteAmount;

    @Column(nullable = false, length = 3)
    private String currency;

    @Column(name = "xmile_commission_percent", nullable = false, precision = 5, scale = 2)
    private BigDecimal xmileCommissionPercent;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32, columnDefinition = "VARCHAR(32)")
    @Builder.Default
    private EventQuoteStatus status = EventQuoteStatus.DRAFT;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "admin_rejection_reason", columnDefinition = "TEXT")
    private String adminRejectionReason;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "rejected_at")
    private LocalDateTime rejectedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
    
    @Column(name = "requested_workers", nullable = false)
    @Builder.Default
    private Integer requestedWorkers = 0;



    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
        // Don't override status if it's already set
        if (status == null) status = EventQuoteStatus.DRAFT;
        if (currency == null) currency = "ILS";
        if (xmileCommissionPercent == null) xmileCommissionPercent = BigDecimal.ZERO;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}


