package com.xmile.api.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "events")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Event {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_user_id", nullable = false)
    private User clientUser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id")
    private Company company;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "production_company_id")
    private ProductionCompany productionCompany;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "accepted_quote_id")
    private EventQuote acceptedQuote;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, length = 255)
    private String location;

    @Column(name = "location_lat", precision = 9, scale = 6)
    private BigDecimal locationLat;

    @Column(name = "location_lng", precision = 9, scale = 6)
    private BigDecimal locationLng;

    @Column(name = "event_date", nullable = false)
    private LocalDate eventDate;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "event_datetime", nullable = true)
    private LocalDateTime eventDatetime;

    @Column(name = "participant_count", nullable = false)
    private Integer participantCount;

    @Column(name = "xmile_commission_percent", nullable = false, precision = 5, scale = 2)
    private BigDecimal xmileCommissionPercent;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30, columnDefinition = "VARCHAR(30) NOT NULL")
    private EventStatus status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
        if (status == null) status = EventStatus.DRAFT;
        if (xmileCommissionPercent == null) xmileCommissionPercent = BigDecimal.ZERO;
        if (participantCount == null) participantCount = 0;
        // Calculate event_datetime from eventDate and startTime
        if (eventDatetime == null && eventDate != null && startTime != null) {
            eventDatetime = LocalDateTime.of(eventDate, startTime);
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
        // Update event_datetime if eventDate or startTime changed
        if (eventDate != null && startTime != null) {
            eventDatetime = LocalDateTime.of(eventDate, startTime);
        }
    }
}


