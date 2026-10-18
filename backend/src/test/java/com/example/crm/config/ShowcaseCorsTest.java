package com.example.crm.config;

import static org.assertj.core.api.Assertions.*;
import com.example.crm.common.config.WebConfig;
import org.junit.jupiter.api.Test;

class ShowcaseCorsTest {
    @Test void requiresOneExactSecureOriginExceptForLoopbackDevelopment() {
        new WebConfig("https://portfolio.example.test");
        new WebConfig("http://localhost:4300");
        for (String origin : new String[] {"*", "https://*.example.test", "http://public.example.test",
            "https://example.test/path", "https://example.test?token=secret", "https://user@example.test", "https://one.test,https://two.test"}) {
            assertThatThrownBy(() -> new WebConfig(origin)).isInstanceOf(IllegalArgumentException.class);
        }
    }
}
