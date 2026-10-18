package com.example.crm.security;

import static org.assertj.core.api.Assertions.*;
import com.example.crm.auth.JwtService;
import com.example.crm.users.*;
import org.junit.jupiter.api.Test;

class ShowcaseTokenIsolationTest {
    @Test void tokensCannotCrossBetweenFullApplicationAndShowcaseEvenWithTheSameKey() {
        String key = "test-fixture-signing-key-not-used-by-any-running-service";
        var full = new JwtService(key, 3600, "crm-api");
        var showcase = new JwtService(key, 3600, "orqestra-showcase");
        var user = new CrmUserPrincipal(new User("Demo", "demo@example.test", "unused", Role.ADMIN));
        String token = showcase.createToken(user);
        assertThat(showcase.subject(token)).isEqualTo("demo@example.test");
        assertThatThrownBy(() -> full.subject(token)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> showcase.subject(full.createToken(user))).isInstanceOf(IllegalArgumentException.class);
    }
}
