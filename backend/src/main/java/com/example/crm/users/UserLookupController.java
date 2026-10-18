package com.example.crm.users;

import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/users")
public class UserLookupController {
    private final UserRepository userRepository;

    public UserLookupController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping("/sales-representatives")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    List<UserSummaryResponse> salesRepresentatives() {
        return userRepository.findByRoleAndActiveTrueOrderByFullNameAsc(Role.SALES_REP).stream()
            .map(UserSummaryResponse::from)
            .toList();
    }

    @GetMapping("/dashboard-associates")
    @PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
    List<DashboardAssociateResponse> dashboardAssociates() {
        return userRepository.findDashboardAssociates().stream()
            .map(user -> new DashboardAssociateResponse(user.getId(), user.getFullName(), user.isActive())).toList();
    }
}
