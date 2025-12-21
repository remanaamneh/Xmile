package com.xmile.api.service;

import com.xmile.api.model.Role;
import com.xmile.api.model.User;
import com.xmile.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
@SuppressWarnings("null")
public class AdminSeederService implements CommandLineRunner {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${admin.email}")
    private String adminEmail;

    @Value("${admin.password}")
    private String adminPassword;

    @Override
    public void run(String... args) {
        userRepository.findByEmail(adminEmail).ifPresentOrElse(
            existingUser -> {
                // Update existing admin user to ensure correct password and role
                existingUser.setPasswordHash(passwordEncoder.encode(adminPassword));
                existingUser.setRole(Role.ADMIN);
                existingUser.setIsActive(true);
                userRepository.save(existingUser);
                log.info("Admin user updated with email: {} and new password", adminEmail);
            },
            () -> {
                // Create new admin user
                User admin = User.builder()
                        .name("Admin")
                        .email(adminEmail)
                        .passwordHash(passwordEncoder.encode(adminPassword))
                        .role(Role.ADMIN)
                        .isActive(true)
                        .build();

                userRepository.save(admin);
                log.info("Admin user created with email: {}", adminEmail);
            }
        );
    }
}

