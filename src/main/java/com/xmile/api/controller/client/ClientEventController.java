package com.xmile.api.controller.client;

import com.xmile.api.dto.MyEventResponse;
import com.xmile.api.model.Event;
import com.xmile.api.model.EventQuote;
import com.xmile.api.model.EventQuoteStatus;
import com.xmile.api.repository.EventQuoteRepository;
import com.xmile.api.repository.EventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/client")
@RequiredArgsConstructor
public class ClientEventController {
    private final EventRepository eventRepository;
    private final EventQuoteRepository eventQuoteRepository;

    @GetMapping("/events")
    @PreAuthorize("hasRole('CLIENT')")
    public ResponseEntity<List<MyEventResponse>> getClientEvents(Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        List<Event> events = eventRepository.findByClientUser_Id(userId);
        
        List<MyEventResponse> myEvents = events.stream()
                .map(event -> {
                    // Get final price from approved quote
                    BigDecimal finalPrice = null;
                    List<EventQuote> quotes = eventQuoteRepository.findByEvent_Id(event.getId());
                    EventQuote approvedQuote = quotes.stream()
                            .filter(q -> q.getStatus() == EventQuoteStatus.APPROVED)
                            .findFirst()
                            .orElse(null);
                    if (approvedQuote != null) {
                        // Use quoteAmount as final price for approved quotes
                        finalPrice = approvedQuote.getQuoteAmount();
                    }
                    
                    return MyEventResponse.builder()
                            .id(event.getId())
                            .name(event.getName())
                            .status(event.getStatus())
                            .eventDate(event.getEventDate())
                            .location(event.getLocation())
                            .finalPrice(finalPrice)
                            .build();
                })
                .collect(Collectors.toList());
        
        return ResponseEntity.ok(myEvents);
    }
}

