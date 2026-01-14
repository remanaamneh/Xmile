package com.xmile.api.dto.attendance;

import java.util.List;

public record AttendanceSendRequest(
        Long eventId,
        String message,
        List<String> channels,
        String audience
) {}
