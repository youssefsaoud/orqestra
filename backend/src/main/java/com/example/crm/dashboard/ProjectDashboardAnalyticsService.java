package com.example.crm.dashboard;

import com.example.crm.common.web.ResourceNotFoundException;
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
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProjectDashboardAnalyticsService {
    private static final Set<ProjectStatus> ACTIVE_STATUSES = Set.of(ProjectStatus.PLANNED, ProjectStatus.IN_PROGRESS, ProjectStatus.ON_HOLD);
    private static final Set<OutreachStatus> AWAITING_STATUSES = Set.of(OutreachStatus.SOW_SENT, OutreachStatus.QUOTE_IN_PROCESS);
    private static final Set<QuotationStatus> EXCLUDED_VALUE_STATUSES = Set.of(QuotationStatus.REJECTED, QuotationStatus.WITHDRAWN, QuotationStatus.EXPIRED);

    private final ProjectRepository projectRepository;
    private final ProjectVendorRepository projectVendorRepository;
    private final QuotationRepository quotationRepository;
    private final UserRepository userRepository;

    public ProjectDashboardAnalyticsService(
        ProjectRepository projectRepository,
        ProjectVendorRepository projectVendorRepository,
        QuotationRepository quotationRepository,
        UserRepository userRepository
    ) {
        this.projectRepository = projectRepository;
        this.projectVendorRepository = projectVendorRepository;
        this.quotationRepository = quotationRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER','SALES_REP')")
    public ProjectDashboardAnalyticsResponse analytics(CrmUserPrincipal principal, DashboardDateRange requestedRange, UUID requestedAssociateId) {
        boolean canSeeAll = principal.role() == Role.ADMIN || principal.role() == Role.MANAGER;
        UUID associateId = resolveAssociateScope(principal, canSeeAll, requestedAssociateId);
        String associateName = associateId == null ? null : resolveAssociateName(principal, associateId);
        DashboardDateRange range = requestedRange == null ? DashboardDateRange.LAST_90_DAYS : requestedRange;
        LocalDate today = LocalDate.now();

        List<Project> projects = projectRepository.findVisibleForDashboard(principal.id(), canSeeAll, associateId);
        List<ProjectVendor> assignments = projectVendorRepository.findVisibleForDashboard(principal.id(), canSeeAll, associateId);
        List<Quotation> quotations = quotationRepository.findVisibleForDashboard(principal.id(), canSeeAll, associateId);

        Map<ProjectStatus, Long> projectCounts = enumCounts(ProjectStatus.class);
        for (Project project : projects) projectCounts.compute(project.getStatus(), (key, count) -> count + 1);
        List<ProjectStatusCountResponse> projectsByStatus = projectCounts.entrySet().stream()
            .map(entry -> new ProjectStatusCountResponse(entry.getKey(), entry.getValue()))
            .toList();

        long activeProjects = projects.stream().filter(project -> ACTIVE_STATUSES.contains(project.getStatus())).count();
        long completedProjects = projectCounts.get(ProjectStatus.COMPLETED);
        long nearingDeadline = projects.stream().filter(project -> isActiveWithDeadline(project, today, today.plusDays(14))).count();
        long overdueProjects = projects.stream().filter(project -> isActiveWithDeadline(project, LocalDate.MIN, today.minusDays(1))).count();

        Map<OutreachStatus, Long> outreachCounts = enumCounts(OutreachStatus.class);
        for (ProjectVendor assignment : assignments) outreachCounts.compute(assignment.getStatus(), (key, count) -> count + 1);
        List<OutreachStatusCountResponse> vendorOutreach = outreachCounts.entrySet().stream()
            .map(entry -> new OutreachStatusCountResponse(entry.getKey(), entry.getValue()))
            .toList();

        Set<UUID> assignmentsWithQuotes = new HashSet<>();
        Map<String, BigDecimal> quotationValues = new LinkedHashMap<>();
        for (Quotation quotation : quotations) {
            assignmentsWithQuotes.add(quotation.getProjectVendor().getId());
            if (!EXCLUDED_VALUE_STATUSES.contains(quotation.getStatus())) {
                quotationValues.merge(quotation.getCurrencyCode(), quotation.getAmount(), BigDecimal::add);
            }
        }
        long awaitingVendors = assignments.stream().filter(assignment -> AWAITING_STATUSES.contains(assignment.getStatus())).count();
        long followUpsDueToday = assignments.stream().filter(assignment -> today.equals(assignment.getNextFollowUpDate())).count();
        long overdueFollowUps = assignments.stream().filter(assignment -> assignment.getNextFollowUpDate() != null && assignment.getNextFollowUpDate().isBefore(today)).count();
        long upcomingFollowUps = assignments.stream().filter(assignment -> assignment.getNextFollowUpDate() != null
            && assignment.getNextFollowUpDate().isAfter(today) && !assignment.getNextFollowUpDate().isAfter(today.plusDays(14))).count();
        double responseRate = assignments.isEmpty() ? 0 : Math.round(assignmentsWithQuotes.size() * 1000.0 / assignments.size()) / 10.0;

        LocalDate trendStart = trendStart(range, today, quotations);
        String granularity = range == DashboardDateRange.LAST_30_DAYS ? "DAY" : "MONTH";

        return new ProjectDashboardAnalyticsResponse(
            principal.role(), range, trendStart, today, granularity, associateId, associateName,
            projects.size(), activeProjects, completedProjects, nearingDeadline, overdueProjects,
            assignments.size(), awaitingVendors, quotations.size(), assignmentsWithQuotes.size(), responseRate,
            followUpsDueToday, overdueFollowUps, upcomingFollowUps, projectsByStatus, vendorOutreach,
            quotationTrends(quotations, trendStart, today, granularity), workloads(principal, canSeeAll, associateId, projects, assignments, today),
            quotationValues.entrySet().stream().sorted(Map.Entry.comparingByKey())
                .map(entry -> new DashboardCurrencyTotalResponse(entry.getKey(), entry.getValue())).toList()
        );
    }

    private UUID resolveAssociateScope(CrmUserPrincipal principal, boolean canSeeAll, UUID requestedAssociateId) {
        if (!canSeeAll) {
            if (requestedAssociateId != null && !requestedAssociateId.equals(principal.id())) {
                throw new AccessDeniedException("Associates can only view their own dashboard analytics");
            }
            return principal.id();
        }
        if (requestedAssociateId != null) findDashboardAssociate(requestedAssociateId);
        return requestedAssociateId;
    }

    private String resolveAssociateName(CrmUserPrincipal principal, UUID associateId) {
        return associateId.equals(principal.id()) ? principal.fullName() : findDashboardAssociate(associateId).getFullName();
    }

    private User findDashboardAssociate(UUID associateId) {
        User user = userRepository.findById(associateId).orElseThrow(() -> new ResourceNotFoundException("Associate not found"));
        if (user.getRole() != Role.SALES_REP || (!user.isActive()
            && !projectRepository.existsByAssignedAssociate_IdAndDeletedAtIsNull(associateId))) {
            throw new ResourceNotFoundException("Associate not found");
        }
        return user;
    }

    private boolean isActiveWithDeadline(Project project, LocalDate from, LocalDate through) {
        return ACTIVE_STATUSES.contains(project.getStatus()) && project.getDeadline() != null
            && !project.getDeadline().isBefore(from) && !project.getDeadline().isAfter(through);
    }

    private <E extends Enum<E>> Map<E, Long> enumCounts(Class<E> type) {
        Map<E, Long> counts = new EnumMap<>(type);
        for (E value : type.getEnumConstants()) counts.put(value, 0L);
        return counts;
    }

    private LocalDate trendStart(DashboardDateRange range, LocalDate today, List<Quotation> quotations) {
        return switch (range) {
            case LAST_30_DAYS -> today.minusDays(29);
            case LAST_90_DAYS -> today.minusDays(89);
            case THIS_YEAR -> today.withDayOfYear(1);
            case ALL_TIME -> quotations.stream().map(Quotation::getReceivedDate).min(LocalDate::compareTo).orElse(today);
        };
    }

    private List<QuotationTrendPointResponse> quotationTrends(List<Quotation> quotations, LocalDate from, LocalDate through, String granularity) {
        Map<LocalDate, Long> buckets = new LinkedHashMap<>();
        if ("DAY".equals(granularity)) {
            for (LocalDate date = from; !date.isAfter(through); date = date.plusDays(1)) buckets.put(date, 0L);
        } else {
            YearMonth cursor = YearMonth.from(from);
            YearMonth end = YearMonth.from(through);
            while (!cursor.isAfter(end)) {
                buckets.put(cursor.atDay(1), 0L);
                cursor = cursor.plusMonths(1);
            }
        }
        quotations.stream()
            .filter(quotation -> !quotation.getReceivedDate().isBefore(from) && !quotation.getReceivedDate().isAfter(through))
            .forEach(quotation -> {
                LocalDate key = "DAY".equals(granularity) ? quotation.getReceivedDate() : YearMonth.from(quotation.getReceivedDate()).atDay(1);
                buckets.computeIfPresent(key, (ignored, count) -> count + 1);
            });
        return buckets.entrySet().stream().map(entry -> new QuotationTrendPointResponse(entry.getKey(), entry.getValue())).toList();
    }

    private List<AssociateWorkloadResponse> workloads(
        CrmUserPrincipal principal,
        boolean canSeeAll,
        UUID associateId,
        List<Project> projects,
        List<ProjectVendor> assignments,
        LocalDate today
    ) {
        List<User> associates;
        if (!canSeeAll) {
            return List.of(workload(principal.id(), principal.fullName(), projects, assignments, today));
        }
        associates = associateId == null
            ? userRepository.findDashboardAssociates()
            : List.of(findDashboardAssociate(associateId));
        List<AssociateWorkloadResponse> result = new ArrayList<>();
        for (User associate : associates) result.add(workload(associate.getId(), associate.getFullName(), projects, assignments, today));
        result.sort(Comparator.comparing(AssociateWorkloadResponse::activeProjects).reversed()
            .thenComparing(AssociateWorkloadResponse::associateName));
        return result;
    }

    private AssociateWorkloadResponse workload(UUID associateId, String name, List<Project> projects, List<ProjectVendor> assignments, LocalDate today) {
        long projectCount = projects.stream().filter(project -> project.getAssignedAssociate() != null
            && project.getAssignedAssociate().getId().equals(associateId) && ACTIVE_STATUSES.contains(project.getStatus())).count();
        long followUpCount = assignments.stream().filter(assignment -> assignment.getProject().getAssignedAssociate() != null
            && assignment.getProject().getAssignedAssociate().getId().equals(associateId)
            && assignment.getNextFollowUpDate() != null && !assignment.getNextFollowUpDate().isAfter(today)).count();
        return new AssociateWorkloadResponse(associateId, name, projectCount, followUpCount);
    }
}
