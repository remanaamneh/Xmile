package com.xmile.api.service.campaign;

import com.xmile.api.dto.campaign.*;
import com.xmile.api.exception.NotFoundException;
import com.xmile.api.model.campaign.Campaign;
import com.xmile.api.model.campaign.CampaignRecipient;
import com.xmile.api.model.campaign.CampaignTemplate;
import com.xmile.api.repository.campaign.CampaignRecipientRepository;
import com.xmile.api.repository.campaign.CampaignRepository;
import com.xmile.api.repository.campaign.CampaignTemplateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CampaignService {

    private final CampaignRepository campaignRepo;
    private final CampaignRecipientRepository recipientRepo;
    private final CampaignTemplateRepository templateRepo;
    private final AiCampaignService aiService;
    private final NotificationSender sender;

    public CampaignView create(Long clientUserId, CreateCampaignRequest req) {
        Campaign c = new Campaign();
        c.setClientUserId(clientUserId);
        c.setEventId(req.eventId());
        c.setName(req.name());
        c.setStatus(Campaign.Status.DRAFT);
        c = campaignRepo.save(c);

        return toView(c, 0);
    }

    @Transactional
    public void addRecipients(Long campaignId, AddRecipientsRequest req) {
        Campaign campaign = campaignRepo.findById(campaignId)
                .orElseThrow(() -> new NotFoundException("Campaign not found"));

        if (req == null || req.recipients() == null) return;
        
        for (var r : req.recipients()) {
            CampaignRecipient cr = new CampaignRecipient();
            cr.setCampaignId(campaignId);
            cr.setFullName(r.fullName());
            cr.setEmail(r.email());
            cr.setPhone(r.phone());
            cr.setWhatsapp(r.whatsapp());
            recipientRepo.save(cr);
        }
    }

    public AiGenerateResponse generateAi(Long campaignId, AiGenerateRequest req) {
        Campaign c = campaignRepo.findById(campaignId)
                .orElseThrow(() -> new NotFoundException("Campaign not found"));

        AiGenerateResponse ai = aiService.generate(req);

        c.setAiPrompt(req.prompt());
        c.setSubject(ai.subject());
        c.setMessageText(ai.messageText());

        // Map template code → template id
        Long templateId = templateRepo.findAll().stream()
                .filter(t -> t.getCode().equalsIgnoreCase(ai.suggestedTemplateCode()))
                .map(CampaignTemplate::getId)
                .findFirst().orElse(null);

        c.setTemplateId(templateId);
        c.setStatus(Campaign.Status.READY);
        campaignRepo.save(c);

        return ai;
    }

    public List<CampaignTemplate> listTemplates() {
        return templateRepo.findAll();
    }

    public void selectTemplate(Long campaignId, SelectTemplateRequest req) {
        Campaign c = campaignRepo.findById(campaignId)
                .orElseThrow(() -> new NotFoundException("Campaign not found"));
        
        // Verify template exists
        templateRepo.findById(req.templateId())
                .orElseThrow(() -> new NotFoundException("Template not found"));
        
        c.setTemplateId(req.templateId());
        campaignRepo.save(c);
    }

    @Transactional
    public void sendCampaign(Long campaignId, SendCampaignRequest req) {
        Campaign c = campaignRepo.findById(campaignId)
                .orElseThrow(() -> new NotFoundException("Campaign not found"));
        
        List<CampaignRecipient> recipients = recipientRepo.findByCampaignId(campaignId);
        
        if (recipients.isEmpty()) {
            throw new IllegalArgumentException("No recipients found for campaign");
        }

        Campaign.Channel channel = Campaign.Channel.valueOf(req.channel().toUpperCase());
        c.setChannel(channel);
        if (req.subject() != null && !req.subject().isBlank()) {
            c.setSubject(req.subject());
        }
        if (req.messageText() != null && !req.messageText().isBlank()) {
            c.setMessageText(req.messageText());
        }

        boolean anyFailed = false;

        for (CampaignRecipient r : recipients) {
            try {
                switch (channel) {
                    case EMAIL -> {
                        if (r.getEmail() == null || r.getEmail().isBlank()) {
                            throw new IllegalArgumentException("missing email");
                        }
                        sender.sendEmail(r.getEmail(), c.getSubject(), c.getMessageText());
                    }
                    case SMS -> {
                        if (r.getPhone() == null || r.getPhone().isBlank()) {
                            throw new IllegalArgumentException("missing phone");
                        }
                        sender.sendSms(r.getPhone(), c.getMessageText());
                    }
                    case WHATSAPP -> {
                        String wa = (r.getWhatsapp() != null && !r.getWhatsapp().isBlank()) 
                                ? r.getWhatsapp() 
                                : r.getPhone();
                        if (wa == null || wa.isBlank()) {
                            throw new IllegalArgumentException("missing whatsapp/phone");
                        }
                        sender.sendWhatsApp(wa, c.getMessageText());
                    }
                }
                r.setStatus(CampaignRecipient.Status.SENT);
                r.setErrorMsg(null);
            } catch (Exception ex) {
                anyFailed = true;
                r.setStatus(CampaignRecipient.Status.FAILED);
                r.setErrorMsg(ex.getMessage() != null && ex.getMessage().length() > 500 
                        ? ex.getMessage().substring(0, 500) 
                        : ex.getMessage());
            }
            recipientRepo.save(r);
        }

        c.setStatus(anyFailed ? Campaign.Status.FAILED : Campaign.Status.SENT);
        campaignRepo.save(c);
    }

    public List<CampaignView> myCampaigns(Long clientUserId) {
        return campaignRepo.findByClientUserIdOrderByIdDesc(clientUserId)
                .stream()
                .map(c -> toView(c, recipientRepo.countByCampaignId(c.getId())))
                .toList();
    }

    private CampaignView toView(Campaign c, long recipientsCount) {
        return new CampaignView(
                c.getId(),
                c.getEventId(),
                c.getName(),
                c.getStatus().name(),
                c.getChannel() == null ? null : c.getChannel().name(),
                c.getSubject(),
                c.getMessageText(),
                c.getTemplateId(),
                recipientsCount
        );
    }
}

