package com.xmile.api.controller;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.util.Map;

@RestController
@RequestMapping("/api/chatbot")
@CrossOrigin(origins = "*")
public class ChatbotProxyController {

    private final WebClient webClient;

    // n8n webhook URL
    private static final String N8N_WEBHOOK_URL = "https://mouhij189.app.n8n.cloud/webhook/chat";

    public ChatbotProxyController(WebClient.Builder builder) {
        this.webClient = builder.build();
    }

    @PostMapping(value = "/message", produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> sendMessage(@RequestBody Map<String, Object> body) {
        try {
            // Forward request to n8n webhook
            // Expects: { "message": "...", "sessionId": "..." }
            Map<String, Object> n8nResponse = webClient
                    .post()
                    .uri(N8N_WEBHOOK_URL)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            // Return exactly what n8n returned (e.g., {reply: "..."})
            return n8nResponse != null ? n8nResponse : Map.of("reply", "לא התקבלה תשובה מהשרת");
            
        } catch (WebClientResponseException e) {
            // Handle n8n errors
            return Map.of(
                    "reply", 
                    "מצטער, אירעה שגיאה בשרת: " + e.getStatusCode() + ". " + 
                    (e.getResponseBodyAsString() != null ? e.getResponseBodyAsString() : "")
            );
        } catch (Exception e) {
            // Handle other errors
            return Map.of("reply", "מצטער, אירעה שגיאה. אנא נסה שוב מאוחר יותר.");
        }
    }
}

