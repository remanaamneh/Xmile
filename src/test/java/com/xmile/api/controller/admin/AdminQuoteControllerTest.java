package com.xmile.api.controller.admin;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.xmile.api.dto.AdminApproveQuoteDTO;
import com.xmile.api.dto.AdminQuoteResponse;
import com.xmile.api.dto.AdminRejectQuoteDTO;
import com.xmile.api.dto.QuoteResponse;
import com.xmile.api.model.Role;
import com.xmile.api.model.User;
import com.xmile.api.repository.UserRepository;
import com.xmile.api.security.JwtAuthFilter;
import com.xmile.api.security.JwtTokenProvider;
import com.xmile.api.security.SecurityConfig;
import com.xmile.api.service.AdminQuoteService;
import com.xmile.api.service.QuoteService;
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
import java.time.LocalDateTime;
import java.util.Arrays;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = AdminQuoteController.class)
@Import({SecurityConfig.class, JwtAuthFilter.class, JwtTokenProvider.class})
@TestPropertySource(properties = {
        "jwt.secret=CHANGE_ME_THIS_IS_A_DEMO_SECRET_KEY_WITH_AT_LEAST_32_CHARS",
        "jwt.expiration-ms=86400000"
})
public class AdminQuoteControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @MockBean
    private AdminQuoteService adminQuoteService;

    @MockBean
    private QuoteService quoteService;

    @MockBean
    private UserRepository userRepository;

    private String adminToken;
    private String clientToken;
    private Long adminUserId = 1L;
    private Long clientUserId = 2L;
    private Long quoteId = 100L;

    @BeforeEach
    void setUp() {
        adminToken = jwtTokenProvider.generateToken(adminUserId, Role.ADMIN);
        clientToken = jwtTokenProvider.generateToken(clientUserId, Role.CLIENT);

        // Mock user repository for authentication
        Mockito.when(userRepository.findById(adminUserId)).thenReturn(
                java.util.Optional.of(User.builder()
                        .id(adminUserId)
                        .name("Admin User")
                        .email("admin@test.com")
                        .passwordHash("hashed")
                        .role(Role.ADMIN)
                        .isActive(true)
                        .createdAt(LocalDateTime.now())
                        .updatedAt(LocalDateTime.now())
                        .build())
        );

        Mockito.when(userRepository.findById(clientUserId)).thenReturn(
                java.util.Optional.of(User.builder()
                        .id(clientUserId)
                        .name("Client User")
                        .email("client@test.com")
                        .passwordHash("hashed")
                        .role(Role.CLIENT)
                        .isActive(true)
                        .createdAt(LocalDateTime.now())
                        .updatedAt(LocalDateTime.now())
                        .build())
        );
    }

    @Test
    void testGetPendingQuotes_AsAdmin() throws Exception {
        AdminQuoteResponse quoteResponse = AdminQuoteResponse.builder()
                .id(quoteId)
                .status("SUBMITTED")
                .quoteAmount(new BigDecimal("8000.00"))
                .build();

        Mockito.when(adminQuoteService.getPendingQuotes())
                .thenReturn(Arrays.asList(quoteResponse));

        mockMvc.perform(get("/admin/quotes/pending")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].id").value(quoteId))
                .andExpect(jsonPath("$[0].status").value("SUBMITTED"));
    }

    @Test
    void testGetPendingQuotes_AsClient_ShouldForbid() throws Exception {
        mockMvc.perform(get("/admin/quotes/pending")
                        .header("Authorization", "Bearer " + clientToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
    }

    @Test
    void testGetQuoteById_AsAdmin() throws Exception {
        AdminQuoteResponse quoteResponse = AdminQuoteResponse.builder()
                .id(quoteId)
                .status("SUBMITTED")
                .clientUserId(clientUserId)
                .clientUserEmail("client@test.com")
                .build();

        Mockito.when(adminQuoteService.getQuoteById(quoteId))
                .thenReturn(quoteResponse);

        mockMvc.perform(get("/admin/quotes/" + quoteId)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(quoteId))
                .andExpect(jsonPath("$.status").value("SUBMITTED"))
                .andExpect(jsonPath("$.clientUserId").value(clientUserId))
                .andExpect(jsonPath("$.clientUserEmail").value("client@test.com"));
    }

    @Test
    void testGetQuoteById_NotFound() throws Exception {
        Mockito.when(adminQuoteService.getQuoteById(99999L))
                .thenThrow(new RuntimeException("Quote not found"));

        mockMvc.perform(get("/admin/quotes/99999")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

    @Test
    void testApproveQuote_AsAdmin() throws Exception {
        AdminApproveQuoteDTO approveRequest = new AdminApproveQuoteDTO();
        approveRequest.setFinalPrice(new BigDecimal("9000.00"));
        approveRequest.setRequestedWorkers(5);
        approveRequest.setAdminNotes("Approved by admin");

        QuoteResponse approvedResponse = QuoteResponse.builder()
                .id(quoteId)
                .status("APPROVED")
                .price(new BigDecimal("9000.00"))
                .requestedWorkers(5)
                .approvedAt(LocalDateTime.now())
                .build();

        // Mock the service calls
        Mockito.doNothing().when(adminQuoteService).approveQuote(quoteId, approveRequest);
        Mockito.when(quoteService.getQuoteByIdForResponse(quoteId))
                .thenReturn(approvedResponse);

        mockMvc.perform(put("/admin/quotes/" + quoteId + "/approve")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(approveRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"))
                .andExpect(jsonPath("$.price").value(9000.00))
                .andExpect(jsonPath("$.requestedWorkers").value(5))
                .andExpect(jsonPath("$.approvedAt").exists());
    }

    @Test
    void testApproveQuote_AsClient_ShouldForbid() throws Exception {
        AdminApproveQuoteDTO approveRequest = new AdminApproveQuoteDTO();
        approveRequest.setFinalPrice(new BigDecimal("9000.00"));
        approveRequest.setRequestedWorkers(5);

        mockMvc.perform(put("/admin/quotes/" + quoteId + "/approve")
                        .header("Authorization", "Bearer " + clientToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(approveRequest)))
                .andExpect(status().isForbidden());
    }

    @Test
    void testRejectQuote_AsAdmin() throws Exception {
        AdminRejectQuoteDTO rejectRequest = new AdminRejectQuoteDTO();
        rejectRequest.setReason("Price too high");

        AdminQuoteResponse rejectedResponse = AdminQuoteResponse.builder()
                .id(quoteId)
                .status("REJECTED")
                .adminRejectionReason("Price too high")
                .approvedAt(null)
                .build();

        Mockito.when(adminQuoteService.rejectQuote(quoteId, rejectRequest))
                .thenReturn(rejectedResponse);

        mockMvc.perform(put("/admin/quotes/" + quoteId + "/reject")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(rejectRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"))
                .andExpect(jsonPath("$.adminRejectionReason").value("Price too high"))
                .andExpect(jsonPath("$.approvedAt").isEmpty());
    }

    @Test
    void testRejectQuote_AsClient_ShouldForbid() throws Exception {
        AdminRejectQuoteDTO rejectRequest = new AdminRejectQuoteDTO();
        rejectRequest.setReason("Price too high");

        mockMvc.perform(put("/admin/quotes/" + quoteId + "/reject")
                        .header("Authorization", "Bearer " + clientToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(rejectRequest)))
                .andExpect(status().isForbidden());
    }

    @Test
    void testApproveQuote_InvalidStatus() throws Exception {
        AdminApproveQuoteDTO approveRequest = new AdminApproveQuoteDTO();
        approveRequest.setFinalPrice(new BigDecimal("9000.00"));
        approveRequest.setRequestedWorkers(5);

        Mockito.doThrow(new IllegalStateException("Only quotes with status SUBMITTED can be approved"))
                .when(adminQuoteService).approveQuote(quoteId, approveRequest);

        mockMvc.perform(put("/admin/quotes/" + quoteId + "/approve")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(approveRequest)))
                .andExpect(status().isBadRequest());
    }
}

