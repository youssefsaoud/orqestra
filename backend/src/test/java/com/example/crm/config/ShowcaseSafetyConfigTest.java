package com.example.crm.config;

import static org.assertj.core.api.Assertions.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.support.DefaultListableBeanFactory;
import org.springframework.mock.env.MockEnvironment;

class ShowcaseSafetyConfigTest {
    private MockEnvironment safe() {
        return new MockEnvironment().withProperty("spring.jpa.hibernate.ddl-auto", "validate")
            .withProperty("crm.jwt.issuer", "orqestra-showcase")
            .withProperty("spring.datasource.hikari.connection-init-sql", "SET default_transaction_read_only = on");
    }

    @Test void acceptsValidationOnlyReadOnlyConfiguration() {
        ShowcaseSafetyConfig.rejectShowcaseWriters(safe()).postProcessBeanFactory(new DefaultListableBeanFactory());
    }

    @Test void rejectsEveryStartupWriterAndSchemaChanges() {
        for (String property : new String[] {"spring.flyway.enabled", "crm.bootstrap.admin.enabled",
            "crm.demo.seed.enabled", "crm.recruiter-demo.enabled"}) {
            assertThatThrownBy(() -> ShowcaseSafetyConfig.rejectShowcaseWriters(safe().withProperty(property, "true"))
                .postProcessBeanFactory(new DefaultListableBeanFactory())).isInstanceOf(IllegalStateException.class);
        }
        assertThatThrownBy(() -> ShowcaseSafetyConfig.rejectShowcaseWriters(safe().withProperty("spring.jpa.hibernate.ddl-auto", "update"))
            .postProcessBeanFactory(new DefaultListableBeanFactory())).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> ShowcaseSafetyConfig.rejectShowcaseWriters(safe().withProperty("spring.datasource.hikari.connection-init-sql", ""))
            .postProcessBeanFactory(new DefaultListableBeanFactory())).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> ShowcaseSafetyConfig.rejectShowcaseWriters(safe().withProperty("crm.jwt.issuer", "crm-api"))
            .postProcessBeanFactory(new DefaultListableBeanFactory())).isInstanceOf(IllegalStateException.class);
    }
}
