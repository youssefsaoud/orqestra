package com.example.crm.projects;

import java.util.Optional;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface ProjectRepository extends JpaRepository<Project, UUID> {
    boolean existsByAssignedAssociate_IdAndDeletedAtIsNull(UUID associateId);
    interface StatusCount { ProjectStatus getStatus(); long getCount(); }

    @Query("""
        select p.status as status, count(p) as count from Project p
        where p.deletedAt is null
          and (:canSeeAll = true or p.assignedAssociate.id = :userId)
          and (:search is null or lower(p.name) like lower(concat('%', cast(:search as string), '%')) or lower(p.reference) like lower(concat('%', cast(:search as string), '%')))
          and (:clientId is null or p.client.id = :clientId)
          and (:associateId is null or p.assignedAssociate.id = :associateId)
        group by p.status
        """)
    List<StatusCount> statusCounts(UUID userId, boolean canSeeAll, String search, UUID clientId, UUID associateId);

    @EntityGraph(attributePaths = {"client", "assignedAssociate"})
    @Query(value = """
        select p from Project p
        where p.deletedAt is null
          and (:canSeeAll = true or p.assignedAssociate.id = :userId)
          and (:search is null or lower(p.name) like lower(concat('%', cast(:search as string), '%')) or lower(p.reference) like lower(concat('%', cast(:search as string), '%')))
          and (:status is null or p.status = :status)
          and (:clientId is null or p.client.id = :clientId)
          and (:assignedAssociateId is null or p.assignedAssociate.id = :assignedAssociateId)
        """, countQuery = """
        select count(p) from Project p
        where p.deletedAt is null
          and (:canSeeAll = true or p.assignedAssociate.id = :userId)
          and (:search is null or lower(p.name) like lower(concat('%', cast(:search as string), '%')) or lower(p.reference) like lower(concat('%', cast(:search as string), '%')))
          and (:status is null or p.status = :status)
          and (:clientId is null or p.client.id = :clientId)
          and (:assignedAssociateId is null or p.assignedAssociate.id = :assignedAssociateId)
        """)
    Page<Project> searchVisible(@Param("userId") UUID userId, @Param("canSeeAll") boolean canSeeAll, @Param("search") String search, @Param("status") ProjectStatus status, @Param("clientId") UUID clientId, @Param("assignedAssociateId") UUID assignedAssociateId, Pageable pageable);

    Optional<Project> findByReference(String reference);

    @Query("select count(p) from Project p where p.deletedAt is null and (:canSeeAll = true or p.assignedAssociate.id = :userId)")
    long countVisible(@Param("userId") UUID userId, @Param("canSeeAll") boolean canSeeAll);

    @Query("select count(p) from Project p where p.deletedAt is null and (:canSeeAll = true or p.assignedAssociate.id = :userId) and p.status = :status")
    long countVisibleByStatus(@Param("userId") UUID userId, @Param("canSeeAll") boolean canSeeAll, @Param("status") ProjectStatus status);

    @Query("select count(p) from Project p where p.deletedAt is null and (:canSeeAll = true or p.assignedAssociate.id = :userId) and p.deadline between :fromDate and :toDate")
    long countVisibleWithDeadlineBetween(@Param("userId") UUID userId, @Param("canSeeAll") boolean canSeeAll, @Param("fromDate") java.time.LocalDate fromDate, @Param("toDate") java.time.LocalDate toDate);

    @Query("select count(p) from Project p where p.deletedAt is null and (:canSeeAll = true or p.assignedAssociate.id = :userId) and p.deadline < :beforeDate")
    long countVisibleWithDeadlineBefore(@Param("userId") UUID userId, @Param("canSeeAll") boolean canSeeAll, @Param("beforeDate") java.time.LocalDate beforeDate);

    @EntityGraph(attributePaths = {"assignedAssociate"})
    @Query("""
        select p from Project p
        where p.deletedAt is null
          and (:canSeeAll = true or p.assignedAssociate.id = :userId)
          and (:associateId is null or p.assignedAssociate.id = :associateId)
        """)
    List<Project> findVisibleForDashboard(@Param("userId") UUID userId, @Param("canSeeAll") boolean canSeeAll, @Param("associateId") UUID associateId);
}
