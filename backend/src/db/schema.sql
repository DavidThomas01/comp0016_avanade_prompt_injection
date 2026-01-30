PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS suites (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tests (
  id TEXT PRIMARY KEY,
  suite_id TEXT NOT NULL,
  name TEXT NOT NULL,
  prompt TEXT NOT NULL DEFAULT '',
  expected_behavior TEXT NOT NULL DEFAULT '',
  required_mitigations_json TEXT NOT NULL DEFAULT '[]',
  model_config_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (suite_id) REFERENCES suites(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  test_id TEXT NOT NULL,
  suite_id TEXT NOT NULL,
  prompt_used TEXT NOT NULL,
  active_mitigations_json TEXT NOT NULL DEFAULT '[]',
  model_config_used_json TEXT NOT NULL DEFAULT '{}',
  model_response TEXT NOT NULL,
  passed INTEGER NOT NULL,
  mitigation_results_json TEXT NOT NULL DEFAULT '[]',
  signals_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE,
  FOREIGN KEY (suite_id) REFERENCES suites(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_tests_suite_id ON tests(suite_id);
CREATE INDEX IF NOT EXISTS idx_runs_test_id ON runs(test_id);
CREATE INDEX IF NOT EXISTS idx_runs_suite_id ON runs(suite_id);
