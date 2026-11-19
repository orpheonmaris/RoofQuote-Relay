-- RoofQuote Relay Platform, isolated tenant data. Run using Wrangler D1 migrations.
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
  owner_email TEXT NOT NULL, phone TEXT NOT NULL DEFAULT '',
  privacy_url TEXT NOT NULL DEFAULT '', service_area TEXT NOT NULL DEFAULT '',
  timezone TEXT NOT NULL DEFAULT 'America/Phoenix',
  state TEXT NOT NULL DEFAULT 'draft' CHECK (state IN ('draft','active','paused')),
  live_approved_by TEXT, live_approved_at INTEGER,
  reminder_first_min INTEGER NOT NULL DEFAULT 45,
  reminder_repeat_min INTEGER NOT NULL DEFAULT 120,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS memberships (
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('owner','staff')),
  created_at INTEGER NOT NULL, PRIMARY KEY (org_id,email)
);
CREATE INDEX IF NOT EXISTS memberships_by_email ON memberships(email);
CREATE TABLE IF NOT EXISTS login_tokens (
  hash TEXT PRIMARY KEY, email TEXT NOT NULL, expires_at INTEGER NOT NULL,
  used_at INTEGER, created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS login_tokens_email ON login_tokens(email,created_at);
CREATE TABLE IF NOT EXISTS sessions (
  hash TEXT PRIMARY KEY, email TEXT NOT NULL, created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_email ON sessions(email);
CREATE TABLE IF NOT EXISTS rate_windows (
  key TEXT PRIMARY KEY, window_start INTEGER NOT NULL, count INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  request_key TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  name TEXT NOT NULL, email TEXT NOT NULL, email_hash TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '', zip TEXT NOT NULL,
  service TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'Website form',
  status TEXT NOT NULL DEFAULT 'New'
    CHECK(status IN ('New','Contacted','Booked','Closed - Won','Closed - Lost','Do not contact')),
  contacted_at INTEGER, updated_at INTEGER NOT NULL,
  reminder_count INTEGER NOT NULL DEFAULT 0,
  reminder_last_at INTEGER,
  ack_state TEXT NOT NULL DEFAULT 'NOT_QUEUED',
  alert_state TEXT NOT NULL DEFAULT 'NOT_QUEUED',
  UNIQUE (org_id,request_key)
);
CREATE INDEX IF NOT EXISTS leads_recent ON leads(org_id,created_at DESC);
CREATE INDEX IF NOT EXISTS leads_status ON leads(org_id,status,created_at);
CREATE TABLE IF NOT EXISTS suppressions (
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (org_id,email_hash)
);
CREATE TABLE IF NOT EXISTS outbox (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id TEXT REFERENCES leads(id) ON DELETE CASCADE,
  kind TEXT NOT NULL, recipient TEXT NOT NULL,
  subject TEXT NOT NULL, body TEXT NOT NULL,
  reply_to TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT 'QUEUED'
    CHECK(state IN ('QUEUED','CLAIMED','SENT','FAILED_REVIEW','UNKNOWN_REVIEW')),
  created_at INTEGER NOT NULL,
  claimed_at INTEGER, sent_at INTEGER, provider_id TEXT, failure_code TEXT,
  UNIQUE(org_id, lead_id, kind)
);
CREATE INDEX IF NOT EXISTS outbox_pending ON outbox(state,created_at);
CREATE INDEX IF NOT EXISTS outbox_org ON outbox(org_id,created_at DESC);
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY, org_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  lead_id TEXT REFERENCES leads(id) ON DELETE SET NULL,
  actor TEXT NOT NULL, action TEXT NOT NULL, detail TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS events_org ON events(org_id,created_at DESC);
