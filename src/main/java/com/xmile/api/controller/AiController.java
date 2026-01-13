package com.xmile.api.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {

    /**
     * Generate 3 text options for AI content selection (simple version)
     * 
     * Request: POST /api/ai/texts
     * Body: { "prompt": "טקסט ראשוני..." }
     * 
     * Response: { "texts": ["אופציה 1", "אופציה 2", "אופציה 3"] }
     */
    @PostMapping("/texts")
    public Map<String, List<String>> texts(@RequestBody Map<String, Object> body) {
        // DEBUG: Log incoming request
        System.out.println("DEBUG AiController: Received /api/ai/texts request");
        System.out.println("DEBUG AiController: body = " + body);
        
        String prompt = body.get("prompt") != null ? body.get("prompt").toString().trim() : "";
        System.out.println("DEBUG AiController: prompt = " + prompt);
        
        if (prompt.isEmpty()) {
            System.out.println("DEBUG AiController: Empty prompt, returning empty texts");
            return Map.of("texts", List.of("", "", ""));
        }

        // זמני (דמו) - 3 וריאציות של הטקסט המקורי ללא משפטים קבועים
        // TODO: אחרי זה נחבר ל-OpenAI עם פרומפט שמשפר את הטקסט בלבד
        // אופציה 1: הטקסט כמו שהוא (לרפרנס)
        String option1 = prompt;
        
        // אופציה 2: וריאציה קלה - הוספת נקודה אם אין
        String option2 = prompt.endsWith(".") || prompt.endsWith("!") || prompt.endsWith("?") 
                ? prompt 
                : prompt + ".";
        
        // אופציה 3: גרסה קצרה יותר אם הטקסט ארוך
        String option3 = prompt.length() > 80 
                ? prompt.substring(0, Math.min(80, prompt.length())) + "..." 
                : prompt;
        
        List<String> texts = List.of(option1, option2, option3);

        System.out.println("DEBUG AiController: Returning " + texts.size() + " texts");
        return Map.of("texts", texts);
    }
}
