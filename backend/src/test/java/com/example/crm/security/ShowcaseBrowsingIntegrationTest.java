package com.example.crm.security;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import com.example.crm.documents.DocumentStorage;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.MockMvcPrint;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

/** Opt-in against an already restored, isolated copy. Fixtures and migrations are never written. */
@SpringBootTest
@AutoConfigureMockMvc(print = MockMvcPrint.NONE)
@EnabledIfEnvironmentVariable(named = "SHOWCASE_INTEGRATION_TESTS", matches = "true")
class ShowcaseBrowsingIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;
    @Autowired DocumentStorage storage;
    private Map<String,String> before;

    @BeforeEach void fingerprintBefore() { before = snapshot(); }
    @AfterEach void noRecordsChanged() { assertThat(snapshot()).isEqualTo(before); }

    private Map<String,String> snapshot() {
        Map<String,String> result = new TreeMap<>();
        jdbc.queryForList("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename", String.class)
            .forEach(table -> result.put(table, jdbc.queryForObject("SELECT count(*)::text || ':' || md5(coalesce(string_agg(md5(row_to_json(t)::text),'' ORDER BY md5(row_to_json(t)::text)),'')) FROM \"" + table.replace("\"", "\"\"") + "\" t", String.class)));
        return result;
    }

    private String login(String role) throws Exception {
        String body = json.writeValueAsString(Map.of("email", role + "@orqestra.demo", "password", "OrqestraDemo2026!"));
        String response = mvc.perform(post("/api/v1/auth/login").contentType("application/json").content(body))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return "Bearer " + json.readTree(response).get("accessToken").asText();
    }

    @Test void dashboardLookupIncludesAssignedInactiveStaffWithoutExposingItToAssociates() throws Exception {
        for (String role : List.of("admin", "manager")) {
            String bearer = login(role);
            JsonNode associates = read("/api/v1/users/dashboard-associates", bearer);
            assertThat(associates.size()).isEqualTo(3);
            for (JsonNode associate : associates) {
                JsonNode analytics = read("/api/v1/project-dashboard/analytics?range=ALL_TIME&associateId=" + associate.get("id").asText(), bearer);
                assertThat(analytics.get("selectedAssociateId").asText()).isEqualTo(associate.get("id").asText());
                assertThat(analytics.get("totalProjects").asInt()).isPositive();
            }
        }
        mvc.perform(get("/api/v1/users/dashboard-associates").header("Authorization", login("associate")))
            .andExpect(status().isForbidden());
    }

    private JsonNode read(String path, String bearer) throws Exception {
        return json.readTree(mvc.perform(get(path).header("Authorization", bearer)).andExpect(status().isOk())
            .andReturn().getResponse().getContentAsString());
    }

    @Test void realDemoAuthenticationAndReadScopesRemainEnforced() throws Exception {
        assertThat(jdbc.queryForObject("SELECT current_database()", String.class)).isEqualTo("crm_showcase");
        assertThat(jdbc.queryForObject("SHOW transaction_read_only", String.class)).isEqualTo("on");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM flyway_schema_history WHERE success", Long.class)).isEqualTo(13);
        for (String role : List.of("admin", "manager", "associate")) {
            String bearer = login(role);
            JsonNode me = read("/api/v1/auth/me", bearer);
            assertThat(me.get("role").asText()).isEqualTo(role.equals("associate") ? "SALES_REP" : role.toUpperCase(Locale.ROOT));
            JsonNode projects = read("/api/v1/projects?size=100", bearer);
            assertThat(projects.get("totalElements").asLong()).isPositive();
            read("/api/v1/project-dashboard/analytics", bearer);
            if (role.equals("associate")) {
                for (JsonNode project : projects.get("content")) assertThat(project.get("assignedAssociateId").asText()).isEqualTo(me.get("id").asText());
                String other = jdbc.queryForObject("SELECT id::text FROM projects WHERE assigned_associate_id<>?::uuid AND deleted_at IS NULL LIMIT 1", String.class, me.get("id").asText());
                mvc.perform(get("/api/v1/projects/" + other).header("Authorization", bearer)).andExpect(status().isNotFound());
            }
            mvc.perform(get("/api/v1/admin/employees").header("Authorization", bearer))
                .andExpect(status().is(role.equals("admin") ? 200 : 403));
        }
        mvc.perform(get("/api/v1/projects")).andExpect(status().isForbidden());
    }

    @Test void allThreePackagedDocumentsKeepTheirOriginalAuthorization() throws Exception {
        String admin = login("admin"); String manager = login("manager"); String associate = login("associate");
        String associateId = read("/api/v1/auth/me", associate).get("id").asText();
        var documents = jdbc.queryForList("SELECT d.id,d.storage_key,p.assigned_associate_id FROM project_documents d JOIN projects p ON p.id=d.project_id");
        assertThat(documents).hasSize(3);
        int denied = 0;
        for (var document : documents) {
            String path = "/api/v1/documents/" + document.get("id") + "/download";
            var resource = storage.resource(document.get("storage_key").toString());
            assertThat(resource).isInstanceOf(ClassPathResource.class);
            for (String token : List.of(admin, manager)) {
                mvc.perform(get(path).header("Authorization", token)).andExpect(status().isOk())
                    .andExpect(content().bytes(resource.getContentAsByteArray()));
            }
            boolean visible = associateId.equals(String.valueOf(document.get("assigned_associate_id")));
            mvc.perform(get(path).header("Authorization", associate)).andExpect(status().is(visible ? 200 : 404));
            if (!visible) denied++;
            mvc.perform(get(path)).andExpect(status().isForbidden());
        }
        assertThat(denied).isPositive();
    }

    @Test void directMutationsRemainForbiddenForEveryRole() throws Exception {
        for (String role : List.of("admin", "manager", "associate")) {
            String bearer = login(role);
            for (String method : List.of("POST", "PUT", "PATCH", "DELETE")) {
                for (String path : List.of("/projects", "/companies", "/project-vendors/00000000-0000-0000-0000-000000000001",
                    "/projects/00000000-0000-0000-0000-000000000001/documents", "/admin/invitations", "/invitations/accept")) {
                    mvc.perform(MockMvcRequestBuilders.request(org.springframework.http.HttpMethod.valueOf(method), "/api/v1" + path)
                        .header("Authorization", bearer).contentType("application/json").content("{}"))
                        .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("SHOWCASE_READ_ONLY"));
                }
            }
        }
    }
}
