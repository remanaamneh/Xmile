package com.xmile.api.dto.attendance;

import java.util.List;

public record AttendanceRetryRequest(
        Long participantId,
        Long eventId,
        String message,
        List<String> channels
) {}
