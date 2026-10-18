package com.example.crm.users;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByNormalizedEmail(String normalizedEmail);
    boolean existsByRole(Role role);
    List<User> findByRoleAndActiveTrueOrderByFullNameAsc(Role role);
    @Query("""
        select u from User u where u.role = com.example.crm.users.Role.SALES_REP
        and (u.active = true or exists (select p.id from Project p where p.assignedAssociate = u and p.deletedAt is null))
        order by u.fullName
        """)
    List<User> findDashboardAssociates();
}
