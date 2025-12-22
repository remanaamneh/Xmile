package com.xmile.api.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "worker_profiles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WorkerProfile {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(length = 30)
    private String phone;

    @Column(length = 100)
    private String city; // City/area for matching

    @Column(name = "location_text", length = 255)
    private String locationText; // Detailed location text

    @Column(length = 100)
    private String availability; // Availability info

    @Column(columnDefinition = "TEXT")
    private String skills; // Skills/tags (comma-separated or JSON)

    @Column(name = "home_lat", precision = 9, scale = 6)
    private BigDecimal homeLat;

    @Column(name = "home_lng", precision = 9, scale = 6)
    private BigDecimal homeLng;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
        if (isActive == null) isActive = true;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}


