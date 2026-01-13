package com.xmile.api.controller;

import com.xmile.api.dto.UpdatePasswordRequest;
import com.xmile.api.dto.common.ApiResponse;
import com.xmile.api.exception.NotFoundException;
import com.xmile.api.model.Role;
import com.xmile.api.model.User;
import com.xmile.api.repository.UserRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @PutMapping("/{id}/password")
    public ResponseEntity<ApiResponse<Void>> updatePassword(
            @PathVariable Long id,
            @Valid @RequestBody UpdatePasswordRequest request,
            Authentication authentication) {
        
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        Long currentUserId = (Long) authentication.getPrincipal();
        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new NotFoundException("Current user not found"));
        
        // Check if user is trying to update their own password OR is an admin
        if (!currentUserId.equals(id) && currentUser.getRole() != Role.ADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        
        User user = userRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("User not found"));
        
        // Update password
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        userRepository.save(user);
        
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .message("Password updated successfully")
                .build());
    }
}
