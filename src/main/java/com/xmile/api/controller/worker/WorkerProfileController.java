package com.xmile.api.controller.worker;

import com.xmile.api.dto.WorkerProfileDTO;
import com.xmile.api.model.User;
import com.xmile.api.model.WorkerProfile;
import com.xmile.api.repository.UserRepository;
import com.xmile.api.repository.WorkerProfileRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

// DISABLED: WORKER role removed from system
//@RestController
@RequestMapping("/worker/profile")
@RequiredArgsConstructor
//@PreAuthorize("hasRole('WORKER')")
public class WorkerProfileController {

    private final WorkerProfileRepository workerProfileRepository;
    private final UserRepository userRepository;

    /**
     * Get worker profile
     * GET /worker/profile
     */
    @GetMapping
    public ResponseEntity<WorkerProfileDTO> getProfile(Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Long userId = (Long) authentication.getPrincipal();
        
        WorkerProfile profile = workerProfileRepository.findByUser_Id(userId)
                .orElse(null);
        
        if (profile == null) {
            // Return empty profile if not found
            return ResponseEntity.ok(WorkerProfileDTO.builder()
                    .userId(userId)
                    .build());
        }
        
        return ResponseEntity.ok(toDTO(profile));
    }

    /**
     * Update worker profile
     * PUT /worker/profile
     */
    @PutMapping
    public ResponseEntity<WorkerProfileDTO> updateProfile(
            @Valid @RequestBody WorkerProfileDTO request,
            Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        Long userId = (Long) authentication.getPrincipal();
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        WorkerProfile profile = workerProfileRepository.findByUser_Id(userId)
                .orElse(WorkerProfile.builder()
                        .user(user)
                        .isActive(true)
                        .build());
        
        // Update fields
        profile.setPhone(request.getPhone());
        profile.setCity(request.getCity());
        profile.setLocationText(request.getLocationText());
        profile.setAvailability(request.getAvailability());
        profile.setSkills(request.getSkills());
        profile.setHomeLat(request.getHomeLat());
        profile.setHomeLng(request.getHomeLng());
        
        profile = workerProfileRepository.save(profile);
        
        return ResponseEntity.ok(toDTO(profile));
    }

    private WorkerProfileDTO toDTO(WorkerProfile profile) {
        return WorkerProfileDTO.builder()
                .id(profile.getId())
                .userId(profile.getUser().getId())
                .phone(profile.getPhone())
                .city(profile.getCity())
                .locationText(profile.getLocationText())
                .availability(profile.getAvailability())
                .skills(profile.getSkills())
                .homeLat(profile.getHomeLat())
                .homeLng(profile.getHomeLng())
                .isActive(profile.getIsActive())
                .build();
    }
}

