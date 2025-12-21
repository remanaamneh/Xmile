package com.xmile.api.controller;

import com.xmile.api.dto.EventRequest;
import com.xmile.api.dto.EventResponse;
import com.xmile.api.dto.MyEventResponse;
import com.xmile.api.service.EventService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/events")
@RequiredArgsConstructor
public class EventController {
    private final EventService eventService;

    // Specific endpoint - must come BEFORE path variable mappings
    @GetMapping("/my")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<MyEventResponse>> getMyEvents(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        // Use optimized service method that fetches everything in one transaction
        List<MyEventResponse> myEvents = eventService.getMyEvents(userId);
        return ResponseEntity.ok(myEvents);
    }

    // Generic endpoint - returns all events for authenticated user
    @GetMapping
    public ResponseEntity<List<EventResponse>> getEvents(Authentication authentication) {
        try {
            if (authentication == null || authentication.getPrincipal() == null) {
                System.err.println("=== GET EVENTS: Authentication is null ===");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
            Long userId = (Long) authentication.getPrincipal();
            System.out.println("=== GET EVENTS: User ID = " + userId + " ===");
            List<EventResponse> events = eventService.getEventsByUserId(userId);
            return ResponseEntity.ok(events);
        } catch (Exception e) {
            System.err.println("=== ERROR IN EventController.getEvents ===");
            e.printStackTrace(System.err);
            System.err.println("=== END ERROR ===");
            throw e;
        }
    }

    // Get event by ID - using explicit /id/{id} path to avoid conflicts
    @GetMapping("/id/{id}")
    public ResponseEntity<EventResponse> getEventById(@PathVariable Long id, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        EventResponse event = eventService.getEventById(id, userId);
        return ResponseEntity.ok(event);
    }

    @PostMapping
    public ResponseEntity<EventResponse> createEvent(@Valid @RequestBody EventRequest request, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        EventResponse event = eventService.createEvent(request, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(event);
    }

    @PutMapping("/id/{id}")
    public ResponseEntity<EventResponse> updateEvent(@PathVariable Long id, @Valid @RequestBody EventRequest request, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        EventResponse event = eventService.updateEvent(id, request, userId);
        return ResponseEntity.ok(event);
    }

    @DeleteMapping("/id/{id}")
    public ResponseEntity<Void> deleteEvent(@PathVariable Long id, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        eventService.deleteEvent(id, userId);
        return ResponseEntity.noContent().build();
    }
}

