-- M0-5 smoke schema: minimal D1 validation tables (messages + community-rate stub).
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel TEXT NOT NULL,
  body TEXT NOT NULL,
  created TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel, id);

CREATE TABLE IF NOT EXISTS community_creations (
  user TEXT NOT NULL,
  day TEXT NOT NULL,
  cnt INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user, day)
);
