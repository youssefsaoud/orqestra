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
            for (String property : new String[] {"spring.flyway.enabled", "crm.bootstrap.admin.enabled",
                "crm.demo.seed.enabled", "crm.recruiter-demo.enabled"}) {
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
