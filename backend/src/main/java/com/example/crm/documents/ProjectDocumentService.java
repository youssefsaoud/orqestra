package com.example.crm.documents;

import com.example.crm.common.web.ConflictException;
import com.example.crm.common.web.ResourceNotFoundException;
import com.example.crm.projectvendors.ProjectVendor;
import com.example.crm.projects.Project;
import com.example.crm.projects.ProjectRepository;
import com.example.crm.quotations.Quotation;
import com.example.crm.quotations.QuotationRepository;
import com.example.crm.security.CrmUserPrincipal;
import com.example.crm.users.Role;
import com.example.crm.users.User;
import com.example.crm.users.UserRepository;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.core.io.Resource;
import org.springframework.core.io.FileSystemResource;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ProjectDocumentService {
    private static final long MAX_SIZE = 10 * 1024 * 1024;
    private static final java.util.Map<String, String> ALLOWED_TYPES = java.util.Map.of(
        "application/pdf", ".pdf",
        "image/png", ".png",
        "image/jpeg", ".jpg",
        "text/plain", ".txt",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".docx"
    );

    private final ProjectDocumentRepository documentRepository;
    private final ProjectRepository projectRepository;
    private final QuotationRepository quotationRepository;
    private final UserRepository userRepository;
    private final DocumentStorage storage;

    public ProjectDocumentService(ProjectDocumentRepository documentRepository, ProjectRepository projectRepository, QuotationRepository quotationRepository, UserRepository userRepository, DocumentStorage storage) {
        this.documentRepository = documentRepository; this.projectRepository = projectRepository; this.quotationRepository = quotationRepository; this.userRepository = userRepository; this.storage = storage;
    }

    @Transactional(readOnly = true)
    public List<ProjectDocumentResponse> list(UUID projectId, CrmUserPrincipal principal) {
        visibleProject(projectId, principal);
        return documentRepository.findByProjectIdOrderByCreatedAtDesc(projectId).stream().map(ProjectDocumentResponse::from).toList();
    }

    @Transactional
    public ProjectDocumentResponse upload(UUID projectId, UUID quotationId, MultipartFile file, CrmUserPrincipal principal) {
        Project project = visibleProject(projectId, principal);
        if (file == null || file.isEmpty() || file.getSize() > MAX_SIZE) throw new ConflictException("Document must be between 1 byte and 10 MB");
        String contentType = file.getContentType() == null ? "" : file.getContentType().toLowerCase(Locale.ROOT);
        String extension = ALLOWED_TYPES.get(contentType);
        if (extension == null) throw new ConflictException("Unsupported document type");
        Quotation quotation = null;
        if (quotationId != null) {
            quotation = quotationRepository.findWithDetailsById(quotationId).orElseThrow(() -> new ResourceNotFoundException("Quotation not found"));
            if (!quotation.getProjectVendor().getProject().getId().equals(projectId)) throw new ConflictException("Quotation does not belong to this project");
        }
        String filename = sanitizeFilename(file.getOriginalFilename());
        String storageKey;
        try (InputStream content = file.getInputStream()) {
            storageKey = storage.store(content, extension);
        } catch (IOException exception) {
            throw new ConflictException("Document could not be stored");
        }
        User uploader = userRepository.findById(principal.id()).orElseThrow(() -> new AccessDeniedException("Current user is not available"));
        try {
            return ProjectDocumentResponse.from(documentRepository.save(new ProjectDocument(project, quotation, filename, storageKey, contentType, file.getSize(), uploader)));
        } catch (RuntimeException exception) {
            try { Files.deleteIfExists(storage.resolve(storageKey)); } catch (IOException ignored) {}
            throw exception;
        }
    }

    @Transactional(readOnly = true)
    public StoredDocument download(UUID id, CrmUserPrincipal principal) {
        ProjectDocument document = documentRepository.findWithDetailsById(id).orElseThrow(() -> new ResourceNotFoundException("Document not found"));
        visibleProject(document.getProject().getId(), principal);
        Resource resource = storage.resource(document.getStorageKey());
        if (!resource.exists() || !resource.isReadable()) throw new ResourceNotFoundException("Document file not found");
        return new StoredDocument(resource, document.getOriginalFilename(), document.getContentType());
    }

    private Project visibleProject(UUID id, CrmUserPrincipal principal) {
        Project project = projectRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Project not found"));
        if (project.getDeletedAt() != null || (!canSeeAll(principal) && (project.getAssignedAssociate() == null || !project.getAssignedAssociate().getId().equals(principal.id())))) throw new ResourceNotFoundException("Project not found");
        return project;
    }

    private boolean canSeeAll(CrmUserPrincipal principal) { return principal.role() == Role.ADMIN || principal.role() == Role.MANAGER; }
    private String sanitizeFilename(String filename) { String value = filename == null ? "document" : Path.of(filename).getFileName().toString().replaceAll("[\\r\\n]", "_"); return value.length() > 255 ? value.substring(0, 255) : value; }
    public record StoredDocument(Resource resource, String filename, String contentType) {}
}
