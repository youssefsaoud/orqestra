package com.example.crm.security;

import com.example.crm.users.UserRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class CrmUserDetailsService implements UserDetailsService {
    private final UserRepository users;
    private static final java.util.Set<String> ACCOUNTS = java.util.Set.of(
        "admin@orqestra.demo", "manager@orqestra.demo", "associate@orqestra.demo");
    public CrmUserDetailsService(UserRepository users) { this.users = users; }
    @Override public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        if (!ACCOUNTS.contains(username.trim().toLowerCase(java.util.Locale.ROOT))) {
            throw new UsernameNotFoundException("Account is not available in this showcase");
        }
        return users.findByNormalizedEmail(username.trim().toLowerCase()).map(CrmUserPrincipal::new).orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }
}
