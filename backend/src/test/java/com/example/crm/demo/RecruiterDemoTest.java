package com.example.crm.demo;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.example.crm.users.*;
import com.example.crm.security.CrmUserDetailsService;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

class RecruiterDemoTest {
    private MockEnvironment safe() {
        var env = new MockEnvironment(); env.setActiveProfiles("dev", "docker-demo");
        return env.withProperty("crm.recruiter-demo.enabled", "true")
            .withProperty("spring.datasource.url", "jdbc:postgresql://postgres:5432/orqestra_demo")
            .withProperty("spring.datasource.username", "orqestra_demo")
            .withProperty("spring.mail.host", "127.0.0.1");
    }

    @Test void guardRejectsProductionNativeAndSmtpBeforeSeeding() {
        RecruiterDemoGuard.validate(safe());
        for (String[] profiles : new String[][]{{"prod"}, {"dev"}, {"dev", "docker-demo", "prod"}}) {
            var env = safe(); env.setActiveProfiles(profiles);
            assertThatThrownBy(() -> RecruiterDemoGuard.validate(env)).isInstanceOf(IllegalStateException.class);
        }
        for (String[] entry : new String[][]{{"spring.datasource.url", "jdbc:postgresql://localhost:5432/crm_dev"},
            {"spring.mail.username", "private@example.test"}, {"crm.demo.seed.enabled", "true"},
            {"crm.bootstrap.admin.enabled", "true"}}) {
            var env = safe().withProperty(entry[0], entry[1]);
            assertThatThrownBy(() -> RecruiterDemoGuard.validate(env)).isInstanceOf(IllegalStateException.class);
        }
    }

    @Test void createsHashedActiveAccountsWithExpectedRolesAndNeverResetsExistingAccounts() {
        var users = mock(UserRepository.class); var encoder = new BCryptPasswordEncoder();
        when(users.findByNormalizedEmail(anyString())).thenReturn(Optional.empty());
        when(users.save(any())).thenAnswer(call -> call.getArgument(0));
        Role[] roles = {Role.ADMIN, Role.MANAGER, Role.SALES_REP};
        String[] accounts = {"admin", "manager", "associate"};
        for (int i = 0; i < roles.length; i++) {
            Role role = roles[i];
            User created = RecruiterDemoSeeder.account(users, encoder, "Demo", accounts[i], role, true);
            assertThat(created.getEmail()).isEqualTo(accounts[i] + "@orqestra.demo");
            assertThat(created.getRole()).isEqualTo(role);
            assertThat(created.isActive()).isTrue();
            assertThat(created.getPasswordHash()).isNotEqualTo(RecruiterDemoSeeder.PUBLIC_PASSWORD);
            assertThat(encoder.matches(RecruiterDemoSeeder.PUBLIC_PASSWORD, created.getPasswordHash())).isTrue();
        }
        User existing = new User("Changed name", "admin@orqestra.demo", encoder.encode("ChangedPrivatePassword42!"), Role.ADMIN);
        when(users.findByNormalizedEmail("admin@orqestra.demo")).thenReturn(Optional.of(existing));
        clearInvocations(users);
        assertThat(RecruiterDemoSeeder.account(users, encoder, "Demo", "admin", Role.ADMIN, true)).isSameAs(existing);
        verify(users, never()).save(any());
        assertThat(encoder.matches("ChangedPrivatePassword42!", existing.getPasswordHash())).isTrue();
    }

    @Test void displayStaffAreInactiveAndCannotUseThePublicPassword() {
        var users = mock(UserRepository.class); var encoder = new BCryptPasswordEncoder();
        when(users.findByNormalizedEmail(anyString())).thenReturn(Optional.empty());
        when(users.save(any())).thenAnswer(call -> call.getArgument(0));
        User staff = RecruiterDemoSeeder.account(users, encoder, "Display staff", "nadia", Role.SALES_REP, false);
        assertThat(staff.isActive()).isFalse();
        assertThat(encoder.matches(RecruiterDemoSeeder.PUBLIC_PASSWORD, staff.getPasswordHash())).isFalse();
    }

    @Test void activeChartStaffHaveUnknownPasswordsAndPreserveExistingState() {
        var users = mock(UserRepository.class); var encoder = new BCryptPasswordEncoder();
        when(users.findByNormalizedEmail(anyString())).thenReturn(Optional.empty());
        when(users.save(any())).thenAnswer(call -> call.getArgument(0));
        User staff = RecruiterDemoSeeder.staffAccount(users, encoder, "Salma", "salma");
        assertThat(staff.isActive()).isTrue();
        assertThat(staff.getRole()).isEqualTo(Role.SALES_REP);
        assertThat(encoder.matches(RecruiterDemoSeeder.PUBLIC_PASSWORD, staff.getPasswordHash())).isFalse();
        when(users.findByNormalizedEmail(staff.getEmail())).thenReturn(Optional.of(staff));
        clearInvocations(users);
        assertThat(RecruiterDemoSeeder.staffAccount(users, encoder, "Other name", "salma")).isSameAs(staff);
        verify(users, never()).save(any());
        assertThat(ProjectDemoDataSeeder.recruiterProjectSeeds()).hasSize(24)
            .extracting(ProjectDemoDataSeeder.ProjectSeed::reference).doesNotHaveDuplicates();
    }

    @Test void showcaseAuthenticationRejectsPrivateDevelopmentAccountsWithoutQueryingDatabase() {
        var users = mock(UserRepository.class); var env = new MockEnvironment(); env.setActiveProfiles("prod");
        var details = new CrmUserDetailsService(users);
        assertThatThrownBy(() -> details.loadUserByUsername("admin@example.com")).isInstanceOf(UsernameNotFoundException.class);
        verifyNoInteractions(users);
    }
}
