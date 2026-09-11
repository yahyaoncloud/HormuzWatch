-- =============================================================================
-- 000001_initial_schema.up.sql — HormuzWatch Primary Database Schema
-- =============================================================================

CREATE TABLE IF NOT EXISTS news (
    id TEXT PRIMARY KEY,
    title TEXT,
    link TEXT,
    pub_date TIMESTAMPTZ,
    source TEXT,
    summary TEXT
);

CREATE TABLE IF NOT EXISTS tracks (
    track_id TEXT PRIMARY KEY,
    asset_name TEXT,
    timestamp TEXT,
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION,
    speed DOUBLE PRECISION,
    previous_speed DOUBLE PRECISION,
    heading DOUBLE PRECISION,
    course_delta DOUBLE PRECISION,
    ais_age_minutes INTEGER,
    hot_zone_distance_nm DOUBLE PRECISION,
    object_type TEXT NOT NULL DEFAULT 'vessel',
    source TEXT NOT NULL DEFAULT 'webapp',
    flag TEXT,
    destination TEXT,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS telemetry_observations (
    id BIGSERIAL PRIMARY KEY,
    track_id TEXT NOT NULL,
    asset_name TEXT NOT NULL,
    domain TEXT NOT NULL CHECK (domain IN ('vessel', 'aircraft')),
    source TEXT NOT NULL,
    observed_at TIMESTAMPTZ NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lon DOUBLE PRECISION NOT NULL,
    speed DOUBLE PRECISION NOT NULL DEFAULT 0,
    previous_speed DOUBLE PRECISION NOT NULL DEFAULT 0,
    heading DOUBLE PRECISION NOT NULL DEFAULT 0,
    course_delta DOUBLE PRECISION NOT NULL DEFAULT 0,
    ais_age_minutes INTEGER NOT NULL DEFAULT 0,
    hot_zone_distance_nm DOUBLE PRECISION NOT NULL DEFAULT 0,
    altitude DOUBLE PRECISION NOT NULL DEFAULT 0,
    squawk TEXT NOT NULL DEFAULT '',
    on_ground BOOLEAN NOT NULL DEFAULT FALSE,
    ship_type INTEGER,
    flag TEXT,
    destination TEXT,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telemetry_observations_domain_time
    ON telemetry_observations (domain, observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_observations_track_time
    ON telemetry_observations (track_id, observed_at DESC);

CREATE TABLE IF NOT EXISTS dataset_snapshots (
    snapshot_id TEXT PRIMARY KEY,
    domain TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    row_count INTEGER NOT NULL,
    status TEXT NOT NULL,
    external_file_id TEXT,
    external_manifest_id TEXT,
    error_message TEXT
);

CREATE TABLE IF NOT EXISTS anomalies (
    track_id TEXT PRIMARY KEY,
    score DOUBLE PRECISION,
    severity TEXT,
    reasons TEXT,
    actions TEXT,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY(track_id) REFERENCES tracks(track_id)
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
);

CREATE TABLE IF NOT EXISTS watchlist (
    track_id TEXT PRIMARY KEY,
    notes TEXT,
    added_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE,
    email TEXT UNIQUE,
    password_hash TEXT,
    role TEXT DEFAULT 'user',
    status TEXT DEFAULT 'pending',
    supabase_uid TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_supabase_uid ON users(supabase_uid) WHERE supabase_uid IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(email) WHERE email IS NOT NULL AND email <> '';

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    last_seen_at TEXT,
    revoked_at TEXT,
    FOREIGN KEY(username) REFERENCES users(username)
);

CREATE TABLE IF NOT EXISTS sources (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('rss', 'api', 'scraper', 'websocket')),
    url TEXT NOT NULL,
    country TEXT,
    language TEXT,
    reliability REAL DEFAULT 0.7,
    enabled BOOLEAN DEFAULT TRUE,
    rate_limit_rps REAL,
    last_fetched_at TIMESTAMPTZ,
    last_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS articles (
    id TEXT PRIMARY KEY,
    source_id TEXT REFERENCES sources(id),
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    content TEXT,
    summary TEXT,
    published_at TIMESTAMPTZ,
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    language TEXT,
    translated_content TEXT,
    category TEXT,
    risk_score REAL,
    ml_score REAL,
    source_reliability REAL,
    country TEXT,
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION,
    metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_articles_source ON articles(source_id);
CREATE INDEX IF NOT EXISTS idx_articles_published ON articles(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_language ON articles(language);
CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);
CREATE INDEX IF NOT EXISTS idx_articles_risk ON articles(risk_score DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_articles_url ON articles(url);

CREATE TABLE IF NOT EXISTS entities (
    id BIGSERIAL PRIMARY KEY,
    article_id TEXT REFERENCES articles(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('organization', 'person', 'ship', 'aircraft', 'port', 'airport', 'country', 'city', 'company')),
    entity_name TEXT NOT NULL,
    entity_value TEXT,
    confidence REAL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_entities_article ON entities(article_id);
CREATE INDEX IF NOT EXISTS idx_entities_type_name ON entities(entity_type, entity_name);

CREATE TABLE IF NOT EXISTS countries (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    region TEXT,
    risk_level REAL DEFAULT 0.5,
    coordinates JSONB
);

CREATE TABLE IF NOT EXISTS content_hashes (
    hash TEXT PRIMARY KEY,
    article_id TEXT REFERENCES articles(id) ON DELETE CASCADE,
    hash_type TEXT NOT NULL DEFAULT 'sha256',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_hashes_article ON content_hashes(article_id);

CREATE TABLE IF NOT EXISTS scrape_jobs (
    id BIGSERIAL PRIMARY KEY,
    source_id TEXT REFERENCES sources(id),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    articles_fetched INT DEFAULT 0,
    articles_new INT DEFAULT 0,
    articles_duplicate INT DEFAULT 0,
    errors INT DEFAULT 0,
    error_detail TEXT,
    status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_scrape_jobs_source ON scrape_jobs(source_id);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_status ON scrape_jobs(status);

CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    event_type TEXT CHECK (event_type IN ('military', 'political', 'energy', 'maritime', 'aviation', 'weather', 'cyber', 'diplomacy', 'terrorism', 'technology', 'economic')),
    severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION,
    country TEXT,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    source_article_ids JSONB,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_severity ON events(severity);
CREATE INDEX IF NOT EXISTS idx_events_country ON events(country);
CREATE INDEX IF NOT EXISTS idx_events_time ON events(start_time DESC);

CREATE TABLE IF NOT EXISTS transit_events (
    id BIGSERIAL PRIMARY KEY,
    mmsi BIGINT NOT NULL,
    gate_name TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('INBOUND', 'OUTBOUND')),
    crossed_at TIMESTAMPTZ NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    speed REAL,
    ship_name TEXT,
    ship_type INTEGER,
    flag TEXT,
    destination TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transit_crossed_at ON transit_events(crossed_at);
CREATE INDEX IF NOT EXISTS idx_transit_mmsi ON transit_events(mmsi);
CREATE INDEX IF NOT EXISTS idx_transit_gate ON transit_events(gate_name);
CREATE INDEX IF NOT EXISTS idx_transit_dedup ON transit_events(mmsi, gate_name, crossed_at);

CREATE TABLE IF NOT EXISTS analytics_state (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
