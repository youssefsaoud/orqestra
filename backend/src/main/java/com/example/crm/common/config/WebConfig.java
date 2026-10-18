package com.example.crm.common.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final String allowedOrigin;

    public WebConfig(@Value("${crm.cors.allowed-origin:http://localhost:4200}") String allowedOrigin) {
        java.net.URI origin = java.net.URI.create(allowedOrigin);
        boolean local = java.util.Set.of("localhost", "127.0.0.1").contains(origin.getHost() == null ? "" : origin.getHost());
        if (origin.getHost() == null || origin.getUserInfo() != null || origin.getQuery() != null
            || origin.getFragment() != null || (origin.getPath() != null && !origin.getPath().isEmpty())
            || !("https".equals(origin.getScheme()) || (local && "http".equals(origin.getScheme())))) {
            throw new IllegalArgumentException("Configure one exact HTTPS frontend origin (HTTP is local-only)");
        }
        this.allowedOrigin = allowedOrigin;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/v1/**")
            .allowedOrigins(allowedOrigin)
            .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
            .allowedHeaders("*")
            .allowCredentials(false)
            .maxAge(3600);
    }
}
