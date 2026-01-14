package com.xmile.api.service.attendance;

import com.xmile.api.dto.attendance.AttendanceRetryRequest;
import com.xmile.api.dto.attendance.AttendanceSendRequest;
import com.xmile.api.dto.attendance.ParticipantTrackingDto;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AttendanceConfirmationService {

    public List<ParticipantTrackingDto> getTracking(Long eventId) {
        // TODO:
        // 1) Fetch participants by eventId
        // 2) Build ParticipantTrackingDto with status + channelsUsed
        return List.of();
    }

    public void sendToAudience(AttendanceSendRequest req) {
        // TODO:
        // 1) Find all participants for eventId in status PENDING
        // 2) Send via channels (Email/SMS/WhatsApp)
        // 3) Update channelsUsed + status=SENT / FAILED
    }

    public void retry(AttendanceRetryRequest req) {
        // TODO: resend for a single participantId
    }

    public void updateStatus(Long participantId, String status) {
        // TODO: update participant status
    }
}
