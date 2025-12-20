package com.xmile.api.repository;

import com.xmile.api.model.Participant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ParticipantRepository extends JpaRepository<Participant, Long> {
    List<Participant> findByEvent_Id(Long eventId);
    List<Participant> findByEvent_IdAndStatus(Long eventId, com.xmile.api.model.ParticipantStatus status);
}


