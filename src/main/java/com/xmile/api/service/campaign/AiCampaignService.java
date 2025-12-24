package com.xmile.api.service.campaign;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.xmile.api.dto.campaign.AiGenerateRequest;
import com.xmile.api.dto.campaign.AiGenerateResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class AiCampaignService {

    private final WebClient.Builder webClientBuilder;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public AiGenerateResponse generate(AiGenerateRequest req) {
        // Prompt "מוכן" שמחזיר subject+body+templateCode
        String system = """
        You are an assistant that writes marketing/event messages.
        Return JSON only: {"subject":"...","messageText":"...","suggestedTemplateCode":"DESIGN_1..DESIGN_5"}
        Keep it short, actionable, and friendly.
        """;

        String user = "Prompt: " + req.prompt()
                + "\nTone: " + (req.tone() == null ? "friendly" : req.tone())
                + "\nLanguage: " + (req.language() == null ? "he" : req.language());

        // Use n8n proxy endpoint
        try {
            WebClient webClient = webClientBuilder.build();
            Map<String, Object> response = webClient.post()
                    .uri("http://localhost:8080/api/chatbot/message")
                    .bodyValue(Map.of("message", system + "\n" + user))
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            if (response != null && response.containsKey("reply")) {
                String reply = (String) response.get("reply");
                return parseAiResponse(reply);
            }

            // Fallback if response format is unexpected
            return getFallbackResponse();

        } catch (Exception e) {
            // Fallback if AI is not available
            System.err.println("AI Campaign Service error: " + e.getMessage());
            return getFallbackResponse();
        }
    }

    private AiGenerateResponse parseAiResponse(String raw) {
        try {
            // Try to find JSON in the response
            int jsonStart = raw.indexOf('{');
            int jsonEnd = raw.lastIndexOf('}');
            
            if (jsonStart >= 0 && jsonEnd > jsonStart) {
                String jsonStr = raw.substring(jsonStart, jsonEnd + 1);
                JsonNode node = objectMapper.readTree(jsonStr);
                
                return new AiGenerateResponse(
                        node.path("subject").asText("עדכון מהאירוע"),
                        node.path("messageText").asText("שלום! מצורף עדכון קצר לגבי האירוע."),
                        node.path("suggestedTemplateCode").asText("DESIGN_1")
                );
            }
            
            // If no JSON found, use the raw text as message
            return new AiGenerateResponse(
                    "עדכון מהאירוע",
                    raw,
                    "DESIGN_1"
            );
        } catch (Exception ex) {
            System.err.println("Error parsing AI response: " + ex.getMessage());
            return getFallbackResponse();
        }
    }

    private AiGenerateResponse getFallbackResponse() {
        return new AiGenerateResponse(
                "עדכון חשוב לגבי האירוע",
                "היי! רצינו לעדכן אותך לגבי האירוע. לפרטים נוספים והשארת שאלות – השיבי להודעה 🙂",
                "DESIGN_2"
        );
    }
}

