package com.example.crm.documents;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Path;
import java.util.Set;
import org.springframework.context.annotation.Primary;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

@Component
@Primary
public class ShowcaseDocumentStorage implements DocumentStorage {
    private static final Set<String> KEYS = Set.of(
        "48220437-1035-4bb7-8ea3-9228bc3ef329.txt",
        "a6a10777-85b8-4d0b-8c59-68369f34ce1b.txt",
        "8fb9cf7e-d94d-473c-9ce8-79bb52c276ae.txt");

    @Override public String store(InputStream content, String extension) throws IOException {
        throw new IOException("Showcase documents are immutable");
    }
    @Override public Path resolve(String storageKey) {
        throw new UnsupportedOperationException("Showcase documents are packaged resources");
    }
    @Override public Resource resource(String storageKey) {
        if (!KEYS.contains(storageKey)) throw new com.example.crm.common.web.ResourceNotFoundException("Document file not found");
        return new ClassPathResource("showcase-documents/" + storageKey);
    }
}
