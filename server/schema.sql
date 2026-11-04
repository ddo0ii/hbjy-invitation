PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA busy_timeout = 5000;

CREATE TABLE IF NOT EXISTS rsvp (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL UNIQUE,
  side TEXT NOT NULL CHECK (side IN ('groom', 'bride')),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  attendance TEXT NOT NULL CHECK (attendance IN ('yes', 'no')),
  guest_count INTEGER NOT NULL CHECK (guest_count BETWEEN 0 AND 20),
  companions TEXT NOT NULL,
  meal TEXT NOT NULL CHECK (meal IN ('yes', 'no', 'undecided')),
  bus TEXT NOT NULL CHECK (bus IN ('none', '대전', '경주')),
  message TEXT NOT NULL,
  consent INTEGER NOT NULL CHECK (consent = 1),
  created_at TEXT NOT NULL,
  CHECK ((attendance = 'yes' AND guest_count >= 1) OR (attendance = 'no' AND guest_count = 0 AND meal = 'no' AND bus = 'none' AND companions = ''))
) STRICT;

CREATE TABLE IF NOT EXISTS snapshots (
  id TEXT PRIMARY KEY,
  uploader TEXT NOT NULL,
  file_name TEXT NOT NULL UNIQUE,
  byte_size INTEGER NOT NULL CHECK (byte_size > 0),
  width INTEGER NOT NULL CHECK (width > 0),
  height INTEGER NOT NULL CHECK (height > 0),
  consent INTEGER NOT NULL CHECK (consent = 1),
  created_at TEXT NOT NULL
) STRICT;

CREATE INDEX IF NOT EXISTS idx_rsvp_created_at ON rsvp(created_at);
CREATE INDEX IF NOT EXISTS idx_snapshots_created_at ON snapshots(created_at);
