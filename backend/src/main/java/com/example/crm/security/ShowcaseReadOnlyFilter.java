package com.example.crm.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.web.filter.OncePerRequestFilter;

/** Branch-wide protection: authentication is the only permitted write-shaped operation. */
public final class ShowcaseReadOnlyFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
        throws ServletException, IOException {
        String path = request.getRequestURI().substring(request.getContextPath().length());
        String method = request.getMethod();
        boolean login = "POST".equals(method) && "/api/v1/auth/login".equals(path);
        boolean read = "GET".equals(method) || "HEAD".equals(method) || "OPTIONS".equals(method);
        // Preview HTML embeds an activation link and must not be exposed in the showcase.
        boolean onboarding = path.startsWith("/api/v1/invitations/")
            || path.matches("/api/v1/admin/invitations/[^/]+/preview/?");
        if (onboarding || (!read && !login)) {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType("application/json");
            response.getWriter().write("{\"code\":\"SHOWCASE_READ_ONLY\",\"message\":\"This showcase is read-only.\"}");
            return;
        }
        chain.doFilter(request, response);
    }
}
