package com.xmile.api.controller;

import com.xmile.api.dto.AIMessageRequest;
import com.xmile.api.dto.AIMessageResponse;
import com.xmile.api.dto.MessageRequest;
import com.xmile.api.service.MessageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/messages")
@RequiredArgsConstructor
public class MessageController {

    private final MessageService messageService;

    @PostMapping("/ai/generate")
    public ResponseEntity<AIMessageResponse> generateAIMessages(
            @Valid @RequestBody AIMessageRequest request,
            Authentication authentication) {
        AIMessageResponse response = messageService.generateAIMessages(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/send")
    public ResponseEntity<Void> sendMessages(
            @Valid @RequestBody MessageRequest request,
            Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        messageService.sendMessages(request, userId);
        return ResponseEntity.ok().build();
    }
}

