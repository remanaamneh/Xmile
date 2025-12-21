package com.xmile.api.controller;

import com.xmile.api.dto.MyEventResponse;
import com.xmile.api.model.EventStatus;
import com.xmile.api.model.Role;
import com.xmile.api.model.User;
import com.xmile.api.repository.UserRepository;
import com.xmile.api.security.JwtAuthFilter;
import com.xmile.api.security.JwtTokenProvider;
import com.xmile.api.security.SecurityConfig;
import com.xmile.api.service.EventService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = EventController.class)
@Import({SecurityConfig.class, JwtAuthFilter.class, JwtTokenProvider.class})
@TestPropertySource(properties = {
        "jwt.secret=CHANGE_ME_THIS_IS_A_DEMO_SECRET_KEY_WITH_AT_LEAST_32_CHARS",
        "jwt.expiration-ms=86400000"
})
class EventControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private EventService eventService;

    @MockBean
    private UserRepository userRepository;

    private String clientToken;
    private Long clientUserId = 1L;

    @BeforeEach
    void setUp() {
        clientToken = jwtTokenProvider.generateToken(clientUserId, Role.CLIENT);
        
        // Mock user repository for authentication
        Mockito.when(userRepository.findById(clientUserId)).thenReturn(
                java.util.Optional.of(User.builder()
                        .id(clientUserId)
                        .name("Test Client")
                        .email("test@example.com")
                        .passwordHash("hashed")
                        .role(Role.CLIENT)
                        .isActive(true)
                        .createdAt(LocalDateTime.now())
                        .updatedAt(LocalDateTime.now())
                        .build())
        );
    }

    @Test
    void getMyEvents_shouldReturn200AndJsonArray() throws Exception {
        // Mock service response
        MyEventResponse eventResponse = MyEventResponse.builder()
                .id(1L)
                .name("Test Event")
                .status(EventStatus.DRAFT)
                .eventDate(LocalDate.now().plusDays(7))
                .location("Test Location")
                .finalPrice(new BigDecimal("5000.00"))
                .build();

        Mockito.when(eventService.getMyEvents(clientUserId))
                .thenReturn(List.of(eventResponse));

        mockMvc.perform(get("/events/my")
                        .header("Authorization", "Bearer " + clientToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].id").value(1))
                .andExpect(jsonPath("$[0].name").value("Test Event"))
                .andExpect(jsonPath("$[0].status").value("DRAFT"))
                .andExpect(jsonPath("$[0].location").value("Test Location"))
                .andExpect(jsonPath("$[0].finalPrice").value(5000.00));
    }

    @Test
    void getMyEvents_shouldReturn401WithoutToken() throws Exception {
        mockMvc.perform(get("/events/my")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void getMyEvents_shouldReturnEmptyArrayForUserWithNoEvents() throws Exception {
        // Mock empty response
        Mockito.when(eventService.getMyEvents(clientUserId))
                .thenReturn(List.of());

        mockMvc.perform(get("/events/my")
                        .header("Authorization", "Bearer " + clientToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }
}

