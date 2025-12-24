package com.xmile.api.controller.client;

import com.xmile.api.dto.campaign.*;
import com.xmile.api.model.campaign.CampaignTemplate;
import com.xmile.api.service.campaign.CampaignService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/client/campaigns")
@PreAuthorize("hasRole('CLIENT')")
public class ClientCampaignController {

    private final CampaignService service;

    private Long currentUserId(Authentication auth) {
        if (auth == null || auth.getPrincipal() == null) {
            throw new IllegalStateException("User not authenticated");
        }
        return (Long) auth.getPrincipal();
    }

    @PostMapping
    public ResponseEntity<CampaignView> create(Authentication auth, @RequestBody @Valid CreateCampaignRequest req) {
        CampaignView view = service.create(currentUserId(auth), req);
        return ResponseEntity.ok(view);
    }

    @PostMapping("/{id}/recipients")
    public ResponseEntity<Void> addRecipients(@PathVariable Long id, @RequestBody AddRecipientsRequest req) {
        service.addRecipients(id, req);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/ai-generate")
    public ResponseEntity<AiGenerateResponse> aiGenerate(@PathVariable Long id, @RequestBody @Valid AiGenerateRequest req) {
        AiGenerateResponse response = service.generateAi(id, req);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/templates")
    public ResponseEntity<List<CampaignTemplate>> templates() {
        List<CampaignTemplate> templates = service.listTemplates();
        return ResponseEntity.ok(templates);
    }

    @PutMapping("/{id}/template")
    public ResponseEntity<Void> selectTemplate(@PathVariable Long id, @RequestBody @Valid SelectTemplateRequest req) {
        service.selectTemplate(id, req);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/send")
    public ResponseEntity<Void> send(@PathVariable Long id, @RequestBody @Valid SendCampaignRequest req) {
        service.sendCampaign(id, req);
        return ResponseEntity.ok().build();
    }

    @GetMapping
    public ResponseEntity<List<CampaignView>> mine(Authentication auth) {
        List<CampaignView> campaigns = service.myCampaigns(currentUserId(auth));
        return ResponseEntity.ok(campaigns);
    }
}

