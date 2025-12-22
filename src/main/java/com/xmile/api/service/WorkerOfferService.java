package com.xmile.api.service;

import com.xmile.api.model.*;
import com.xmile.api.repository.EventQuoteRepository;
import com.xmile.api.repository.UserRepository;
import com.xmile.api.repository.WorkerOfferRepository;
import com.xmile.api.repository.WorkerProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Service for managing WorkerOffers - matching workers to approved quotes
 */
@Service
@RequiredArgsConstructor
public class WorkerOfferService {

    private final WorkerOfferRepository workerOfferRepository;
    private final WorkerProfileRepository workerProfileRepository;
    private final EventQuoteRepository quoteRepository;

    /**
     * Publish worker offers for an approved quote
     * Matches workers based on location and creates offers
     */
    @Transactional
    public List<WorkerOffer> publishWorkerOffers(Long quoteId, Integer requiredWorkersCount) {
        EventQuote quote = quoteRepository.findById(quoteId)
                .orElseThrow(() -> new RuntimeException("Quote not found"));

        if (quote.getStatus() != EventQuoteStatus.APPROVED) {
            throw new IllegalStateException("Can only publish offers for approved quotes");
        }

        Event event = quote.getEvent();
        
        // Find eligible workers
        List<WorkerProfile> eligibleWorkers = findEligibleWorkers(event, requiredWorkersCount);
        
        System.out.println("=== PUBLISHING WORKER OFFERS ===");
        System.out.println("Quote ID: " + quoteId);
        System.out.println("Required workers: " + requiredWorkersCount);
        System.out.println("Eligible workers found: " + eligibleWorkers.size());
        
        // Create offers for eligible workers
        List<WorkerOffer> offers = eligibleWorkers.stream()
                .map(workerProfile -> {
                    // Calculate distance if coordinates available
                    BigDecimal distanceKm = calculateDistance(
                            event.getLocationLat(), event.getLocationLng(),
                            workerProfile.getHomeLat(), workerProfile.getHomeLng()
                    );
                    
                    // Calculate pay amount (simple: divide quote amount by required workers)
                    BigDecimal payAmount = null;
                    if (requiredWorkersCount != null && requiredWorkersCount > 0) {
                        payAmount = quote.getQuoteAmount()
                                .divide(new BigDecimal(requiredWorkersCount), 2, RoundingMode.HALF_UP);
                    }
                    
                    WorkerOffer offer = WorkerOffer.builder()
                            .quote(quote)
                            .workerUser(workerProfile.getUser())
                            .status(WorkerOfferStatus.PENDING)
                            .payAmount(payAmount)
                            .distanceKm(distanceKm)
                            .build();
                    
                    return workerOfferRepository.save(offer);
                })
                .collect(Collectors.toList());
        
        System.out.println("Created " + offers.size() + " worker offers");
        System.out.println("=== END PUBLISHING ===");
        
        return offers;
    }

    /**
     * Find eligible workers for an event based on location matching
     */
    private List<WorkerProfile> findEligibleWorkers(Event event, Integer requiredCount) {
        // WORKER role removed from system - return empty list
        // This service is deprecated since WORKER role no longer exists
        return java.util.Collections.emptyList();
    }

    /**
     * Calculate distance between two coordinates using Haversine formula
     * Returns distance in kilometers
     */
    private BigDecimal calculateDistance(BigDecimal lat1, BigDecimal lng1, 
                                        BigDecimal lat2, BigDecimal lng2) {
        if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) {
            return null;
        }
        
        final double EARTH_RADIUS_KM = 6371.0;
        
        double lat1Rad = Math.toRadians(lat1.doubleValue());
        double lat2Rad = Math.toRadians(lat2.doubleValue());
        double deltaLat = Math.toRadians(lat2.doubleValue() - lat1.doubleValue());
        double deltaLng = Math.toRadians(lng2.doubleValue() - lng1.doubleValue());
        
        double a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
                   Math.cos(lat1Rad) * Math.cos(lat2Rad) *
                   Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
        
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        double distance = EARTH_RADIUS_KM * c;
        
        return BigDecimal.valueOf(distance).setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * Extract city name from location string (simple extraction)
     */
    private String extractCityFromLocation(String location) {
        if (location == null || location.trim().isEmpty()) {
            return null;
        }
        // Simple: take first part before comma, or whole string if no comma
        String[] parts = location.split(",");
        return parts[0].trim();
    }

    /**
     * Get all offers for a worker
     */
    public List<WorkerOffer> getOffersForWorker(Long workerUserId) {
        return workerOfferRepository.findByWorkerUser_IdOrderByOfferedAtDesc(workerUserId);
    }

    /**
     * Worker accepts an offer
     */
    @Transactional
    public WorkerOffer acceptOffer(Long offerId, Long workerUserId) {
        WorkerOffer offer = workerOfferRepository.findById(offerId)
                .orElseThrow(() -> new RuntimeException("Offer not found"));
        
        if (!offer.getWorkerUser().getId().equals(workerUserId)) {
            throw new RuntimeException("Unauthorized: offer does not belong to this worker");
        }
        
        if (offer.getStatus() != WorkerOfferStatus.PENDING) {
            throw new IllegalStateException("Offer is not pending");
        }
        
        offer.setStatus(WorkerOfferStatus.ACCEPTED);
        offer.setRespondedAt(java.time.LocalDateTime.now());
        
        return workerOfferRepository.save(offer);
    }

    /**
     * Worker declines an offer
     */
    @Transactional
    public WorkerOffer declineOffer(Long offerId, Long workerUserId) {
        WorkerOffer offer = workerOfferRepository.findById(offerId)
                .orElseThrow(() -> new RuntimeException("Offer not found"));
        
        if (!offer.getWorkerUser().getId().equals(workerUserId)) {
            throw new RuntimeException("Unauthorized: offer does not belong to this worker");
        }
        
        if (offer.getStatus() != WorkerOfferStatus.PENDING) {
            throw new IllegalStateException("Offer is not pending");
        }
        
        offer.setStatus(WorkerOfferStatus.DECLINED);
        offer.setRespondedAt(java.time.LocalDateTime.now());
        
        return workerOfferRepository.save(offer);
    }
}

