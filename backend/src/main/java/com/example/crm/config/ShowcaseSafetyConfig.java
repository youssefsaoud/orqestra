package com.example.crm.config;

import org.springframework.beans.factory.config.BeanFactoryPostProcessor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;

@Configuration
public class ShowcaseSafetyConfig {
    @Bean
    static BeanFactoryPostProcessor rejectShowcaseWriters(Environment environment) {
        return factory -> {
            String url = environment.getProperty("spring.datasource.url", "");
            if (!url.startsWith("jdbc:postgresql://") || url.matches(".*\\/(crm_dev|orqestra_demo)([?].*)?$")) {
                throw new IllegalStateException("Showcase requires its own initialized PostgreSQL database");
            }
            if (!"orqestra-showcase".equals(environment.getProperty("crm.jwt.issuer"))) {
                throw new IllegalStateException("Showcase requires its own JWT issuer");
            }
            if (environment.getProperty("crm.jwt.secret", "").length() < 32) {
                throw new IllegalStateException("Showcase requires an independent signing key of at least 32 characters");
            }
            for (String property : new String[] {"spring.flyway.enabled", "crm.bootstrap.admin.enabled",
                "crm.demo.seed.enabled", "crm.recruiter-demo.enabled", "springdoc.api-docs.enabled",
                "springdoc.swagger-ui.enabled", "crm.invitations.preview-enabled"}) {
                if (environment.getProperty(property, Boolean.class, false)) {
                    throw new IllegalStateException("Showcase startup requires " + property + "=false");
                }
            }
            if (!"validate".equals(environment.getProperty("spring.jpa.hibernate.ddl-auto"))) {
                throw new IllegalStateException("Showcase schema must be validation-only");
            }
            if (!"SET default_transaction_read_only = on".equals(
                environment.getProperty("spring.datasource.hikari.connection-init-sql"))) {
                throw new IllegalStateException("Showcase database connections must be read-only");
            }
        };
    }
}
