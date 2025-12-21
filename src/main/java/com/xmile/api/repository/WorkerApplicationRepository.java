package com.xmile.api.repository;

import com.xmile.api.model.WorkerApplication;
import com.xmile.api.model.WorkerApplicationStatus;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WorkerApplicationRepository extends JpaRepository<WorkerApplication, Long> {
    List<WorkerApplication> findByRequest_Id(Long requestId);
    Optional<WorkerApplication> findByRequest_IdAndUser_Id(Long requestId, Long userId);
    List<WorkerApplication> findByUser_Id(Long userId);

    boolean existsByRequest_IdAndUser_Id(Long requestId, Long userId);

    long countByRequest_IdAndStatus(Long requestId, WorkerApplicationStatus status);

}


