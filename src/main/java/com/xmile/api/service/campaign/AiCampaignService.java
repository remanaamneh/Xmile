package com.xmile.api.service.campaign;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.xmile.api.dto.ai.AiTextOption;
import com.xmile.api.dto.ai.AiTextsRequest;
import com.xmile.api.dto.ai.AiTextsResponse;
import com.xmile.api.dto.campaign.AiGenerateRequest;
import com.xmile.api.dto.campaign.AiGenerateResponse;
import com.xmile.api.model.Event;
import com.xmile.api.model.campaign.Campaign;
import com.xmile.api.repository.EventRepository;
import com.xmile.api.repository.campaign.CampaignRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AiCampaignService {

    private static final String AI_WEBHOOK_URL = "https://mouhij189.app.n8n.cloud/webhook/ai-texts";
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");

    private final WebClient.Builder webClientBuilder;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final EventRepository eventRepository;
    private final CampaignRepository campaignRepository;

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
                    .uri(AI_WEBHOOK_URL)
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
     * Returns 3 different message styles: PROFESSIONAL, FRIENDLY, ENERGETIC
     * Uses a single API call that returns 3 options
     */
    public AiTextsResponse generateTexts(AiTextsRequest req) {
        String idea = req.prompt() == null ? "" : req.prompt().trim();
        if (idea.isEmpty()) {
            idea = "כתוב הודעת הזמנה לאירוע";
        }

        // Get event details if campaignId is provided
        Event event = null;
        if (req.campaignId() != null) {
            try {
                Campaign campaign = campaignRepository.findById(req.campaignId()).orElse(null);
                if (campaign != null && campaign.getEventId() != null) {
                    event = eventRepository.findById(campaign.getEventId()).orElse(null);
                }
            } catch (Exception e) {
                System.err.println("Error fetching event for campaign: " + e.getMessage());
            }
        }

        // Build event details string
        String eventDetails = buildEventDetailsString(event);

        // Single system prompt that returns 3 options
        String systemPrompt = """
        אתה כותב הודעות הזמנה בעברית למשתתפים באירוע.
        תחזיר בדיוק 3 אפשרויות שונות בסגנון, לא בערוץ.

        כל אפשרות:
        - 2-3 משפטים (לא משפט אחד).
        - אפשר לכלול: מה האירוע + תאריך/שעה + מיקום (אם קיים) + למה כדאי להגיע (ערך/אווירה/תוכן).
        - אסור להוסיף: "לפרטים נוספים", "אנא השיבו", "צרו קשר", "לחצו כאן", "קישור", מספר טלפון, אימייל.
        - בלי חתימה בסוף.

        סגנונות:
        1) מקצועי ומכובד
        2) חברתי וחם (אפשר אימוג'ים)
        3) קליל ואנרגטי (אפשר אימוג'ים)

        החזר JSON בלבד בפורמט:
        {"texts":["...","...","..."]}
        """;

        String userPrompt = "רעיון מהמשתמש: " + idea;
        if (!eventDetails.isEmpty()) {
            userPrompt += "\n\nפרטי האירוע:\n" + eventDetails;
        }

        // Call AI once to get 3 options
        List<String> texts = callAiFor3Texts(systemPrompt, userPrompt, idea);

        // Ensure we have exactly 3 texts
        while (texts.size() < 3) {
            texts.add(generateProfessionalFallback(idea));
        }

        List<AiTextOption> options = List.of(
                new AiTextOption("PROFESSIONAL", texts.get(0).trim()),
                new AiTextOption("FRIENDLY", texts.get(1).trim()),
                new AiTextOption("ENERGETIC", texts.get(2).trim())
        );

        return new AiTextsResponse(texts.subList(0, 3), options);
    }

    /**
     * Build event details string for prompt
     */
    private String buildEventDetailsString(Event event) {
        if (event == null) {
            return "";
        }

        StringBuilder details = new StringBuilder();
        
        if (event.getName() != null && !event.getName().isEmpty()) {
            details.append("שם: ").append(event.getName()).append("\n");
        }
        
        if (event.getEventDate() != null) {
            details.append("תאריך: ").append(event.getEventDate().format(DATE_FORMATTER));
            if (event.getStartTime() != null) {
                details.append("\nשעה: ").append(event.getStartTime().format(TIME_FORMATTER));
            }
            details.append("\n");
        }
        
        if (event.getLocation() != null && !event.getLocation().isEmpty()) {
            details.append("מיקום: ").append(event.getLocation()).append("\n");
        }
        
        if (event.getParticipantCount() != null) {
            details.append("כמות משתתפים: ").append(event.getParticipantCount()).append("\n");
        }
        
        if (event.getDescription() != null && !event.getDescription().isEmpty()) {
            // Extract description without contact info
            String description = event.getDescription();
            if (description.contains("CONTACT_NAME:")) {
                description = description.substring(0, description.indexOf("CONTACT_NAME:")).trim();
            }
            if (!description.isEmpty()) {
                details.append("תיאור: ").append(description).append("\n");
            }
        }

        return details.toString().trim();
    }

    /**
     * Call AI once to get 3 text options
     */
    private List<String> callAiFor3Texts(String system, String user, String fallbackIdea) {
        try {
            WebClient webClient = webClientBuilder.build();
            String fullPrompt = system + "\n\n" + user;
            
            @SuppressWarnings("unchecked")
            Map<String, Object> response = (Map<String, Object>) webClient.post()
                    .uri(AI_WEBHOOK_URL)
                    .bodyValue(Map.of("message", fullPrompt))
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            if (response != null && response.containsKey("reply")) {
                String reply = (String) response.get("reply");
                // Check if reply contains error message
                if (reply != null && !isErrorResponse(reply)) {
                    return parse3TextsFromJson(reply, fallbackIdea);
                }
            }
        } catch (Exception e) {
            System.err.println("Error in AI 3 texts call: " + e.getMessage());
        }
        
        // Fallback: return 3 different fallback texts
        return List.of(
            generateProfessionalFallback(fallbackIdea),
            generateFriendlyFallback(fallbackIdea),
            generateEnergeticFallback(fallbackIdea)
        );
    }

    /**
     * Parse 3 texts from JSON response
     * Expected: {"texts":["...","...","..."]}
     */
    private List<String> parse3TextsFromJson(String raw, String fallbackIdea) {
        if (raw == null || raw.isBlank() || isErrorResponse(raw)) {
            return null;
        }
        
        try {
            // Try to find JSON
            int jsonStart = raw.indexOf('{');
            int jsonEnd = raw.lastIndexOf('}');
            
            if (jsonStart >= 0 && jsonEnd > jsonStart) {
                String jsonStr = raw.substring(jsonStart, jsonEnd + 1);
                JsonNode node = objectMapper.readTree(jsonStr);
                
                if (node.has("texts") && node.get("texts").isArray()) {
                    List<String> texts = new java.util.ArrayList<>();
                    for (JsonNode textNode : node.get("texts")) {
                        String text = textNode.asText().trim();
                        if (!text.isBlank() && !isErrorResponse(text)) {
                            texts.add(text);
                        }
                    }
                    if (texts.size() >= 3) {
                        return texts.subList(0, 3);
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("Error parsing 3 texts from JSON: " + e.getMessage());
        }
        
        return null;
    }

    /**
     * Make a single AI call for one text option
     * Uses temperature=0.9 and presence_penalty=0.6 to reduce repetition
     * Note: The chatbot endpoint may not support these parameters directly,
     * but we include them in the prompt for clarity
     */
    private String callAiText(String system, String user) {
        try {
            WebClient webClient = webClientBuilder.build();
            String fullPrompt = system + "\n\n" + user;
            
            // Note: temperature and presence_penalty would ideally be passed to the AI model,
            // but since we're using a proxy endpoint, we'll rely on the system prompt
            // to guide the model's behavior. If the endpoint supports these parameters,
            // they should be added to the request body.
            
            @SuppressWarnings("unchecked")
            Map<String, Object> response = (Map<String, Object>) webClient.post()
                    .uri(AI_WEBHOOK_URL)
                    .bodyValue(Map.of("message", fullPrompt))
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            if (response != null && response.containsKey("reply")) {
                String reply = (String) response.get("reply");
                // Check if reply contains error message
                if (reply != null && !isErrorResponse(reply)) {
                    String parsed = parseSingleTextFromJson(reply);
                    // Only return if parsed text is valid (not an error message)
                    if (parsed != null && !parsed.isBlank() && !isErrorResponse(parsed)) {
                        return parsed;
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("Error in AI text call: " + e.getMessage());
            // Return null to trigger fallback - don't return error message
        }
        return null;
    }

    /**
     * Check if response contains error indicators
     */
    private boolean isErrorResponse(String text) {
        if (text == null || text.isBlank()) {
            return false;
        }
        String lower = text.toLowerCase();
        return lower.contains("error") || 
               lower.contains("exception") || 
               lower.contains("failed") || 
               lower.contains("timeout") ||
               lower.contains("connection") ||
               lower.contains("unable to") ||
               lower.contains("cannot") ||
               lower.contains("could not");
    }

    /**
     * Parse single text from JSON response
     * Expected: {"text":"..."} or just plain text
     * Returns null if parsing fails or result looks like an error
     */
    private String parseSingleTextFromJson(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        
        // Check if raw contains error indicators
        if (isErrorResponse(raw)) {
            return null;
        }
        
        try {
            // Try to find JSON
            int jsonStart = raw.indexOf('{');
            int jsonEnd = raw.lastIndexOf('}');
            
            if (jsonStart >= 0 && jsonEnd > jsonStart) {
                String jsonStr = raw.substring(jsonStart, jsonEnd + 1);
                JsonNode node = objectMapper.readTree(jsonStr);
                
                if (node.has("text")) {
                    String text = node.get("text").asText().trim();
                    // Check if parsed text is an error message
                    if (!text.isBlank() && !isErrorResponse(text)) {
                        return text;
                    }
                }
            }
            
            // If no JSON, return first meaningful line (but not if it's an error)
            String[] lines = raw.split("\n");
            for (String line : lines) {
                line = line.trim();
                if (!line.isEmpty() && line.length() > 10) {
                    // Remove bullet points or numbers
                    line = line.replaceFirst("^[\\-•\\d\\.\\)\\s]+", "").trim();
                    if (!line.isEmpty() && !isErrorResponse(line)) {
                        return line;
                    }
                }
            }
            
            // Last resort: return trimmed raw text only if it's not an error
            String trimmed = raw.trim();
            if (!trimmed.isBlank() && !isErrorResponse(trimmed)) {
                return trimmed;
            }
        } catch (Exception e) {
            System.err.println("Error parsing single text: " + e.getMessage());
            // Don't return error message - return null to trigger fallback
        }
        return null;
    }

    /**
     * Parse JSON response from AI to extract 3 options
     * Expected format: {"options":[{"channel":"SMS","text":"..."}, ...]}
     */
    private List<String> parseJsonTo3Options(String raw, String userPrompt) {
        try {
            // Try to find JSON in the response
            int jsonStart = raw.indexOf('{');
            int jsonEnd = raw.lastIndexOf('}');
            
            if (jsonStart >= 0 && jsonEnd > jsonStart) {
                String jsonStr = raw.substring(jsonStart, jsonEnd + 1);
                JsonNode node = objectMapper.readTree(jsonStr);
                
                // Extract options array
                if (node.has("options") && node.get("options").isArray()) {
                    List<String> options = new java.util.ArrayList<>();
                    for (JsonNode option : node.get("options")) {
                        if (option.has("text")) {
                            options.add(option.get("text").asText());
                        } else if (option.isTextual()) {
                            options.add(option.asText());
                        }
                    }
                    if (options.size() >= 3) {
                        return options.subList(0, 3);
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("Error parsing JSON response: " + e.getMessage());
        }
        
        // Fallback to text parsing if JSON parsing fails
        return parseTo3Texts(raw, userPrompt);
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
        List<String> texts = getFallbackTexts(userPrompt);
        List<AiTextOption> options = List.of(
                new AiTextOption("PROFESSIONAL", texts.get(0)),
                new AiTextOption("FRIENDLY", texts.get(1)),
                new AiTextOption("ENERGETIC", texts.get(2))
        );
        return new AiTextsResponse(texts, options);
    }

    /**
     * Generate Professional fallback text
     */
    private String generateProfessionalFallback(String userPrompt) {
        String base = userPrompt.length() > 240 ? userPrompt.substring(0, 237) + "..." : userPrompt;
        return base;
    }

    /**
     * Generate Friendly fallback text
     */
    private String generateFriendlyFallback(String userPrompt) {
        String base = userPrompt + " 😊 נשמח לראות אותך!";
        if (base.length() > 240) {
            base = userPrompt.substring(0, Math.max(0, 240 - 20)) + " 😊";
        }
        return base;
    }

    /**
     * Generate Energetic fallback text
     */
    private String generateEnergeticFallback(String userPrompt) {
        String base = userPrompt + " 🎉✨ נשמח לראות אותך!";
        if (base.length() > 240) {
            base = userPrompt.substring(0, Math.max(0, 240 - 25)) + " 🎉✨";
        }
        return base;
    }

    /**
     * Simple method to generate 3 text options - can be used as fallback or standalone
     * Returns: PROFESSIONAL, FRIENDLY, ENERGETIC
     */
    public List<String> generate3Options(String prompt) {
        String userPrompt = prompt != null ? prompt.trim() : "";
        if (userPrompt.isEmpty()) {
            userPrompt = "עדכון חשוב לגבי האירוע";
        }
        
        return List.of(
            generateProfessionalFallback(userPrompt),
            generateFriendlyFallback(userPrompt),
            generateEnergeticFallback(userPrompt)
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

