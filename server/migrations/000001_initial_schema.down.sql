-- =============================================================================
-- 000001_initial_schema.down.sql — Teardown Database Schema
-- =============================================================================

DROP TABLE IF EXISTS analytics_state CASCADE;
DROP TABLE IF EXISTS transit_events CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS scrape_jobs CASCADE;
DROP TABLE IF EXISTS content_hashes CASCADE;
DROP TABLE IF EXISTS countries CASCADE;
DROP TABLE IF EXISTS entities CASCADE;
DROP TABLE IF EXISTS articles CASCADE;
DROP TABLE IF EXISTS sources CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS watchlist CASCADE;
DROP TABLE IF EXISTS settings CASCADE;
DROP TABLE IF EXISTS anomalies CASCADE;
DROP TABLE IF EXISTS dataset_snapshots CASCADE;
DROP TABLE IF EXISTS telemetry_observations CASCADE;
DROP TABLE IF EXISTS tracks CASCADE;
DROP TABLE IF EXISTS news CASCADE;
