package com.xmile.api.repository;

import com.xmile.api.model.WorkerShift;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface WorkerShiftRepository extends JpaRepository<WorkerShift, Long> {
    List<WorkerShift> findByWorkerUser_Id(Long workerUserId);
    
    @Query("SELECT ws FROM WorkerShift ws WHERE ws.workerUser.id = :workerUserId " +
           "AND YEAR(ws.workDate) = :year AND MONTH(ws.workDate) = :month")
    List<WorkerShift> findByWorkerUser_IdAndYearAndMonth(
            @Param("workerUserId") Long workerUserId,
            @Param("year") int year,
            @Param("month") int month);
    
    List<WorkerShift> findByWorkerUser_IdAndWorkDateBetween(
            Long workerUserId, LocalDate startDate, LocalDate endDate);
}


