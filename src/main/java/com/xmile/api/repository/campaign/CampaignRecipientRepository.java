package com.xmile.api.repository.campaign;

import com.xmile.api.model.campaign.CampaignRecipient;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CampaignRecipientRepository extends JpaRepository<CampaignRecipient, Long> {
    List<CampaignRecipient> findByCampaignId(Long campaignId);
    long countByCampaignId(Long campaignId);
}

