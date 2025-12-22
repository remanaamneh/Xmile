package com.xmile.api.controller.admin;

import com.xmile.api.model.Role;
import com.xmile.api.model.User;
import com.xmile.api.repository.UserRepository;
import com.xmile.api.security.JwtAuthFilter;
import com.xmile.api.security.JwtTokenProvider;
import com.xmile.api.security.SecurityConfig;
import com.xmile.api.service.admin.AdminUserService;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = AdminUserController.class)
@Import({SecurityConfig.class, JwtAuthFilter.class, JwtTokenProvider.class})
@TestPropertySource(properties = {
        "jwt.secret=CHANGE_ME_THIS_IS_A_DEMO_SECRET_KEY_WITH_AT_LEAST_32_CHARS",
        "jwt.expiration-ms=86400000"
})
@SuppressWarnings("null")
class AdminUserControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private AdminUserService adminUserService;

    @MockBean
    private UserRepository userRepository;

    @Test
    void listUsers_requiresAdmin() throws Exception {
        // no token -> 401
        mockMvc.perform(get("/admin/users"))
                .andExpect(status().isUnauthorized());

        // client token -> 403
        String clientToken = jwtTokenProvider.generateToken(2L, Role.CLIENT);
        Mockito.when(userRepository.findById(2L)).thenReturn(Optional.of(User.builder()
                .id(2L)
                .name("Client")
                .email("client@example.com")
                .passwordHash("x")
                .role(Role.CLIENT)
                .isActive(true)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build()));

        mockMvc.perform(get("/admin/users")
                        .header("Authorization", "Bearer " + clientToken))
                .andExpect(status().isForbidden());

        // admin token -> 200
        String adminToken = jwtTokenProvider.generateToken(1L, Role.ADMIN);
        Mockito.when(userRepository.findById(1L)).thenReturn(Optional.of(User.builder()
                .id(1L)
                .name("Admin")
                .email("admin@example.com")
                .passwordHash("x")
                .role(Role.ADMIN)
                .isActive(true)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build()));

        Mockito.when(adminUserService.listAll()).thenReturn(List.of());

        mockMvc.perform(get("/admin/users")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("ok"));
    }

    @Test
    void updateRole_adminCanUpdate() throws Exception {
        String adminToken = jwtTokenProvider.generateToken(1L, Role.ADMIN);
        Mockito.when(userRepository.findById(1L)).thenReturn(Optional.of(User.builder()
                .id(1L)
                .name("Admin")
                .email("admin@example.com")
                .passwordHash("x")
                .role(Role.ADMIN)
                .isActive(true)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build()));

        Mockito.when(adminUserService.updateRole(Mockito.eq(5L), Mockito.eq(Role.CLIENT)))
                .thenReturn(User.builder()
                        .id(5L)
                        .name("U")
                        .email("u@example.com")
                        .passwordHash("x")
                        .role(Role.CLIENT)
                        .isActive(true)
                        .createdAt(LocalDateTime.now())
                        .updatedAt(LocalDateTime.now())
                        .build());

        mockMvc.perform(patch("/admin/users/5/role")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"CLIENT\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.role").value("CLIENT"));
    }
}


