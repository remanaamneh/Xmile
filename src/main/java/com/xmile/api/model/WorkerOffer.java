package com.xmile.api.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * WorkerOffer entity - represents an offer/invitation sent to a worker for a quote request
 */
@Entity
@Table(name = "worker_offers")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkerOffer {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "quote_id", nullable = false)
    private EventQuote quote;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "worker_user_id", nullable = false)
    private User workerUser;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private WorkerOfferStatus status = WorkerOfferStatus.PENDING;

    @Column(name = "pay_amount", precision = 10, scale = 2)
    private BigDecimal payAmount; // Worker's pay for this assignment

    @Column(name = "distance_km", precision = 6, scale = 2)
    private BigDecimal distanceKm; // Distance from worker's location to event

    @Column(name = "offered_at", nullable = false)
    private LocalDateTime offeredAt;

    @Column(name = "responded_at")
    private LocalDateTime respondedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
        if (offeredAt == null) offeredAt = now;
        if (status == null) status = WorkerOfferStatus.PENDING;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
        // Set respondedAt when status changes from PENDING
        if (status != WorkerOfferStatus.PENDING && respondedAt == null) {
            respondedAt = LocalDateTime.now();
        }
    }
}

