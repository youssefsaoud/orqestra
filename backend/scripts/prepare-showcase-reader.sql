\set ON_ERROR_STOP on
\getenv reader_password CRM_SHOWCASE_READER_PASSWORD
SELECT current_database() NOT IN ('crm_dev','orqestra_demo','postgres')
  AND EXISTS (SELECT 1 FROM app_users WHERE email='admin@orqestra.demo' AND role='ADMIN')
  AND (SELECT count(*) FROM flyway_schema_history WHERE success)=13 AS safe_target \gset
\if :safe_target
BEGIN;
CREATE ROLE showcase_reader LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION PASSWORD :'reader_password';
REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE CONNECT,TEMPORARY ON DATABASE :DBNAME FROM PUBLIC;
GRANT CONNECT ON DATABASE :DBNAME TO showcase_reader;
GRANT USAGE ON SCHEMA public TO showcase_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO showcase_reader;
ALTER ROLE showcase_reader SET default_transaction_read_only=on;
ALTER ROLE showcase_reader SET statement_timeout='15s';
ALTER ROLE showcase_reader SET idle_in_transaction_session_timeout='30s';
COMMIT;
\else
\echo 'Refusing setup: restore the synthetic showcase dataset into a separate database first.'
\quit 1
\endif
