package com.xmile.api.controller;

import com.xmile.api.dto.EventRequest;
import com.xmile.api.dto.EventResponse;
import com.xmile.api.service.EventService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/events")
@RequiredArgsConstructor
public class EventController {
    private final EventService eventService;

    @GetMapping
    public ResponseEntity<List<EventResponse>> getEvents(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        List<EventResponse> events = eventService.getEventsByUserId(userId);
        return ResponseEntity.ok(events);
    }

    @GetMapping("/{id}")
    public ResponseEntity<EventResponse> getEvent(@PathVariable Long id, Authentication authentication) {
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

    @PutMapping("/{id}")
    public ResponseEntity<EventResponse> updateEvent(@PathVariable Long id, @Valid @RequestBody EventRequest request, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        EventResponse event = eventService.updateEvent(id, request, userId);
        return ResponseEntity.ok(event);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEvent(@PathVariable Long id, Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        eventService.deleteEvent(id, userId);
        return ResponseEntity.noContent().build();
    }
}

