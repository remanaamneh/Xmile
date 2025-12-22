package com.xmile.api.service;

import com.xmile.api.dto.AdminApproveQuoteDTO;
import com.xmile.api.dto.AdminRejectQuoteDTO;
import com.xmile.api.dto.ApproveQuoteRequest;
import com.xmile.api.dto.CreateQuoteRequestDTO;
import com.xmile.api.dto.QuoteRequest;
import com.xmile.api.dto.QuoteRequestDTO;
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
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class QuoteService {

    private final EventRepository eventRepository;
    private final EventQuoteRepository quoteRepository;
    private final ProductionCompanyRepository productionCompanyRepository;
    private final UserRepository userRepository;
    
    // Optional dependency - only needed for publishing worker offers
    private WorkerOfferService workerOfferService;
    
    @org.springframework.beans.factory.annotation.Autowired(required = false)
    public void setWorkerOfferService(WorkerOfferService workerOfferService) {
        this.workerOfferService = workerOfferService;
    }

    @Transactional
    public QuoteResponse createQuote(QuoteRequest request, Long userId) {
        try {
            // Find the event by eventId
            Event event = eventRepository.findById(request.getEventId())
                    .orElseThrow(() -> new RuntimeException("Event not found"));

            // Verify event belongs to the user
            if (!event.getClientUser().getId().equals(userId)) {
                throw new RuntimeException("Unauthorized: Event does not belong to user");
            }

            // Update participant count if provided
            if (request.getParticipantCount() != null) {
                event.setParticipantCount(request.getParticipantCount());
                event = eventRepository.save(event);
            }

            // Set production company on event if provided
            if (request.getProductionCompanyId() != null) {
                ProductionCompany prodCompany = productionCompanyRepository.findById(request.getProductionCompanyId())
                        .orElse(null);
                if (prodCompany != null) {
                    event.setProductionCompany(prodCompany);
                    event = eventRepository.save(event);
                }
            }

            // Calculate quote price using event's participant count
            int participantCount = request.getParticipantCount() != null ? request.getParticipantCount() : event.getParticipantCount();
            BigDecimal basePrice = calculateBasePrice(participantCount);
            BigDecimal commission = basePrice.multiply(new BigDecimal("0.10")); // 10% commission
            BigDecimal totalPrice = basePrice.add(commission);

            // Set requested workers (default to 0 if not provided)
            Integer requestedWorkers = request.getRequestedWorkers() != null ? request.getRequestedWorkers() : 0;

            // Create quote as ESTIMATE (הערכה ראשונית)
            EventQuote.EventQuoteBuilder quoteBuilder = EventQuote.builder()
                    .event(event)
                    .quoteAmount(basePrice)
                    .currency("ILS")
                    .xmileCommissionPercent(new BigDecimal("10.00"))
                    .status(EventQuoteStatus.DRAFT)  // הערכה ראשונית
                    .notes(request.getNotes())
                    .requestedWorkers(requestedWorkers);
            
            // Only set production company if it exists on the event
            if (event.getProductionCompany() != null) {
                quoteBuilder.productionCompany(event.getProductionCompany());
            }
            
            EventQuote quote = quoteBuilder.build();
            quote = quoteRepository.save(quote);
            
            // Reload quote with all relations for response
            quote = quoteRepository.findByIdWithRelations(quote.getId())
                    .orElseThrow(() -> new RuntimeException("Failed to reload quote with relations"));

            // Calculate price per participant for display
            BigDecimal pricePerParticipant = basePrice.divide(new BigDecimal(participantCount), 2, java.math.RoundingMode.HALF_UP);
            
            // Check if date and time are available
            boolean isDateAvailable = true;
            if (event.getEventDate() != null && event.getStartTime() != null) {
                List<Event> conflictingEvents = eventRepository.findByEventDateAndStartTime(event.getEventDate(), event.getStartTime());
                isDateAvailable = conflictingEvents.isEmpty();
            }
            
            // Build breakdown
            Map<String, Object> breakdown = new HashMap<>();
            breakdown.put("basePrice", basePrice);
            breakdown.put("commission", commission);
            breakdown.put("totalPrice", totalPrice);
            breakdown.put("participantCount", participantCount);
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

    private BigDecimal calculateBasePrice(int participantCount) {
        // Pricing calculation based on participant count:
        // - Up to 350 participants: 80 ILS per participant
        // - 350-1000 participants: 70 ILS per participant
        // - Over 1000 participants: 50 ILS per participant
        
        if (participantCount <= 0) {
            throw new IllegalArgumentException("Participant count must be positive");
        }
        
        BigDecimal pricePerParticipant;
        
        if (participantCount <= 350) {
            pricePerParticipant = new BigDecimal("80");
        } else if (participantCount <= 1000) {
            pricePerParticipant = new BigDecimal("70");
        } else {
            pricePerParticipant = new BigDecimal("50");
        }
        
        BigDecimal basePrice = pricePerParticipant.multiply(new BigDecimal(participantCount));
        
        return basePrice.setScale(2, java.math.RoundingMode.HALF_UP);
    }

    @Transactional
    public QuoteResponse approveQuote(Long quoteId, ApproveQuoteRequest request, Long userId) {
        EventQuote quote = quoteRepository.findByIdWithRelations(quoteId)
                .orElseThrow(() -> new RuntimeException("Quote not found"));

        Event event = quote.getEvent();
        
        // Verify ownership
        if (!event.getClientUser().getId().equals(userId)) {
            throw new RuntimeException("Unauthorized");
        }

        // Update quote status to DRAFT (הערכה ראשונית)
        // המחיר המדויק ייקבע אחרי שהחברה תאשר
        quote.setStatus(EventQuoteStatus.DRAFT);
        
        // Update requested workers count
        quote.setRequestedWorkers(request.getRepresentativesCount());
        
        // Add notes about representatives
        String representativesNote = "\n\nנציגי רישום נדרשים: " + request.getRepresentativesCount();
        quote.setNotes((quote.getNotes() != null ? quote.getNotes() : "") + representativesNote);
        quote = quoteRepository.save(quote);
        
        // Reload quote with all relations for response
        quote = quoteRepository.findByIdWithRelations(quote.getId())
                .orElseThrow(() -> new RuntimeException("Failed to reload quote with relations"));
        
        // Debug: Log the saved quote
        System.out.println("=== APPROVED QUOTE SAVED ===");
        System.out.println("Quote ID: " + quote.getId());
        System.out.println("Quote Status: " + quote.getStatus());
        System.out.println("Requested Workers: " + quote.getRequestedWorkers());
        System.out.println("Event Status: " + event.getStatus());
        System.out.println("=== END APPROVED QUOTE ===");

        // Update event - set status to QUOTE_PENDING (ממתין לאישור החברה)
        event.setAcceptedQuote(quote);
        event.setStatus(EventStatus.QUOTE_PENDING);  // ממתין לאישור החברה
        String updatedDescription = (event.getDescription() != null ? event.getDescription() : "") + representativesNote;
        event.setDescription(updatedDescription);
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
        EventQuote quote = quoteRepository.findByIdWithRelations(quoteId)
                .orElseThrow(() -> new RuntimeException("Quote not found"));

        // Update to final price and approve
        quote.setQuoteAmount(finalPrice);
        quote.setStatus(EventQuoteStatus.APPROVED);
        quote.setApprovedAt(LocalDateTime.now());
        if (notes != null && !notes.isEmpty()) {
            quote.setNotes((quote.getNotes() != null ? quote.getNotes() + "\n\n" : "") + 
                    "הערות החברה: " + notes);
        }
        quote = quoteRepository.save(quote);
        
        // Reload quote with all relations for response
        quote = quoteRepository.findByIdWithRelations(quote.getId())
                .orElseThrow(() -> new RuntimeException("Failed to reload quote with relations"));

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

    @Transactional(readOnly = true)
    public List<QuoteResponse> getQuotesByUser(Long userId) {
        // Use JOIN FETCH query to avoid lazy loading
        List<Event> events = eventRepository.findByClientUser_IdWithUser(userId);
        List<Long> eventIds = events.stream().map(Event::getId).collect(Collectors.toList());
        
        if (eventIds.isEmpty()) {
            return List.of();
        }
        
        // Fetch quotes with relations eagerly loaded
        List<EventQuote> quotes = quoteRepository.findByClientUserId(userId);
        
        return quotes.stream()
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

    /**
     * Get all pending quotes (QUOTE_PENDING status) for manager/admin
     */
    @Transactional(readOnly = true)
    public List<QuoteResponse> getPendingQuotes() {
        List<EventQuote> quotes = quoteRepository.findByStatusOrderByCreatedAtDesc(EventQuoteStatus.QUOTE_PENDING);
        
        return quotes.stream()
                .map(q -> {
                    Map<String, Object> breakdown = new HashMap<>();
                    breakdown.put("basePrice", q.getQuoteAmount());
                    breakdown.put("commission", q.getQuoteAmount().multiply(q.getXmileCommissionPercent()).divide(new BigDecimal("100"), 2, java.math.RoundingMode.HALF_UP));
                    breakdown.put("totalPrice", q.getQuoteAmount().multiply(new BigDecimal("1.10")));
                    breakdown.put("requestedWorkers", q.getRequestedWorkers());
                    return toResponse(q, breakdown);
                })
                .collect(Collectors.toList());
    }

    /**
     * Get quote by ID and return as QuoteResponse
     * Used by admin approval endpoint to return consistent format
     */
    @Transactional(readOnly = true)
    public QuoteResponse getQuoteByIdForResponse(Long quoteId) {
        EventQuote quote = quoteRepository.findByIdWithRelations(quoteId)
                .orElseThrow(() -> new RuntimeException("Quote not found"));
        
        Map<String, Object> breakdown = new HashMap<>();
        breakdown.put("basePrice", quote.getQuoteAmount());
        breakdown.put("commission", quote.getQuoteAmount().multiply(quote.getXmileCommissionPercent()).divide(new BigDecimal("100"), 2, java.math.RoundingMode.HALF_UP));
        breakdown.put("totalPrice", quote.getQuoteAmount().multiply(new BigDecimal("1.10")));
        breakdown.put("requestedWorkers", quote.getRequestedWorkers());
        
        return toResponse(quote, breakdown);
    }

    private QuoteResponse toResponse(EventQuote quote, Map<String, Object> breakdown) {
        // All relations should be eagerly loaded via JOIN FETCH queries
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
        
        // Get client user information - should be eagerly loaded
        User clientUser = event.getClientUser();
        
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
                .requestedWorkers(quote.getRequestedWorkers())
                .clientUserId(clientUser != null ? clientUser.getId() : null)
                .clientUserName(clientUser != null ? clientUser.getName() : null)
                .clientUserEmail(clientUser != null ? clientUser.getEmail() : null)
                .build();
    }

    // ========== NEW CLIENT ENDPOINTS ==========

    /**
     * Create a quote request (CLIENT endpoint)
     * Creates event and quote with status=submitted (pending_approval)
     */
    @Transactional
    public QuoteRequestDTO createQuoteRequest(CreateQuoteRequestDTO request, Long clientUserId) {
        User client = userRepository.findById(clientUserId)
                .orElseThrow(() -> new RuntimeException("Client user not found"));

        // Parse date and time
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

        // Create event
        Event.EventBuilder eventBuilder = Event.builder()
                .clientUser(client)
                .name(request.getEventName() != null && !request.getEventName().trim().isEmpty() ? request.getEventName() : "אירוע ללא שם")
                .location(request.getLocation() != null && !request.getLocation().trim().isEmpty() ? request.getLocation() : "מיקום לא צוין")
                .eventDate(eventDate != null ? eventDate : LocalDate.now())
                .startTime(startTime != null ? startTime : LocalTime.of(10, 0))
                .participantCount(request.getParticipantCount())
                .description(request.getNotes())
                .status(EventStatus.QUOTE_PENDING) // Event status: waiting for quote approval
                .xmileCommissionPercent(new BigDecimal("10.00"));

        Event event = eventBuilder.build();

        if (request.getProductionCompanyId() != null) {
            ProductionCompany prodCompany = productionCompanyRepository.findById(request.getProductionCompanyId())
                    .orElse(null);
            event.setProductionCompany(prodCompany);
        }

        event = eventRepository.save(event);

        // Validate participant count
        if (request.getParticipantCount() == null || request.getParticipantCount() <= 0) {
            throw new IllegalArgumentException("Participant count must be positive. Received: " + request.getParticipantCount());
        }
        
        // Calculate quote price
        BigDecimal basePrice = calculateBasePriceForParticipantCount(request.getParticipantCount());
        
        System.out.println("=== QUOTE PRICE CALCULATION ===");
        System.out.println("Participant Count: " + request.getParticipantCount());
        System.out.println("Calculated Base Price: " + basePrice);
        System.out.println("=== END CALCULATION ===");
        
        // Create quote with status=DRAFT (customer can send to manager later)
        EventQuote.EventQuoteBuilder quoteBuilder = EventQuote.builder()
                .event(event)
                .quoteAmount(basePrice)
                .currency("ILS")
                .xmileCommissionPercent(new BigDecimal("10.00"))
                .status(EventQuoteStatus.DRAFT) // Start as DRAFT, customer can send to manager later
                .notes(request.getNotes())
                .requestedWorkers(request.getWorkersNeeded() != null ? request.getWorkersNeeded() : 0);
        
        if (event.getProductionCompany() != null) {
            quoteBuilder.productionCompany(event.getProductionCompany());
        }
        
        EventQuote quote = quoteBuilder.build();
        quote = quoteRepository.save(quote);
        
        // Reload quote with all relations for response
        quote = quoteRepository.findByIdWithRelations(quote.getId())
                .orElseThrow(() -> new RuntimeException("Failed to reload quote with relations"));

        // Log the saved quote for debugging
        System.out.println("=== SAVED QUOTE ===");
        System.out.println("Quote ID: " + quote.getId());
        System.out.println("Quote Amount: " + quote.getQuoteAmount());
        System.out.println("Participant Count: " + event.getParticipantCount());
        System.out.println("=== END SAVED QUOTE ===");

        QuoteRequestDTO dto = toQuoteRequestDTO(quote);
        
        // Log the DTO for debugging
        System.out.println("=== QUOTE REQUEST DTO ===");
        System.out.println("DTO Quote Amount: " + dto.getQuoteAmount());
        System.out.println("=== END DTO ===");
        
        return dto;
    }

    /**
     * Get all quote requests for a client
     */
    @Transactional(readOnly = true)
    public List<QuoteRequestDTO> getQuoteRequestsByClient(Long clientUserId) {
        try {
            System.out.println("=== GET QUOTE REQUESTS FOR CLIENT ===");
            System.out.println("Client User ID: " + clientUserId);
            List<EventQuote> quotes = quoteRepository.findByClientUserId(clientUserId);
            System.out.println("Number of quotes found: " + quotes.size());
            quotes.forEach(q -> {
                System.out.println("Quote ID: " + q.getId() + ", Status: " + q.getStatus() + ", Amount: " + q.getQuoteAmount());
            });
            
            List<QuoteRequestDTO> dtos = quotes.stream()
                    .map(this::toQuoteRequestDTO)
                    .collect(Collectors.toList());
            System.out.println("Converted to " + dtos.size() + " DTOs");
            System.out.println("=== END GET QUOTE REQUESTS ===");
            return dtos;
        } catch (Exception e) {
            System.err.println("=== ERROR IN getQuoteRequestsByClient ===");
            System.err.println("Client User ID: " + clientUserId);
            e.printStackTrace(System.err);
            System.err.println("=== END ERROR ===");
            throw e;
        }
    }

    /**
     * Get a specific quote request for a client (with ownership verification)
     */
    @Transactional(readOnly = true)
    public QuoteRequestDTO getQuoteRequestByIdForClient(Long quoteId, Long clientUserId) {
        EventQuote quote = quoteRepository.findByIdAndClientUserId(quoteId, clientUserId)
                .orElseThrow(() -> new RuntimeException("Quote request not found or access denied"));
        return toQuoteRequestDTO(quote);
    }

    /**
     * Send quote request to manager for approval
     * Sets status to QUOTE_PENDING
     */
    @Transactional
    public QuoteRequestDTO sendQuoteToManager(Long quoteId, Long clientUserId) {
        // Verify ownership
        EventQuote quote = quoteRepository.findByIdAndClientUserId(quoteId, clientUserId)
                .orElseThrow(() -> new RuntimeException("Quote request not found or access denied"));

        System.out.println("Sending quote to manager. ID=" + quote.getId());
        quote.setStatus(EventQuoteStatus.QUOTE_PENDING);
        quote.setUpdatedAt(java.time.LocalDateTime.now());

        EventQuote savedQuote = quoteRepository.save(quote);
        
        // Reload quote with all relations for response
        EventQuote reloadedQuote = quoteRepository.findByIdWithRelations(savedQuote.getId())
                .orElseThrow(() -> new RuntimeException("Failed to reload quote with relations"));
        
        System.out.println("=== QUOTE SENT TO MANAGER ===");
        System.out.println("Quote ID: " + reloadedQuote.getId());
        System.out.println("New Status: " + quote.getStatus());
        System.out.println("=== END ===");
        
        return toQuoteRequestDTO(quote);
    }

    // ========== NEW ADMIN ENDPOINTS ==========

    /**
     * Get all quote requests for admin (with optional status filter)
     */
    @Transactional(readOnly = true)
    public List<QuoteRequestDTO> getQuoteRequestsForAdmin(EventQuoteStatus statusFilter) {
        try {
            System.out.println("=== GET QUOTE REQUESTS FOR ADMIN ===");
            System.out.println("Status filter: " + statusFilter);
            
            List<EventQuote> quotes;
            if (statusFilter != null) {
                // Use QUOTE_PENDING for pending quotes
                quotes = quoteRepository.findByStatusOrderByCreatedAtDesc(statusFilter);
                System.out.println("Found " + quotes.size() + " quotes with status: " + statusFilter);
            } else {
                quotes = quoteRepository.findAllWithRelations();
                System.out.println("Found " + quotes.size() + " quotes (all)");
            }
            
            List<QuoteRequestDTO> dtos = quotes.stream()
                    .map(this::toQuoteRequestDTO)
                    .collect(Collectors.toList());
            System.out.println("Converted to " + dtos.size() + " DTOs");
            System.out.println("=== END GET QUOTE REQUESTS FOR ADMIN ===");
            return dtos;
        } catch (Exception e) {
            System.err.println("=== ERROR IN getQuoteRequestsForAdmin ===");
            System.err.println("Status filter: " + statusFilter);
            e.printStackTrace(System.err);
            System.err.println("=== END ERROR ===");
            throw e;
        }
    }

    /**
     * Get a specific quote request for admin
     */
    @Transactional(readOnly = true)
    public QuoteRequestDTO getQuoteRequestByIdForAdmin(Long quoteId) {
        EventQuote quote = quoteRepository.findByIdWithRelations(quoteId)
                .orElseThrow(() -> new RuntimeException("Quote request not found"));
        return toQuoteRequestDTO(quote);
    }

    /**
     * Admin approves a quote request
     */
    @Transactional
    public QuoteRequestDTO approveQuoteByAdmin(Long quoteId, AdminApproveQuoteDTO request) {
        // Signature log to identify updated code is running
        System.out.println("=== APPROVE QUOTE BY ADMIN (UPDATED CODE v1.0.7) ===");
        System.out.println("Quote ID: " + quoteId);
        
        EventQuote quote = quoteRepository.findByIdWithRelations(quoteId)
                .orElseThrow(() -> new RuntimeException("Quote request not found"));

        // Log currentStatus before validation
        EventQuoteStatus currentStatus = quote.getStatus();
        System.out.println("Approve quoteId=" + quoteId + " currentStatus=" + currentStatus);

        // Only QUOTE_PENDING quotes can be approved
        if (currentStatus != EventQuoteStatus.QUOTE_PENDING) {
            System.err.println("Invalid status for approval. Quote ID: " + quoteId + ", Current Status: " + currentStatus);
            throw new IllegalStateException("Only quotes with status QUOTE_PENDING can be approved. Current status: " + currentStatus);
        }

        // Update quote amount with final price (required field)
        if (request.getFinalPrice() != null) {
            quote.setQuoteAmount(request.getFinalPrice());
        }

        // Update requested workers count (required field)
        if (request.getRequestedWorkers() != null) {
            quote.setRequestedWorkers(request.getRequestedWorkers());
        }

        // Update status to APPROVED
        quote.setStatus(EventQuoteStatus.APPROVED);
        quote.setApprovedAt(LocalDateTime.now());
        
        // Store admin notes (optional)
        if (request.getAdminNotes() != null && !request.getAdminNotes().trim().isEmpty()) {
            String existingNotes = quote.getNotes() != null ? quote.getNotes() : "";
            quote.setNotes(existingNotes + (existingNotes.isEmpty() ? "" : "\n\n") + 
                          "הערת מנהל: " + request.getAdminNotes());
        }

        quote = quoteRepository.save(quote);
        
        // Reload quote with all relations for response
        quote = quoteRepository.findByIdWithRelations(quote.getId())
                .orElseThrow(() -> new RuntimeException("Failed to reload quote with relations"));

        // Update event status
        Event event = quote.getEvent();
        event.setStatus(EventStatus.APPROVED);
        event.setAcceptedQuote(quote);
        eventRepository.save(event);

        // Publish worker offers (if WorkerOfferService is available)
        if (workerOfferService != null && request.getRequestedWorkers() != null) {
            try {
                workerOfferService.publishWorkerOffers(quoteId, request.getRequestedWorkers());
                System.out.println("Worker offers published for quote: " + quoteId);
            } catch (Exception e) {
                System.err.println("Error publishing worker offers: " + e.getMessage());
                e.printStackTrace(System.err);
                // Don't fail the approval if worker offer publishing fails
            }
        }

        return toQuoteRequestDTO(quote);
    }

    /**
     * Admin rejects a quote request
     * Allows rejection for quotes with status: SENT_TO_MANAGER, MANAGER_REVIEW, or QUOTE_PENDING
     */
    @Transactional
    public QuoteRequestDTO rejectQuoteByAdmin(Long quoteId, AdminRejectQuoteDTO request) {
        // Signature log to identify updated code is running
        System.out.println("=== REJECT QUOTE BY ADMIN (UPDATED CODE v1.0.7) ===");
        System.out.println("Quote ID: " + quoteId);
        System.out.println("Rejection reason: " + request.getReason());
        
        EventQuote quote = quoteRepository.findByIdWithRelations(quoteId)
                .orElseThrow(() -> new RuntimeException("Quote request not found"));

        // Log currentStatus before validation
        EventQuoteStatus currentStatus = quote.getStatus();
        System.out.println("Reject quoteId=" + quoteId + " currentStatus=" + currentStatus);

        // Allow rejection for pending statuses: SENT_TO_MANAGER, MANAGER_REVIEW, or QUOTE_PENDING
        if (!(currentStatus == EventQuoteStatus.SENT_TO_MANAGER
           || currentStatus == EventQuoteStatus.MANAGER_REVIEW
           || currentStatus == EventQuoteStatus.QUOTE_PENDING)) {
            System.err.println("Invalid status for rejection: " + currentStatus);
            throw new IllegalStateException(
                "Only quotes with status SENT_TO_MANAGER, MANAGER_REVIEW, or QUOTE_PENDING can be rejected. Current status: " + currentStatus
            );
        }

        // Update status to REJECTED
        quote.setStatus(EventQuoteStatus.REJECTED);
        quote.setApprovedAt(null);
        quote.setRejectedAt(LocalDateTime.now());
        quote.setUpdatedAt(LocalDateTime.now());
        
        // Store rejection reason in dedicated column (preferred) and also append to notes
        quote.setAdminRejectionReason(request.getReason());
        String existingNotes = quote.getNotes() != null ? quote.getNotes() : "";
        quote.setNotes(existingNotes + (existingNotes.isEmpty() ? "" : "\n\n") + 
                      "סיבת דחייה: " + request.getReason());

        System.out.println("Setting status to REJECTED");
        System.out.println("Setting rejected_at to: " + quote.getRejectedAt());
        System.out.println("Setting admin_rejection_reason to: " + quote.getAdminRejectionReason());

        quote = quoteRepository.save(quote);
        
        // Reload quote with all relations for response
        quote = quoteRepository.findByIdWithRelations(quote.getId())
                .orElseThrow(() -> new RuntimeException("Failed to reload quote with relations"));

        // Update event status to CANCELLED when quote is rejected
        Event event = quote.getEvent();
        if (event != null) {
            event.setStatus(EventStatus.CANCELLED);
            eventRepository.save(event);
        }

        System.out.println("Quote rejected successfully. Quote ID: " + quote.getId() + ", Final status: " + quote.getStatus());
        System.out.println("=== END REJECT QUOTE BY ADMIN ===");

        return toQuoteRequestDTO(quote);
    }

    // ========== HELPER METHODS ==========

    /**
     * Calculate base price based on participant count
     * עד 350 משתתפים: 80 שקלים למשתתף
     * מעל 350 עד 1000 משתתפים: 70 שקלים למשתתף
     * מעל 1000 משתתפים: 50 שקלים למשתתף
     */
    private BigDecimal calculateBasePriceForParticipantCount(Integer participantCount) {
        if (participantCount == null || participantCount <= 0) {
            throw new IllegalArgumentException("Participant count must be positive");
        }
        
        BigDecimal pricePerParticipant;
        if (participantCount <= 350) {
            pricePerParticipant = new BigDecimal("80");
        } else if (participantCount <= 1000) {
            pricePerParticipant = new BigDecimal("70");
        } else {
            pricePerParticipant = new BigDecimal("50");
        }
        return pricePerParticipant.multiply(new BigDecimal(participantCount));
    }

    /**
     * Convert EventQuote to QuoteRequestDTO
     * Note: All relations should be eagerly loaded via JOIN FETCH queries
     */
    private QuoteRequestDTO toQuoteRequestDTO(EventQuote quote) {
        // All relations should be eagerly loaded - access within transaction
        Event event = quote.getEvent();
        User clientUser = event != null ? event.getClientUser() : null;
        
        // Extract admin note and reject reason from notes
        String notes = quote.getNotes();
        String adminNote = null;
        String rejectReason = null;
        
        if (notes != null) {
            if (notes.contains("הערת מנהל:")) {
                int idx = notes.indexOf("הערת מנהל:");
                adminNote = notes.substring(idx + "הערת מנהל:".length()).trim();
            }
            if (notes.contains("סיבת דחייה:")) {
                int idx = notes.indexOf("סיבת דחייה:");
                rejectReason = notes.substring(idx + "סיבת דחייה:".length()).trim();
            }
        }
        
        // Map status for display - all values are now uppercase
        String statusDisplay = quote.getStatus().name(); // Use enum name directly (all uppercase)
        
        return QuoteRequestDTO.builder()
                .id(quote.getId())
                .eventId(event != null ? event.getId() : null)
                .eventName(event != null ? event.getName() : null)
                .participantCount(event != null ? event.getParticipantCount() : null)
                .location(event != null ? event.getLocation() : null)
                .eventDate(event != null && event.getEventDate() != null ? event.getEventDate().toString() : null)
                .startTime(event != null && event.getStartTime() != null ? event.getStartTime().toString() : null)
                .productionCompanyId(quote.getProductionCompany() != null ? quote.getProductionCompany().getId() : null)
                .productionCompanyName(quote.getProductionCompany() != null ? quote.getProductionCompany().getName() : null)
                .workersNeeded(quote.getRequestedWorkers())
                .quoteAmount(quote.getQuoteAmount())
                .status(statusDisplay)
                .notes(notes)
                .adminNote(adminNote)
                .rejectReason(rejectReason)
                .createdAt(quote.getCreatedAt())
                .updatedAt(quote.getUpdatedAt())
                .approvedAt(quote.getApprovedAt())
                .clientUserId(clientUser != null ? clientUser.getId() : null)
                .clientUserName(clientUser != null ? clientUser.getName() : null)
                .clientUserEmail(clientUser != null ? clientUser.getEmail() : null)
                .build();
    }
}

