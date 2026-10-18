package com.example.crm.documents;

import static org.assertj.core.api.Assertions.*;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;

class ShowcaseDocumentStorageTest {
    @Test void onlyTheOriginalImmutableSamplesCanBeRead() throws Exception {
        var storage = new ShowcaseDocumentStorage();
        for (String key : new String[] {"48220437-1035-4bb7-8ea3-9228bc3ef329.txt",
            "a6a10777-85b8-4d0b-8c59-68369f34ce1b.txt", "8fb9cf7e-d94d-473c-9ce8-79bb52c276ae.txt"}) {
            assertThat(storage.resource(key).getContentAsString(StandardCharsets.UTF_8))
                .startsWith("Synthetic Orqestra demonstration document.").contains("Not a real client agreement.");
        }
        assertThatThrownBy(() -> storage.resource("../application.yml")).isInstanceOf(RuntimeException.class);
        assertThatThrownBy(() -> storage.resource("application.yml")).isInstanceOf(RuntimeException.class);
        assertThatThrownBy(() -> storage.store(new ByteArrayInputStream(new byte[0]), ".txt")).isInstanceOf(java.io.IOException.class);
        assertThatThrownBy(() -> storage.resolve("file.txt")).isInstanceOf(UnsupportedOperationException.class);
    }
}
