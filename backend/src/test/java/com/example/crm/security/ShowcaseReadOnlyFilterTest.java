package com.example.crm.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class ShowcaseReadOnlyFilterTest {
    @Test
    void mutationsNeverReachBusinessHandlers() throws Exception {
        String[] paths = {"/api/v1/projects", "/api/v1/projects/id", "/api/v1/companies",
            "/api/v1/contacts", "/api/v1/leads/id/convert", "/api/v1/opportunities/id/stage",
            "/api/v1/project-vendors/id", "/api/v1/quotations/id/select",
            "/api/v1/project-vendors/id/quotations", "/api/v1/interactions/id",
            "/api/v1/projects/id/documents", "/api/v1/documents/id", "/api/v1/admin/users",
            "/api/v1/admin/invitations", "/api/v1/admin/invitations/id/resend",
            "/api/v1/admin/invitations/id/revoke", "/api/v1/invitations/accept",
            "/api/v1/invitations/validate", "/api/v1/auth/login/other", "/future-endpoint"};
        for (String method : new String[] {"POST", "PUT", "PATCH", "DELETE", "TRACE"}) {
            for (String path : paths) {
                MockHttpServletResponse response = request(method, path, false);
                assertThat(response.getStatus()).as(method + " " + path).isEqualTo(403);
                assertThat(response.getContentAsString()).contains("SHOWCASE_READ_ONLY");
            }
        }
    }

    @Test
    void loginAndReadOperationsRemainAvailable() throws Exception {
        request("POST", "/api/v1/auth/login", true);
        for (String method : new String[] {"GET", "HEAD", "OPTIONS"}) {
            for (String path : new String[] {"/api/v1/auth/me", "/api/v1/projects",
                "/api/v1/documents/id/download", "/api/v1/admin/employees", "/api/v1/admin/invitations"}) {
                request(method, path, true);
            }
        }
    }

    @Test
    void activationAndTokenPreviewAreNeverAvailableEvenViaGet() throws Exception {
        for (String method : new String[] {"GET", "HEAD", "POST"}) {
            for (String path : new String[] {"/api/v1/invitations/validate", "/api/v1/invitations/accept",
                "/api/v1/admin/invitations/id/preview"}) request(method, path, false);
        }
    }

    private MockHttpServletResponse request(String method, String path, boolean allowed) throws Exception {
        var request = new MockHttpServletRequest(method, path);
        request.setServletPath(path);
        var response = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);
        new ShowcaseReadOnlyFilter().doFilter(request, response, chain);
        if (allowed) verify(chain).doFilter(request, response);
        else verifyNoInteractions(chain);
        return response;
    }
}
