package com.example.crm.config;

import javax.sql.DataSource;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

@Configuration
public class ShowcaseDatabaseSafety {
    @Bean InitializingBean verifyRuntimeDatabasePermissions(DataSource source) {
        return () -> {
            var jdbc = new JdbcTemplate(source);
            boolean privileged = Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT r.rolsuper OR r.rolcreatedb OR r.rolcreaterole
                  OR has_schema_privilege(current_user, 'public', 'CREATE')
                  OR has_database_privilege(current_user, current_database(), 'CREATE,TEMPORARY')
                  OR EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
                    WHERE n.nspname='public' AND c.relkind IN ('r','p')
                      AND has_table_privilege(current_user,c.oid,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'))
                FROM pg_roles r WHERE r.rolname=current_user
                """, Boolean.class));
            if (privileged || !"on".equals(jdbc.queryForObject("SHOW transaction_read_only", String.class))) {
                throw new IllegalStateException("Showcase requires a SELECT-only runtime database role");
            }
        };
    }
}
