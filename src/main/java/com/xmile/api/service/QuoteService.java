package com.xmile.api.service;

import com.xmile.api.dto.ApproveQuoteRequest;
import com.xmile.api.dto.QuoteRequest;
import com.xmile.api.dto.QuoteResponse;
import com.xmile.api.model.*;
import com.xmile.api.repository.EventQuoteRepository;
import com.xmile.api.repository.EventRepository;
import com.xmile.api.repository.ProductionCompanyRepository;
import com.xmile.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class QuoteService {

    private final EventRepository eventRepository;
    private final EventQuoteRepository quoteRepository;
    private final ProductionCompanyRepository productionCompanyRepository;
    private final UserRepository userRepository;

    @Transactional
    public QuoteResponse createQuote(QuoteRequest request, Long userId) {
        try {
            User client = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // Parse date and time - both are optional now
            LocalDate eventDate = null;
            LocalTime startTime = null;
            
            if (request.getEventDate() != null && !request.getEventDate().trim().isEmpty()) {
                try {
                    eventDate = LocalDate.parse(request.getEventDate());
                } catch (Exception e) {
                    throw new IllegalArgumentException("Invalid event date format: " + request.getEventDate(), e);
                }
            }
            
            if (request.getStartTime() != null && !request.getStartTime().trim().isEmpty()) {
                try {
                    startTime = LocalTime.parse(request.getStartTime());
                } catch (Exception e) {
                    throw new IllegalArgumentException("Invalid start time format: " + request.getStartTime(), e);
                }
            }

            // Check if date and time are available (only if both are provided)
            boolean isDateAvailable = true;
            if (eventDate != null && startTime != null) {
                List<Event> conflictingEvents = eventRepository.findByEventDateAndStartTime(eventDate, startTime);
                isDateAvailable = conflictingEvents.isEmpty();
            }
            
            // Create or find event - use defaults for optional fields
            Event.EventBuilder eventBuilder = Event.builder()
                    .clientUser(client)
                    .name(request.getEventName() != null && !request.getEventName().trim().isEmpty() ? request.getEventName() : "אירוע ללא שם")
                    .location(request.getLocation() != null && !request.getLocation().trim().isEmpty() ? request.getLocation() : "מיקום לא צוין")
                    .eventDate(eventDate != null ? eventDate : LocalDate.now()) // Default to today if not provided
                    .startTime(startTime != null ? startTime : LocalTime.of(10, 0)) // Default to 10:00 if not provided
                    .participantCount(request.getParticipantCount())
                    .description(request.getNotes())
                    .status(EventStatus.DRAFT)
                    .xmileCommissionPercent(new BigDecimal("10.00")); // Default commission
            
            Event event = eventBuilder.build();

            if (request.getProductionCompanyId() != null) {
                ProductionCompany prodCompany = productionCompanyRepository.findById(request.getProductionCompanyId())
                        .orElse(null);
                event.setProductionCompany(prodCompany);
            }

            event = eventRepository.save(event);

            // Calculate quote price
            BigDecimal basePrice = calculateBasePrice(request);
            BigDecimal commission = basePrice.multiply(new BigDecimal("0.10")); // 10% commission
            BigDecimal totalPrice = basePrice.add(commission);

            // Create quote as ESTIMATE (הערכה ראשונית)
            // Note: productionCompany can be null if not selected
            EventQuote.EventQuoteBuilder quoteBuilder = EventQuote.builder()
                    .event(event)
                    .quoteAmount(basePrice)
                    .currency("ILS")
                    .xmileCommissionPercent(new BigDecimal("10.00"))
                    .status(EventQuoteStatus.submitted)  // הערכה ראשונית
                    .notes(request.getNotes());
            
            // Only set production company if it exists
            if (event.getProductionCompany() != null) {
                quoteBuilder.productionCompany(event.getProductionCompany());
            }
            
            EventQuote quote = quoteBuilder.build();
            quote = quoteRepository.save(quote);

            // Calculate price per participant for display
            BigDecimal pricePerParticipant = basePrice.divide(new BigDecimal(request.getParticipantCount()), 2, java.math.RoundingMode.HALF_UP);
            
            // Build breakdown
            Map<String, Object> breakdown = new HashMap<>();
            breakdown.put("basePrice", basePrice);
            breakdown.put("commission", commission);
            breakdown.put("totalPrice", totalPrice);
            breakdown.put("participantCount", request.getParticipantCount());
            breakdown.put("pricePerParticipant", pricePerParticipant);
            breakdown.put("isDateAvailable", isDateAvailable);
            breakdown.put("dateAvailabilityMessage", isDateAvailable ? 
                "התאריך פנוי! ניתן להמשיך עם ההזמנה." : 
                "שימו לב: יש אירועים אחרים בתאריך ושעה זו.");

            return toResponse(quote, breakdown);
        } catch (IllegalArgumentException e) {
            // Re-throw validation errors as-is
            System.err.println("=== VALIDATION ERROR ===");
            System.err.println("Message: " + e.getMessage());
            e.printStackTrace();
            System.err.println("=== END VALIDATION ERROR ===");
            throw e;
        } catch (Exception e) {
            // Log the full exception for debugging
            System.err.println("=== EXCEPTION IN createQuote ===");
            System.err.println("Exception Type: " + e.getClass().getName());
            System.err.println("Exception Message: " + e.getMessage());
            if (e.getCause() != null) {
                System.err.println("Cause: " + e.getCause().getClass().getName() + " - " + e.getCause().getMessage());
            }
            e.printStackTrace();
            System.err.println("=== END EXCEPTION ===");
            // Wrap other exceptions with more context
            String errorMsg = e.getMessage();
            if (errorMsg == null || errorMsg.isEmpty()) {
                errorMsg = e.getClass().getSimpleName();
            }
            throw new RuntimeException("Error creating quote: " + errorMsg, e);
        }
    }

    private BigDecimal calculateBasePrice(QuoteRequest request) {
        // Pricing calculation based on participant count:
        // - Up to 500 participants: 80 ILS per participant
        // - 500-1000 participants: 70 ILS per participant
        // - Over 1000 participants: 50 ILS per participant
        
        int participantCount = request.getParticipantCount();
        BigDecimal pricePerParticipant;
        
        if (participantCount > 1000) {
            pricePerParticipant = new BigDecimal("50");
        } else if (participantCount > 500) {
            pricePerParticipant = new BigDecimal("70");
        } else {
            pricePerParticipant = new BigDecimal("80");
        }
        
        BigDecimal basePrice = pricePerParticipant.multiply(new BigDecimal(participantCount));
        
        return basePrice.setScale(2, java.math.RoundingMode.HALF_UP);
    }

    @Transactional
    public QuoteResponse approveQuote(Long quoteId, ApproveQuoteRequest request, Long userId) {
        EventQuote quote = quoteRepository.findById(quoteId)
                .orElseThrow(() -> new RuntimeException("Quote not found"));

        Event event = quote.getEvent();
        
        // Verify ownership
        if (!event.getClientUser().getId().equals(userId)) {
            throw new RuntimeException("Unauthorized");
        }

        // Update quote status to SUBMITTED (נשלח לאישור החברה)
        // המחיר המדויק ייקבע אחרי שהחברה תאשר
        quote.setStatus(EventQuoteStatus.submitted);
        quote.setNotes(quote.getNotes() + "\n\nנציגי רישום נדרשים: " + request.getRepresentativesCount());
        quote = quoteRepository.save(quote);

        // Update event
        event.setAcceptedQuote(quote);
        event.setStatus(EventStatus.PENDING_APPROVAL);  // ממתין לאישור החברה
        event.setDescription((event.getDescription() != null ? event.getDescription() : "") + 
                "\n\nנציגי רישום נדרשים: " + request.getRepresentativesCount());
        eventRepository.save(event);

        Map<String, Object> breakdown = new HashMap<>();
        breakdown.put("basePrice", quote.getQuoteAmount());
        breakdown.put("commission", quote.getQuoteAmount().multiply(quote.getXmileCommissionPercent()).divide(new BigDecimal("100"), 2, java.math.RoundingMode.HALF_UP));
        breakdown.put("totalPrice", quote.getQuoteAmount().multiply(new BigDecimal("1.10")));
        breakdown.put("representativesCount", request.getRepresentativesCount());

        return toResponse(quote, breakdown);
    }

    @Transactional
    public QuoteResponse finalizeQuote(Long quoteId, BigDecimal finalPrice, String notes) {
        EventQuote quote = quoteRepository.findById(quoteId)
                .orElseThrow(() -> new RuntimeException("Quote not found"));

        // Update to final price and approve
        quote.setQuoteAmount(finalPrice);
        quote.setStatus(EventQuoteStatus.approved);
        quote.setApprovedAt(LocalDateTime.now());
        if (notes != null && !notes.isEmpty()) {
            quote.setNotes((quote.getNotes() != null ? quote.getNotes() + "\n\n" : "") + 
                    "הערות החברה: " + notes);
        }
        quote = quoteRepository.save(quote);

        // Update event status
        Event event = quote.getEvent();
        event.setStatus(EventStatus.APPROVED);
        eventRepository.save(event);

        Map<String, Object> breakdown = new HashMap<>();
        breakdown.put("basePrice", finalPrice);
        breakdown.put("commission", finalPrice.multiply(quote.getXmileCommissionPercent()).divide(new BigDecimal("100"), 2, java.math.RoundingMode.HALF_UP));
        breakdown.put("totalPrice", finalPrice.multiply(new BigDecimal("1.10")));
        breakdown.put("isFinal", true);

        return toResponse(quote, breakdown);
    }

    public List<QuoteResponse> getQuotesByUser(Long userId) {
        List<Event> events = eventRepository.findByClientUser_Id(userId);
        List<Long> eventIds = events.stream().map(Event::getId).collect(Collectors.toList());
        
        return quoteRepository.findAll().stream()
                .filter(q -> eventIds.contains(q.getEvent().getId()))
                .map(q -> {
                    Map<String, Object> breakdown = new HashMap<>();
                    breakdown.put("basePrice", q.getQuoteAmount());
                    breakdown.put("commission", q.getQuoteAmount().multiply(q.getXmileCommissionPercent()).divide(new BigDecimal("100"), 2, java.math.RoundingMode.HALF_UP));
                    breakdown.put("totalPrice", q.getQuoteAmount().multiply(new BigDecimal("1.10")));
                    return toResponse(q, breakdown);
                })
                .collect(Collectors.toList());
    }

    private QuoteResponse toResponse(EventQuote quote, Map<String, Object> breakdown) {
        Event event = quote.getEvent();
        
        if (event == null) {
            throw new RuntimeException("Event is null for quote: " + quote.getId());
        }
        
        // Get totalPrice from breakdown if available, otherwise calculate it
        BigDecimal totalPrice;
        if (breakdown != null && breakdown.containsKey("totalPrice")) {
            Object totalPriceObj = breakdown.get("totalPrice");
            if (totalPriceObj instanceof BigDecimal) {
                totalPrice = (BigDecimal) totalPriceObj;
            } else if (totalPriceObj instanceof Number) {
                totalPrice = BigDecimal.valueOf(((Number) totalPriceObj).doubleValue());
            } else {
                // Fallback calculation
                BigDecimal basePrice = quote.getQuoteAmount() != null ? quote.getQuoteAmount() : BigDecimal.ZERO;
                BigDecimal commission = basePrice.multiply(quote.getXmileCommissionPercent()).divide(new BigDecimal("100"), 2, java.math.RoundingMode.HALF_UP);
                totalPrice = basePrice.add(commission);
            }
        } else {
            // Fallback calculation
            BigDecimal basePrice = quote.getQuoteAmount() != null ? quote.getQuoteAmount() : BigDecimal.ZERO;
            BigDecimal commission = basePrice.multiply(quote.getXmileCommissionPercent()).divide(new BigDecimal("100"), 2, java.math.RoundingMode.HALF_UP);
            totalPrice = basePrice.add(commission);
        }
        
        return QuoteResponse.builder()
                .id(quote.getId())
                .eventId(event.getId())
                .eventName(event.getName())
                .participantCount(event.getParticipantCount())
                .location(event.getLocation())
                .eventDate(event.getEventDate() != null ? event.getEventDate().toString() : null)
                .startTime(event.getStartTime() != null ? event.getStartTime().toString() : null)
                .productionCompanyId(event.getProductionCompany() != null ? event.getProductionCompany().getId() : null)
                .productionCompanyName(event.getProductionCompany() != null ? event.getProductionCompany().getName() : null)
                .price(quote.getQuoteAmount())
                .totalPrice(totalPrice)
                .currency(quote.getCurrency())
                .status(quote.getStatus() != null ? quote.getStatus().name() : "UNKNOWN")
                .notes(quote.getNotes())
                .breakdown(breakdown)
                .createdAt(quote.getCreatedAt())
                .approvedAt(quote.getApprovedAt())
                .build();
    }
}

