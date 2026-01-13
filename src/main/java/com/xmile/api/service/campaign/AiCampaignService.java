package com.xmile.api.service.campaign;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.xmile.api.dto.ai.AiTextsRequest;
import com.xmile.api.dto.ai.AiTextsResponse;
import com.xmile.api.dto.campaign.AiGenerateRequest;
import com.xmile.api.dto.campaign.AiGenerateResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AiCampaignService {

    private final WebClient.Builder webClientBuilder;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public AiGenerateResponse generate(AiGenerateRequest req) {
        // DEBUG: Log the request to verify mapping
        System.out.println("DEBUG req = " + req);
        System.out.println("DEBUG req.prompt = " + (req == null ? null : req.prompt()));
        
        if (req == null) {
            System.err.println("ERROR: AiGenerateRequest is null!");
            return getFallbackResponse("");
        }
        
        // Get the actual prompt from request (not cached/placeholder)
        String userPrompt = req.prompt() != null ? req.prompt().trim() : "";
        if (userPrompt.isEmpty()) {
            System.out.println("WARNING: prompt is empty or null, using default");
            userPrompt = "צור הודעה לאירוע";
        }
        
        // Enhanced prompt to generate 3 different content options
        String system = """
        You are an assistant that writes marketing/event messages in Hebrew.
        Generate 3 DIFFERENT content options based on the user's request:
        1. SMS option: Short, concise (max 160 chars), direct message
        2. WhatsApp option: Friendly, casual, with emojis, conversational tone
        3. Email option: Formal, professional, detailed, structured
        
        Return JSON only with this structure:
        {
          "subject": "נושא ההודעה",
          "messageText": "ההודעה הבסיסית (Email style)",
          "suggestedTemplateCode": "DESIGN_1",
          "contentOptions": [
            "SMS version - short and direct",
            "WhatsApp version - friendly with emojis",
            "Email version - formal and detailed"
          ]
        }
        
        Make sure the 3 contentOptions are SIGNIFICANTLY different from each other.
        """;

        String user = "User request: " + userPrompt
                + "\nTone: " + (req.tone() == null ? "friendly" : req.tone())
                + "\nLanguage: " + (req.language() == null ? "he" : req.language());

        // Use n8n proxy endpoint
        try {
            WebClient webClient = webClientBuilder.build();
            @SuppressWarnings("unchecked")
            Map<String, Object> response = (Map<String, Object>) webClient.post()
                    .uri("http://localhost:8080/api/chatbot/message")
                    .bodyValue(Map.of("message", system + "\n" + user))
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            if (response != null && response.containsKey("reply")) {
                String reply = (String) response.get("reply");
                return parseAiResponse(reply, userPrompt);
            }

            // Fallback if response format is unexpected
            return getFallbackResponse(userPrompt);

        } catch (Exception e) {
            // Fallback if AI is not available
            System.err.println("AI Campaign Service error: " + e.getMessage());
            return getFallbackResponse(userPrompt);
        }
    }

    private AiGenerateResponse parseAiResponse(String raw, String userPrompt) {
        try {
            // Try to find JSON in the response
            int jsonStart = raw.indexOf('{');
            int jsonEnd = raw.lastIndexOf('}');
            
            if (jsonStart >= 0 && jsonEnd > jsonStart) {
                String jsonStr = raw.substring(jsonStart, jsonEnd + 1);
                JsonNode node = objectMapper.readTree(jsonStr);
                
                // Extract content options if available
                java.util.List<String> contentOptions = null;
                if (node.has("contentOptions") && node.get("contentOptions").isArray()) {
                    contentOptions = new java.util.ArrayList<>();
                    for (JsonNode option : node.get("contentOptions")) {
                        contentOptions.add(option.asText());
                    }
                }
                
                // If contentOptions not provided, generate 3 different ones
                if (contentOptions == null || contentOptions.size() < 3) {
                    String baseText = node.path("messageText").asText(userPrompt);
                    
                    contentOptions = java.util.List.of(
                        // SMS - Short and direct (max 160 chars)
                        baseText.length() > 160 ? baseText.substring(0, 157) + "..." : baseText,
                        // WhatsApp - Friendly with emojis
                        baseText + " 😊\n\nנשמח לראותך!",
                        // Email - Formal and detailed
                        "שלום רב,\n\n" + baseText + "\n\nבברכה,\nצוות האירוע"
                    );
                }
                
                return new AiGenerateResponse(
                        node.path("subject").asText("עדכון מהאירוע"),
                        node.path("messageText").asText(userPrompt),
                        node.path("suggestedTemplateCode").asText("DESIGN_1"),
                        contentOptions
                );
            }
            
            // If no JSON found, generate 3 different options from raw text
            java.util.List<String> contentOptions = java.util.List.of(
                raw.length() > 160 ? raw.substring(0, 157) + "..." : raw,
                raw + " 😊\n\nנשמח לראותך!",
                "שלום רב,\n\n" + raw + "\n\nבברכה,\nצוות האירוע"
            );
            
            return new AiGenerateResponse(
                    "עדכון מהאירוע",
                    raw,
                    "DESIGN_1",
                    contentOptions
            );
        } catch (Exception ex) {
            System.err.println("Error parsing AI response: " + ex.getMessage());
            return getFallbackResponse(userPrompt);
        }
    }

    private AiGenerateResponse getFallbackResponse(String userPrompt) {
        // Generate 3 SIGNIFICANTLY different options based on user prompt
        String baseMessage = userPrompt != null && !userPrompt.isEmpty() 
                ? userPrompt 
                : "עדכון חשוב לגבי האירוע";
        
        // Create 3 different content options: SMS (short), WhatsApp (friendly), Email (formal)
        java.util.List<String> contentOptions = java.util.List.of(
            // SMS - Short and direct (max 160 chars for SMS)
            baseMessage.length() > 160 ? baseMessage.substring(0, 157) + "..." : baseMessage,
            // WhatsApp - Friendly with emojis
            "היי! " + baseMessage + " 😊\n\nנשמח לראותך באירוע!\nלשאלות - השיבי להודעה",
            // Email - Formal and detailed
            "שלום רב,\n\n" + 
            "רצינו לעדכן אותך לגבי האירוע: " + baseMessage + 
            "\n\nלפרטים נוספים והשארת שאלות, אנא השיבו להודעה זו." +
            "\n\nבברכה,\nצוות האירוע"
        );
        
        return new AiGenerateResponse(
                "עדכון חשוב לגבי האירוע",
                baseMessage,
                "DESIGN_2",
                contentOptions
        );
    }

    /**
     * Generate 3 text options for the new simplified API
     */
    public AiTextsResponse generateTexts(AiTextsRequest req) {
        String userPrompt = req.prompt() != null ? req.prompt().trim() : "";
        if (userPrompt.isEmpty()) {
            userPrompt = "צור הודעה לאירוע";
        }

        String fullPrompt = """
        אתה יועץ שיווק בעברית לעסקים בישראל.
        המשימה: לשפר טקסט של הודעה למשתתפים/לקוחות ולתת 3 ניסוחים שונים.

        דרישות:
        - תחזיר בדיוק 3 אופציות.
        - כל אופציה פסקה אחת.
        - טון קליל/משכנע, לא רשמי מדי.
        - כל אופציה צריכה להיות שונה באמת.
        - אל תוסיף כותרות כמו "אפשרות 1" בתוך הטקסט.

        זה הטקסט של המשתמש:
        """ + userPrompt;

        // Use the same chatbot endpoint
        try {
            WebClient webClient = webClientBuilder.build();
            @SuppressWarnings("unchecked")
            Map<String, Object> response = (Map<String, Object>) webClient.post()
                    .uri("http://localhost:8080/api/chatbot/message")
                    .bodyValue(Map.of("message", fullPrompt))
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            if (response != null && response.containsKey("reply")) {
                String reply = (String) response.get("reply");
                List<String> texts = parseTo3Texts(reply, userPrompt);
                // Ensure we always return exactly 3 texts
                if (texts.size() < 3) {
                    texts = ensure3Texts(texts, userPrompt);
                }
                return new AiTextsResponse(texts.subList(0, Math.min(3, texts.size())));
            }

            // Fallback if response format is unexpected
            return getFallbackTextsResponse(userPrompt);

        } catch (Exception e) {
            System.err.println("AI Texts Service error: " + e.getMessage());
            return getFallbackTextsResponse(userPrompt);
        }
    }

    private List<String> parseTo3Texts(String raw, String userPrompt) {
        // Parse lines/bullets and extract 3 "real" texts
        List<String> lines = Arrays.stream(raw.split("\n"))
                .map(String::trim)
                .map(s -> s.replaceFirst("^[\\-•\\d\\.\\)\\s]+", "").trim())
                .filter(s -> !s.isBlank())
                .filter(s -> s.length() > 10)
                .toList();

        // If model returned 3 paragraphs - perfect
        if (lines.size() >= 3) {
            return lines.subList(0, 3);
        }

        // fallback if returned less
        return getFallbackTexts(userPrompt);
    }

    private AiTextsResponse getFallbackTextsResponse(String userPrompt) {
        return new AiTextsResponse(getFallbackTexts(userPrompt));
    }

    /**
     * Simple method to generate 3 text options - can be used as fallback or standalone
     */
    public List<String> generate3Options(String prompt) {
        String userPrompt = prompt != null ? prompt.trim() : "";
        if (userPrompt.isEmpty()) {
            userPrompt = "עדכון חשוב לגבי האירוע";
        }
        
        return List.of(
                userPrompt + " 😊 נשמח לראות אותך! לפרטים נוספים השיבי להודעה.",
                userPrompt + " ✨ מזכירים בעדינות — מחכים לך, יש שאלות? אנחנו כאן.",
                userPrompt + " 🙌 אל תפספס/י! שמרי מקום והצטרפי אלינו."
        );
    }

    private List<String> getFallbackTexts(String userPrompt) {
        return generate3Options(userPrompt);
    }

    /**
     * Ensure we have exactly 3 texts by filling missing ones with fallback
     */
    private List<String> ensure3Texts(List<String> existingTexts, String userPrompt) {
        List<String> result = new java.util.ArrayList<>(existingTexts);
        List<String> fallback = getFallbackTexts(userPrompt);
        
        while (result.size() < 3) {
            int idx = result.size();
            if (idx < fallback.size()) {
                result.add(fallback.get(idx));
            } else {
                result.add("עדכון חשוב לגבי האירוע. נשמח לראותך!");
            }
        }
        
        return result;
    }
}

