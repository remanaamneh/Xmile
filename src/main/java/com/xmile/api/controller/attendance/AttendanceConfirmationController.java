package com.xmile.api.controller.attendance;

import com.xmile.api.dto.attendance.AttendanceRetryRequest;
import com.xmile.api.dto.attendance.AttendanceSendRequest;
import com.xmile.api.dto.attendance.ParticipantStatusUpdateRequest;
import com.xmile.api.dto.attendance.ParticipantTrackingDto;
import com.xmile.api.service.attendance.AttendanceConfirmationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/attendance")
@RequiredArgsConstructor
public class AttendanceConfirmationController {

    private final AttendanceConfirmationService service;

    @GetMapping("/events/{eventId}/participants")
    public ResponseEntity<List<ParticipantTrackingDto>> getParticipants(@PathVariable Long eventId) {
        return ResponseEntity.ok(service.getTracking(eventId));
    }

    @PostMapping("/confirmations/send")
    public ResponseEntity<Void> sendToPending(@RequestBody AttendanceSendRequest req) {
        service.sendToAudience(req);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/confirmations/retry")
    public ResponseEntity<Void> retry(@RequestBody AttendanceRetryRequest req) {
        service.retry(req);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/participants/{participantId}/status")
    public ResponseEntity<Void> updateStatus(@PathVariable Long participantId,
                                             @RequestBody ParticipantStatusUpdateRequest req) {
        service.updateStatus(participantId, req.status());
        return ResponseEntity.ok().build();
    }
}
