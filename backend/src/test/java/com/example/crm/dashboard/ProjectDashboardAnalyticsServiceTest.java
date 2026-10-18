package com.example.crm.dashboard;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.example.crm.projects.Project;
import com.example.crm.projects.ProjectRepository;
import com.example.crm.projects.ProjectStatus;
import com.example.crm.projectvendors.OutreachStatus;
import com.example.crm.projectvendors.ProjectVendor;
import com.example.crm.projectvendors.ProjectVendorRepository;
import com.example.crm.quotations.Quotation;
import com.example.crm.quotations.QuotationRepository;
import com.example.crm.quotations.QuotationStatus;
import com.example.crm.security.CrmUserPrincipal;
import com.example.crm.users.Role;
import com.example.crm.users.User;
import com.example.crm.users.UserRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

@ExtendWith(MockitoExtension.class)
class ProjectDashboardAnalyticsServiceTest {
    @Mock ProjectRepository projectRepository;
    @Mock ProjectVendorRepository projectVendorRepository;
    @Mock QuotationRepository quotationRepository;
    @Mock UserRepository userRepository;
    @Mock CrmUserPrincipal principal;
    private ProjectDashboardAnalyticsService service;
    private UUID userId;

    @BeforeEach
    void setUp() {
        service = new ProjectDashboardAnalyticsService(projectRepository, projectVendorRepository, quotationRepository, userRepository);
        userId = UUID.randomUUID();
        lenient().when(principal.id()).thenReturn(userId);
        lenient().when(principal.fullName()).thenReturn("Amina Haddad");
    }

    @Test
    void adminAnalyticsAggregateRealScopedRecordsWithoutMixingCurrencies() {
        when(principal.role()).thenReturn(Role.ADMIN);
        User associate = associate(userId, "Amina Haddad");
        Project activeProject = project(ProjectStatus.IN_PROGRESS, LocalDate.now().plusDays(6), associate);
        Project completedProject = project(ProjectStatus.COMPLETED, LocalDate.now().minusDays(3), associate);
        ProjectVendor firstAssignment = assignment(activeProject, OutreachStatus.QUOTE_RECEIVED, LocalDate.now().minusDays(1));
        ProjectVendor secondAssignment = assignment(activeProject, OutreachStatus.SOW_SENT, LocalDate.now());
        Quotation firstRevision = quotation(firstAssignment, "USD", "18500.00", LocalDate.now().minusDays(1));
        Quotation secondRevision = quotation(firstAssignment, "USD", "17200.00", LocalDate.now().minusDays(1));
        Quotation euroQuote = quotation(secondAssignment, "EUR", "9300.00", LocalDate.now());

        when(projectRepository.findVisibleForDashboard(userId, true, null)).thenReturn(List.of(activeProject, completedProject));
        when(projectVendorRepository.findVisibleForDashboard(userId, true, null)).thenReturn(List.of(firstAssignment, secondAssignment));
        when(quotationRepository.findVisibleForDashboard(userId, true, null)).thenReturn(List.of(firstRevision, secondRevision, euroQuote));
        when(userRepository.findDashboardAssociates()).thenReturn(List.of(associate));

        ProjectDashboardAnalyticsResponse result = service.analytics(principal, DashboardDateRange.LAST_30_DAYS, null);

        assertThat(result.totalProjects()).isEqualTo(2);
        assertThat(result.activeProjects()).isEqualTo(1);
        assertThat(result.completedProjects()).isEqualTo(1);
        assertThat(result.quotationsReceived()).isEqualTo(3);
        assertThat(result.vendorAssignmentsWithQuotes()).isEqualTo(2);
        assertThat(result.quoteResponseRate()).isEqualTo(100.0);
        assertThat(result.followUpsDueToday()).isEqualTo(1);
        assertThat(result.overdueFollowUps()).isEqualTo(1);
        assertThat(result.quotationValueByCurrency()).extracting(DashboardCurrencyTotalResponse::currencyCode)
            .containsExactly("EUR", "USD");
        assertThat(result.quotationTrends()).hasSize(30);
        assertThat(result.quotationTrends()).extracting(QuotationTrendPointResponse::quotationCount)
            .contains(2L, 1L);
        assertThat(result.associateWorkloads()).singleElement().satisfies(workload -> {
            assertThat(workload.associateName()).isEqualTo("Amina Haddad");
            assertThat(workload.activeProjects()).isEqualTo(1);
            assertThat(workload.dueFollowUps()).isEqualTo(2);
        });
    }

    @Test
    void associateScopeCannotBeChangedThroughQueryParameters() {
        when(principal.role()).thenReturn(Role.SALES_REP);
        UUID anotherAssociate = UUID.randomUUID();

        assertThatThrownBy(() -> service.analytics(principal, DashboardDateRange.LAST_90_DAYS, anotherAssociate))
            .isInstanceOf(AccessDeniedException.class)
            .hasMessageContaining("own dashboard");
        verifyNoInteractions(projectRepository, projectVendorRepository, quotationRepository, userRepository);
    }

    @Test
    void associateAnalyticsAlwaysUsePersonalRepositoryScope() {
        when(principal.role()).thenReturn(Role.SALES_REP);
        when(projectRepository.findVisibleForDashboard(userId, false, userId)).thenReturn(List.of());
        when(projectVendorRepository.findVisibleForDashboard(userId, false, userId)).thenReturn(List.of());
        when(quotationRepository.findVisibleForDashboard(userId, false, userId)).thenReturn(List.of());

        ProjectDashboardAnalyticsResponse result = service.analytics(principal, DashboardDateRange.THIS_YEAR, null);

        assertThat(result.selectedAssociateId()).isEqualTo(userId);
        assertThat(result.associateWorkloads()).singleElement().satisfies(workload -> {
            assertThat(workload.associateId()).isEqualTo(userId);
            assertThat(workload.activeProjects()).isZero();
        });
        assertThat(result.projectsByStatus()).hasSize(ProjectStatus.values().length)
            .allMatch(item -> item.count() == 0);
        assertThat(result.vendorOutreachByStatus()).hasSize(OutreachStatus.values().length)
            .allMatch(item -> item.count() == 0);
        verify(projectRepository).findVisibleForDashboard(userId, false, userId);
        verify(projectVendorRepository).findVisibleForDashboard(userId, false, userId);
        verify(quotationRepository).findVisibleForDashboard(userId, false, userId);
    }

    private User associate(UUID id, String name) {
        User user = mock(User.class);
        when(user.getId()).thenReturn(id);
        when(user.getFullName()).thenReturn(name);
        return user;
    }

    @Test
    void managerCanFilterInactiveAssociateWithExistingAssignments() {
        when(principal.role()).thenReturn(Role.MANAGER);
        UUID inactiveId = UUID.randomUUID();
        User user = associate(inactiveId, "Nadia Benali");
        when(user.getRole()).thenReturn(Role.SALES_REP);
        when(user.isActive()).thenReturn(false);
        when(userRepository.findById(inactiveId)).thenReturn(java.util.Optional.of(user));
        when(projectRepository.existsByAssignedAssociate_IdAndDeletedAtIsNull(inactiveId)).thenReturn(true);
        ProjectDashboardAnalyticsResponse result = service.analytics(principal, DashboardDateRange.ALL_TIME, inactiveId);
        assertThat(result.selectedAssociateId()).isEqualTo(inactiveId);
        verify(projectRepository).findVisibleForDashboard(userId, true, inactiveId);
    }

    @Test
    void inactiveUnassignedUserCannotBeUsedAsDashboardFilter() {
        when(principal.role()).thenReturn(Role.ADMIN);
        UUID inactiveId = UUID.randomUUID();
        User user = mock(User.class);
        when(user.getRole()).thenReturn(Role.SALES_REP);
        when(userRepository.findById(inactiveId)).thenReturn(java.util.Optional.of(user));
        assertThatThrownBy(() -> service.analytics(principal, DashboardDateRange.ALL_TIME, inactiveId))
            .isInstanceOf(com.example.crm.common.web.ResourceNotFoundException.class);
        verifyNoInteractions(projectVendorRepository, quotationRepository);
    }

    private Project project(ProjectStatus status, LocalDate deadline, User associate) {
        Project project = mock(Project.class);
        when(project.getStatus()).thenReturn(status);
        lenient().when(project.getDeadline()).thenReturn(deadline);
        when(project.getAssignedAssociate()).thenReturn(associate);
        return project;
    }

    private ProjectVendor assignment(Project project, OutreachStatus status, LocalDate followUp) {
        ProjectVendor assignment = mock(ProjectVendor.class);
        when(assignment.getId()).thenReturn(UUID.randomUUID());
        when(assignment.getProject()).thenReturn(project);
        when(assignment.getStatus()).thenReturn(status);
        when(assignment.getNextFollowUpDate()).thenReturn(followUp);
        return assignment;
    }

    private Quotation quotation(ProjectVendor assignment, String currency, String amount, LocalDate receivedDate) {
        Quotation quotation = mock(Quotation.class);
        when(quotation.getProjectVendor()).thenReturn(assignment);
        when(quotation.getCurrencyCode()).thenReturn(currency);
        when(quotation.getAmount()).thenReturn(new BigDecimal(amount));
        when(quotation.getReceivedDate()).thenReturn(receivedDate);
        when(quotation.getStatus()).thenReturn(QuotationStatus.RECEIVED);
        return quotation;
    }
}
