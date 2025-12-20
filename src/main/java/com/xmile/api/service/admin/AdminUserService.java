package com.xmile.api.service.admin;

import com.xmile.api.exception.NotFoundException;
import com.xmile.api.model.Role;
import com.xmile.api.model.User;
import com.xmile.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class AdminUserService {
    private final UserRepository userRepository;

    public List<User> listAll() {
        return userRepository.findAll();
    }

    public User getById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("User not found"));
    }

    @Transactional
    public User updateRole(Long id, Role role) {
        User user = getById(id);
        user.setRole(role);
        return userRepository.save(user);
    }

    @Transactional
    public User setActive(Long id, boolean isActive) {
        User user = getById(id);
        user.setIsActive(isActive);
        return userRepository.save(user);
    }
}


