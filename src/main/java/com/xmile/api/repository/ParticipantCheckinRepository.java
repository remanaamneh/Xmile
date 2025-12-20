package com.xmile.api.repository;

import com.xmile.api.model.ParticipantCheckin;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ParticipantCheckinRepository extends JpaRepository<ParticipantCheckin, Long> {
    List<ParticipantCheckin> findByEvent_Id(Long eventId);
    Optional<ParticipantCheckin> findByEvent_IdAndParticipant_Id(Long eventId, Long participantId);
}


