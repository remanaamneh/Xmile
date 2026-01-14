package com.xmile.api.dto.attendance;

import java.util.List;

public record ParticipantTrackingDto(
        Long id,
        String fullName,
        String email,
        String phone,
        String status,
        List<String> channelsUsed
) {}
