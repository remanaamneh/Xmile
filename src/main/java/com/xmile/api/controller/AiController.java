package com.xmile.api.controller;

import com.xmile.api.dto.ai.AiTextOption;
import com.xmile.api.dto.ai.AiTextsRequest;
import com.xmile.api.dto.ai.AiTextsResponse;
import com.xmile.api.service.campaign.AiCampaignService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiCampaignService aiCampaignService;

    /**
     * Generate 3 text options for AI content selection
     * 
     * Request: POST /api/ai/texts
     * Body: { "prompt": "טקסט ראשוני..." }
     * 
     * Response: 
     * {
     *   "texts": ["אופציה 1", "אופציה 2", "אופציה 3"],
     *   "options": [
     *     {"channel": "PROFESSIONAL", "text": "..."},
     *     {"channel": "FRIENDLY", "text": "..."},
     *     {"channel": "ENERGETIC", "text": "..."}
     *   ]
     * }
     */
    @PostMapping("/texts")
    public Map<String, Object> texts(@RequestBody Map<String, Object> body) {
        // DEBUG: Log incoming request
        System.out.println("DEBUG AiController: Received /api/ai/texts request");
        System.out.println("DEBUG AiController: body = " + body);
        
        String prompt = body.get("prompt") != null ? body.get("prompt").toString().trim() : "";
        System.out.println("DEBUG AiController: prompt = " + prompt);
        
        if (prompt.isEmpty()) {
            System.out.println("DEBUG AiController: Empty prompt, returning empty options");
            Map<String, Object> emptyResponse = new HashMap<>();
            emptyResponse.put("texts", List.of("", "", ""));
            emptyResponse.put("options", List.of(
                new AiTextOption("PROFESSIONAL", ""),
                new AiTextOption("FRIENDLY", ""),
                new AiTextOption("ENERGETIC", "")
            ));
            return emptyResponse;
        }

        // Use AI service to generate 3 different options
        AiTextsRequest request = new AiTextsRequest(
            body.get("campaignId") != null ? Long.parseLong(body.get("campaignId").toString()) : null,
            prompt
        );
        
        AiTextsResponse response = aiCampaignService.generateTexts(request);
        List<String> texts = response.texts();
        List<AiTextOption> options = response.options();

        System.out.println("DEBUG AiController: Returning " + texts.size() + " texts and " + options.size() + " options");
        // Return both "texts" (backward compatibility) and "options" (with channel info)
        Map<String, Object> result = new HashMap<>();
        result.put("texts", texts);
        result.put("options", options);
        return result;
    }
}
