package com.xmile.api.dto.campaign;

import java.util.List;

public record AddRecipientsRequest(
        List<RecipientItem> recipients
) {
    public record RecipientItem(String fullName, String email, String phone, String whatsapp) {}
}

