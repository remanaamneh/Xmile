package com.xmile.api.repository;

import com.xmile.api.model.WorkerCheckin;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WorkerCheckinRepository extends JpaRepository<WorkerCheckin, Long> {
    List<WorkerCheckin> findByEvent_Id(Long eventId);
    Optional<WorkerCheckin> findByEvent_IdAndUser_Id(Long eventId, Long userId);
}


