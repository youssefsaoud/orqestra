package com.example.crm.invitations;

import java.time.Instant;
import java.util.UUID;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;

@Service
@Primary
public class ShowcaseDisabledMail implements InvitationMail {
    @Override public String send(UUID id, String email, String name, String role, String url, Instant expiry) {
        throw new IllegalStateException("Email delivery is disabled in the showcase");
    }
}
