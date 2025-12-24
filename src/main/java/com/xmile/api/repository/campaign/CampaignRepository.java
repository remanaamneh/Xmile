package com.xmile.api.repository.campaign;

import com.xmile.api.model.campaign.Campaign;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CampaignRepository extends JpaRepository<Campaign, Long> {
    List<Campaign> findByClientUserIdOrderByIdDesc(Long clientUserId);
}

