package com.example.crm.security;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import com.example.crm.auth.*;
import com.example.crm.auth.dto.AuthResponse;
import com.example.crm.config.SecurityConfig;
import com.example.crm.users.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers = {AuthController.class, RbacController.class})
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
class ShowcaseSecurityTest {
    @Autowired MockMvc mvc;
    @MockBean AuthService auth;
    @MockBean JwtService jwt;
    @MockBean CrmUserDetailsService users;

    private void signIn(Role role) {
        when(jwt.subject("test-token")).thenReturn("demo@example.test");
        when(users.loadUserByUsername("demo@example.test")).thenReturn(new CrmUserPrincipal(
            new User("Demo", "demo@example.test", "unused", role)));
    }

    @Test void publicLoginWorksAndBusinessWritesCannotReachServices() throws Exception {
        when(auth.login(any())).thenReturn(new AuthResponse("test-only", "Bearer", 3600));
        mvc.perform(post("/api/v1/auth/login").contentType("application/json")
            .content("{\"email\":\"demo@example.test\",\"password\":\"test-only\"}")).andExpect(status().isOk());
        clearInvocations(auth);
        signIn(Role.ADMIN);
        mvc.perform(post("/api/v1/admin/users").header("Authorization", "Bearer test-token")
            .contentType("application/json").content("{}")).andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code").value("SHOWCASE_READ_ONLY"));
        mvc.perform(post("/api/v1/invitations/accept")).andExpect(status().isForbidden());
        verifyNoInteractions(auth);
    }

    @Test void roleAndAuthenticationRulesRemainEnforcedForReads() throws Exception {
        mvc.perform(get("/api/v1/rbac/admin")).andExpect(status().isForbidden());
        signIn(Role.SALES_REP);
        mvc.perform(get("/api/v1/rbac/admin").header("Authorization", "Bearer test-token")).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/rbac/sales").header("Authorization", "Bearer test-token")).andExpect(status().isOk());
        signIn(Role.MANAGER);
        mvc.perform(get("/api/v1/rbac/admin").header("Authorization", "Bearer test-token")).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/rbac/manager").header("Authorization", "Bearer test-token")).andExpect(status().isOk());
    }
}
