package com.xmile.api.service;

import com.xmile.api.dto.EventRequest;
import com.xmile.api.dto.EventResponse;
import com.xmile.api.dto.MyEventResponse;
import com.xmile.api.model.Event;
import com.xmile.api.model.EventQuoteStatus;
import com.xmile.api.model.EventStatus;
import com.xmile.api.model.User;
import com.xmile.api.repository.EventQuoteRepository;
import com.xmile.api.repository.EventRepository;
import com.xmile.api.repository.UserRepository;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EventService {
    private final EventRepository eventRepository;
    private final UserRepository userRepository;
    private final EventQuoteRepository eventQuoteRepository;
    private final EntityManager entityManager;

    @Transactional(readOnly = true)
    public List<EventResponse> getEventsByUserId(Long userId) {
        try {
            System.out.println("=== GET EVENTS BY USER ID ===");
            System.out.println("User ID: " + userId);
            // Use JOIN FETCH query to avoid lazy loading issues
            List<Event> events = eventRepository.findByClientUser_IdWithUser(userId);
            System.out.println("Found " + events.size() + " events");
            // Map to DTOs within transaction to ensure all data is loaded
            List<EventResponse> responses = events.stream()
                    .map(this::toResponse)
                    .collect(Collectors.toList());
            System.out.println("Converted to " + responses.size() + " responses");
            System.out.println("=== END GET EVENTS ===");
            return responses;
        } catch (Exception e) {
            System.err.println("=== ERROR IN getEventsByUserId ===");
            System.err.println("User ID: " + userId);
            e.printStackTrace(System.err);
            System.err.println("=== END ERROR ===");
            throw e;
        }
    }

    public EventResponse getEventById(Long id, Long userId) {
        Event event = eventRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Event not found"));
        
        // Verify ownership
        if (!event.getClientUser().getId().equals(userId)) {
            throw new RuntimeException("Unauthorized access to event");
        }
        
        return toResponse(event);
    }

    @Transactional
    public EventResponse createEvent(EventRequest request, Long userId) {
        User clientUser = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Event event = Event.builder()
                .clientUser(clientUser)
                .name(request.getName())
                .location(request.getLocation() != null ? request.getLocation() : "TBD")
                .eventDate(request.getEventDate())
                .startTime(request.getStartTime() != null ? request.getStartTime() : java.time.LocalTime.of(10, 0))
                .participantCount(request.getParticipantCount() != null ? request.getParticipantCount() : 0)
                .status(EventStatus.DRAFT)
                .build();

        // Store description with contact info
        StringBuilder descBuilder = new StringBuilder();
        if (request.getDescription() != null && !request.getDescription().isEmpty()) {
            descBuilder.append(request.getDescription());
        }
        if (request.getContactName() != null || request.getContactEmail() != null || request.getContactPhone() != null) {
            if (descBuilder.length() > 0) {
                descBuilder.append("\n\n");
            }
            if (request.getContactName() != null) {
                descBuilder.append("CONTACT_NAME:").append(request.getContactName());
            }
            if (request.getContactEmail() != null) {
                if (descBuilder.length() > 0 && !descBuilder.toString().endsWith("|")) {
                    descBuilder.append("|");
                }
                descBuilder.append("CONTACT_EMAIL:").append(request.getContactEmail());
            }
            if (request.getContactPhone() != null) {
                if (descBuilder.length() > 0 && !descBuilder.toString().endsWith("|")) {
                    descBuilder.append("|");
                }
                descBuilder.append("CONTACT_PHONE:").append(request.getContactPhone());
            }
        }
        if (descBuilder.length() > 0) {
            event.setDescription(descBuilder.toString());
        }

        Event saved = eventRepository.save(event);
        return toResponse(saved);
    }

    @Transactional
    public EventResponse updateEvent(Long id, EventRequest request, Long userId) {
        Event event = eventRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Event not found"));

        // Verify ownership
        if (!event.getClientUser().getId().equals(userId)) {
            throw new RuntimeException("Unauthorized access to event");
        }

        event.setName(request.getName());
        if (request.getLocation() != null) {
            event.setLocation(request.getLocation());
        }
        if (request.getEventDate() != null) {
            event.setEventDate(request.getEventDate());
        }
        if (request.getStartTime() != null) {
            event.setStartTime(request.getStartTime());
        }
        if (request.getParticipantCount() != null) {
            event.setParticipantCount(request.getParticipantCount());
        }

        // Update description with contact info
        StringBuilder descBuilder = new StringBuilder();
        if (request.getDescription() != null && !request.getDescription().isEmpty()) {
            descBuilder.append(request.getDescription());
        }
        if (request.getContactName() != null || request.getContactEmail() != null || request.getContactPhone() != null) {
            if (descBuilder.length() > 0) {
                descBuilder.append("\n\n");
            }
            if (request.getContactName() != null) {
                descBuilder.append("CONTACT_NAME:").append(request.getContactName());
            }
            if (request.getContactEmail() != null) {
                if (descBuilder.length() > 0 && !descBuilder.toString().endsWith("|")) {
                    descBuilder.append("|");
                }
                descBuilder.append("CONTACT_EMAIL:").append(request.getContactEmail());
            }
            if (request.getContactPhone() != null) {
                if (descBuilder.length() > 0 && !descBuilder.toString().endsWith("|")) {
                    descBuilder.append("|");
                }
                descBuilder.append("CONTACT_PHONE:").append(request.getContactPhone());
            }
        }
        if (descBuilder.length() > 0) {
            event.setDescription(descBuilder.toString());
        }

        Event saved = eventRepository.save(event);
        return toResponse(saved);
    }

    @Transactional
    public void deleteEvent(Long id, Long userId) {
        // First, verify ownership
        Event event = eventRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Event not found"));

        // Verify ownership
        if (!event.getClientUser().getId().equals(userId)) {
            throw new RuntimeException("Unauthorized access to event");
        }

        // Clear accepted_quote_id using EntityManager to ensure it's updated in DB before deletion
        // The accepted_quote_id foreign key doesn't have ON DELETE SET NULL, so we need to clear it manually
        entityManager.createNativeQuery("UPDATE events SET accepted_quote_id = NULL WHERE id = :eventId")
                .setParameter("eventId", id)
                .executeUpdate();
        
        // Flush to ensure the update is committed before deletion
        entityManager.flush();
        
        // Now delete the event - accepted_quote_id is already NULL
        eventRepository.delete(event);
    }

    /**
     * Get events for /events/my endpoint with optimized quote fetching
     * Uses projection queries to avoid lazy loading issues - returns only DTOs
     */
    @Transactional(readOnly = true)
    public List<MyEventResponse> getMyEvents(Long userId) {
        // Fetch events with user eagerly loaded - all data fetched within transaction
        List<Event> events = eventRepository.findByClientUser_IdWithUser(userId);
        
        if (events.isEmpty()) {
            return List.of();
        }
        
        // Extract event IDs while still in transaction
        List<Long> eventIds = events.stream().map(Event::getId).collect(Collectors.toList());
        
        // Use projection query to fetch only event_id and quote_amount - no entity relations
        List<Object[]> approvedQuotes = eventQuoteRepository.findApprovedQuotesByEventIds(eventIds, EventQuoteStatus.APPROVED);
        
        // Build map from projection results (no lazy loading)
        Map<Long, BigDecimal> approvedQuotesByEventId = approvedQuotes.stream()
                .collect(Collectors.toMap(
                    row -> (Long) row[0],  // event_id
                    row -> (BigDecimal) row[1],  // quote_amount
                    (existing, replacement) -> existing // Keep first if duplicates
                ));
        
        // Map to MyEventResponse DTOs - all primitive fields, no entity relations
        // This happens within the transaction, so all data is already loaded
        return events.stream()
                .map(event -> MyEventResponse.builder()
                        .id(event.getId())
                        .name(event.getName())
                        .status(event.getStatus())
                        .eventDate(event.getEventDate())
                        .location(event.getLocation())
                        .finalPrice(approvedQuotesByEventId.get(event.getId()))
                        .build())
                .collect(Collectors.toList());
    }

    private EventResponse toResponse(Event event) {
        // Note: Contact info is stored in description field as JSON-like format
        // Format: "description\n\nCONTACT_NAME:name|CONTACT_EMAIL:email|CONTACT_PHONE:phone"
        String contactName = null;
        String contactEmail = null;
        String contactPhone = null;
        
        if (event.getDescription() != null && event.getDescription().contains("CONTACT_NAME:")) {
            String[] parts = event.getDescription().split("CONTACT_NAME:");
            if (parts.length > 1) {
                String contactPart = parts[1];
                String[] contactFields = contactPart.split("\\|");
                for (String field : contactFields) {
                    if (field.startsWith("CONTACT_NAME:")) {
                        contactName = field.substring(13).trim();
                    } else if (field.startsWith("CONTACT_EMAIL:")) {
                        contactEmail = field.substring(14).trim();
                    } else if (field.startsWith("CONTACT_PHONE:")) {
                        contactPhone = field.substring(14).trim();
                    }
                }
            }
        }

        // Extract description without contact info
        String description = event.getDescription();
        if (description != null && description.contains("CONTACT_NAME:")) {
            description = description.substring(0, description.indexOf("CONTACT_NAME:")).trim();
        }

        return EventResponse.builder()
                .id(event.getId())
                .name(event.getName())
                .description(description)
                .location(event.getLocation())
                .eventDate(event.getEventDate())
                .startTime(event.getStartTime())
                .participantCount(event.getParticipantCount())
                .status(event.getStatus())
                .createdAt(event.getCreatedAt())
                .updatedAt(event.getUpdatedAt())
                .contactName(contactName)
                .contactEmail(contactEmail)
                .contactPhone(contactPhone)
                .clientUserId(event.getClientUser().getId())
                .clientUserName(event.getClientUser().getName())
                .clientUserEmail(event.getClientUser().getEmail())
                .build();
    }
}

