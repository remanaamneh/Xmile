package com.xmile.api.service;

import com.xmile.api.dto.AIMessageRequest;
import com.xmile.api.dto.AIMessageResponse;
import com.xmile.api.dto.MessageRequest;
import com.xmile.api.model.Event;
import com.xmile.api.repository.EventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MessageService {

    private final EventRepository eventRepository;

    public AIMessageResponse generateAIMessages(AIMessageRequest request) {
        // Simulate AI generation - in production, integrate with actual AI service
        Event event = null;
        if (request.getEventId() != null) {
            event = eventRepository.findById(request.getEventId()).orElse(null);
        }

        // Generate 3 content options
        List<String> contentOptions = Arrays.asList(
            generateContentOption1(request, event),
            generateContentOption2(request, event),
            generateContentOption3(request, event)
        );

        // Generate 3 design options
        List<AIMessageResponse.DesignOption> designOptions = Arrays.asList(
            AIMessageResponse.DesignOption.builder()
                .name("עיצוב קלאסי")
                .description("עיצוב מקצועי ופורמלי")
                .colors(Arrays.asList("#1a1a1a", "#4285f4", "#ffffff"))
                .build(),
            AIMessageResponse.DesignOption.builder()
                .name("עיצוב מודרני")
                .description("עיצוב צבעוני ומודרני")
                .colors(Arrays.asList("#4285f4", "#34a853", "#fbbc04"))
                .build(),
            AIMessageResponse.DesignOption.builder()
                .name("עיצוב מותאם אישית")
                .description("עיצוב בהתאם לאירוע")
                .colors(Arrays.asList("#9c27b0", "#ff5733", "#ffffff"))
                .build()
        );

        return AIMessageResponse.builder()
                .contentOptions(contentOptions)
                .designOptions(designOptions)
                .build();
    }

    private String generateContentOption1(AIMessageRequest request, Event event) {
        StringBuilder content = new StringBuilder();
        content.append("שלום רב,\n\n");
        content.append("אנו שמחים להזמינך לאירוע: ");
        if (event != null) {
            content.append(event.getName()).append("\n");
            content.append("תאריך: ").append(event.getEventDate()).append("\n");
            content.append("מיקום: ").append(event.getLocation()).append("\n");
        }
        content.append("\n").append(request.getRequest());
        content.append("\n\nנשמח לראותך!\nבברכה");
        return content.toString();
    }

    private String generateContentOption2(AIMessageRequest request, Event event) {
        StringBuilder content = new StringBuilder();
        content.append("היי!\n\n");
        content.append("מזמינים אותך לאירוע שלנו: ");
        if (event != null) {
            content.append(event.getName()).append("\n");
        }
        content.append("\n").append(request.getRequest());
        content.append("\n\nמצפים לראותך!");
        return content.toString();
    }

    private String generateContentOption3(AIMessageRequest request, Event event) {
        StringBuilder content = new StringBuilder();
        content.append("כבוד/ה,\n\n");
        content.append("בהתאם להזמנה, אנו מבקשים את נוכחותך באירוע: ");
        if (event != null) {
            content.append(event.getName()).append("\n");
            content.append("פרטים:\n");
            content.append("- תאריך: ").append(event.getEventDate()).append("\n");
            content.append("- שעה: ").append(event.getStartTime()).append("\n");
            content.append("- מיקום: ").append(event.getLocation()).append("\n");
        }
        content.append("\n").append(request.getRequest());
        content.append("\n\nבכבוד רב");
        return content.toString();
    }

    public void sendMessages(MessageRequest request, Long userId) {
        Event event = eventRepository.findById(request.getEventId())
                .orElseThrow(() -> new RuntimeException("Event not found"));

        // Verify ownership
        if (!event.getClientUser().getId().equals(userId)) {
            throw new RuntimeException("Unauthorized");
        }

        // Parse participants
        List<String> participants = request.getParticipants();

        // In production, integrate with SMS and Email services
        // For now, just log
        System.out.println("Sending messages to " + participants.size() + " participants");
        System.out.println("Event: " + event.getName());
        System.out.println("Content: " + request.getContent());
        System.out.println("Send Email: " + request.getSendEmail());
        System.out.println("Send SMS: " + request.getSendSMS());

        // TODO: Integrate with actual SMS/Email services
        // - SMS: Twilio, AWS SNS, etc.
        // - Email: SendGrid, AWS SES, etc.
    }
}

