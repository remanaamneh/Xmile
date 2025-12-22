package com.xmile.api.controller.worker;

import com.xmile.api.dto.WorkerOfferDTO;
import com.xmile.api.service.WorkerOfferService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

// DISABLED: WORKER role removed from system
//@RestController
@RequestMapping("/worker/offers")
@RequiredArgsConstructor
//@PreAuthorize("hasRole('WORKER')")
public class WorkerOfferController {

    private final WorkerOfferService workerOfferService;

    /**
     * Get all offers for the logged-in worker
     * GET /worker/offers
     */
    @GetMapping
    public ResponseEntity<List<WorkerOfferDTO>> getMyOffers(Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Long workerUserId = (Long) authentication.getPrincipal();
        
        List<WorkerOfferDTO> offers = workerOfferService.getOffersForWorker(workerUserId).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
        
        return ResponseEntity.ok(offers);
    }

    /**
     * Worker accepts an offer
     * POST /worker/offers/{offerId}/accept
     */
    @PostMapping("/{offerId}/accept")
    public ResponseEntity<WorkerOfferDTO> acceptOffer(
            @PathVariable Long offerId,
            Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Long workerUserId = (Long) authentication.getPrincipal();
        
        try {
            var offer = workerOfferService.acceptOffer(offerId, workerUserId);
            return ResponseEntity.ok(toDTO(offer));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    /**
     * Worker declines an offer
     * POST /worker/offers/{offerId}/decline
     */
    @PostMapping("/{offerId}/decline")
    public ResponseEntity<WorkerOfferDTO> declineOffer(
            @PathVariable Long offerId,
            Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Long workerUserId = (Long) authentication.getPrincipal();
        
        try {
            var offer = workerOfferService.declineOffer(offerId, workerUserId);
            return ResponseEntity.ok(toDTO(offer));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    private WorkerOfferDTO toDTO(com.xmile.api.model.WorkerOffer offer) {
        var quote = offer.getQuote();
        var event = quote != null ? quote.getEvent() : null;
        
        return WorkerOfferDTO.builder()
                .id(offer.getId())
                .quoteId(quote != null ? quote.getId() : null)
                .eventId(event != null ? event.getId() : null)
                .eventName(event != null ? event.getName() : null)
                .location(event != null ? event.getLocation() : null)
                .eventDate(event != null && event.getEventDate() != null ? event.getEventDate().toString() : null)
                .startTime(event != null && event.getStartTime() != null ? event.getStartTime().toString() : null)
                .participantCount(event != null ? event.getParticipantCount() : null)
                .payAmount(offer.getPayAmount())
                .distanceKm(offer.getDistanceKm())
                .status(offer.getStatus())
                .offeredAt(offer.getOfferedAt())
                .respondedAt(offer.getRespondedAt())
                .createdAt(offer.getCreatedAt())
                .updatedAt(offer.getUpdatedAt())
                .build();
    }
}

