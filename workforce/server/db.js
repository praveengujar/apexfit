import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

// ---------------------------------------------------------------------------
// Path & directory setup
// ---------------------------------------------------------------------------
const DB_DIR = join(homedir(), '.claude', 'tasks');
const DB_PATH = join(DB_DIR, 'workforce.db');

// ---------------------------------------------------------------------------
// Prepared statement cache
// ---------------------------------------------------------------------------
const _stmtCache = new Map();

function stmt(sql) {
  const db = getDb();
  if (_stmtCache.has(sql)) return _stmtCache.get(sql);
  const s = db.prepare(sql);
  _stmtCache.set(sql, s);
  return s;
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------
let _db = null;

/**
 * Return (and lazily create) the singleton SQLite connection.
 * Tables are created on first call; WAL journal mode is enabled.
 */
export function getDb() {
  if (_db) return _db;

  if (!existsSync(DB_DIR)) {
    mkdirSync(DB_DIR, { recursive: true });
  }

  _db = new DatabaseSync(DB_PATH);

  // WAL for concurrent reads while a write is in progress
  _db.exec('PRAGMA journal_mode = WAL');
  _db.exec('PRAGMA foreign_keys = ON');

  _applySchema(_db);

  return _db;
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
function _applySchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version   INTEGER PRIMARY KEY,
      appliedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id            TEXT PRIMARY KEY,
      prompt        TEXT,
      status        TEXT NOT NULL DEFAULT 'pending',
      project       TEXT,
      branch        TEXT,
      worktreePath  TEXT,
      pid           INTEGER,
      sessionId     TEXT,
      output        TEXT,
      error         TEXT,
      merged        INTEGER NOT NULL DEFAULT 0,
      mergeFailed   INTEGER NOT NULL DEFAULT 0,
      retryCount    INTEGER NOT NULL DEFAULT 0,
      maxRetries    INTEGER NOT NULL DEFAULT 2,
      pinned        INTEGER NOT NULL DEFAULT 0,
      needsInput    INTEGER NOT NULL DEFAULT 0,
      exitCode      INTEGER,
      cost          REAL,
      createdAt     TEXT,
      startedAt     TEXT,
      completedAt   TEXT,
      archivedAt    TEXT
    );

    CREATE TABLE IF NOT EXISTS task_events (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      taskId    TEXT NOT NULL,
      phase     TEXT NOT NULL,
      detail    TEXT,
      timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workers (
      taskId    TEXT PRIMARY KEY,
      pid       INTEGER,
      logPath   TEXT,
      startedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS launch_claims (
      taskId    TEXT PRIMARY KEY,
      claimedAt TEXT NOT NULL,
      claimedBy TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_createdAt ON tasks(createdAt);
    CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project);
    CREATE INDEX IF NOT EXISTS idx_task_events_taskId ON task_events(taskId);
  `);

  // Record migration version 1 if not already present
  const row = db.prepare('SELECT version FROM schema_migrations WHERE version = 1').get();
  if (!row) {
    db.prepare('INSERT INTO schema_migrations (version, appliedAt) VALUES (?, ?)').run(
      1,
      new Date().toISOString(),
    );
  }

  // Migration 2: add tmux and review columns
  const m2 = db.prepare('SELECT version FROM schema_migrations WHERE version = 2').get();
  if (!m2) {
    try {
      db.exec("ALTER TABLE tasks ADD COLUMN tmuxSession TEXT");
      db.exec("ALTER TABLE tasks ADD COLUMN autoMerge INTEGER NOT NULL DEFAULT 0");
      db.exec("ALTER TABLE tasks ADD COLUMN profile TEXT");
    } catch { /* columns may already exist */ }
    db.prepare('INSERT INTO schema_migrations (version, appliedAt) VALUES (?, ?)').run(
      2, new Date().toISOString()
    );
  }
}

// ---------------------------------------------------------------------------
// Task CRUD
// ---------------------------------------------------------------------------

/**
 * Return all tasks. Archived tasks are excluded unless `includeArchived` is true.
 */
export function getAllTasks(includeArchived = false) {
  if (includeArchived) {
    return stmt('SELECT * FROM tasks ORDER BY createdAt DESC').all();
  }
  return stmt("SELECT * FROM tasks WHERE status != 'archived' ORDER BY createdAt DESC").all();
}

/** Return a single task by id, or undefined. */
export function getTask(id) {
  return stmt('SELECT * FROM tasks WHERE id = ?').get(id);
}

/** Insert a new task in `pending` status. */
export function createTask({ id, prompt, project }) {
  const now = new Date().toISOString();
  stmt(
    `INSERT INTO tasks (id, prompt, project, status, createdAt)
     VALUES (?, ?, ?, 'pending', ?)`,
  ).run(id, prompt, project ?? null, now);
  return getTask(id);
}

/**
 * Partial update: only the keys present in `updates` are written.
 * Returns the updated row.
 */
const TASK_COLUMNS = new Set([
  'prompt', 'status', 'project', 'branch', 'worktreePath', 'pid',
  'sessionId', 'output', 'error', 'merged', 'mergeFailed', 'retryCount',
  'maxRetries', 'pinned', 'needsInput', 'exitCode', 'cost',
  'createdAt', 'startedAt', 'completedAt', 'archivedAt',
  'tmuxSession', 'autoMerge', 'profile',
]);

export function updateTask(id, updates) {
  const keys = Object.keys(updates).filter(k => TASK_COLUMNS.has(k));
  if (keys.length === 0) return getTask(id);

  const setClauses = keys.map((k) => `${k} = ?`).join(', ');
  const values = keys.map((k) => updates[k]);

  // Dynamic SQL varies per call — use getDb().prepare() directly
  getDb().prepare(`UPDATE tasks SET ${setClauses} WHERE id = ?`).run(...values, id);
  return getTask(id);
}

/** Hard-delete a task record. */
export function deleteTask(id) {
  stmt('DELETE FROM task_events WHERE taskId = ?').run(id);
  stmt('DELETE FROM workers WHERE taskId = ?').run(id);
  stmt('DELETE FROM launch_claims WHERE taskId = ?').run(id);
  stmt('DELETE FROM tasks WHERE id = ?').run(id);
}

/** Return tasks whose status is `running`. */
export function getRunningTasks() {
  return stmt("SELECT * FROM tasks WHERE status = 'running' ORDER BY startedAt ASC").all();
}

/** Return tasks whose status is `pending`, oldest first. */
export function getPendingTasks() {
  return stmt("SELECT * FROM tasks WHERE status = 'pending' ORDER BY createdAt ASC").all();
}

// ---------------------------------------------------------------------------
// Task events
// ---------------------------------------------------------------------------

/** Get all lifecycle events for a task, sorted chronologically. */
export function getTaskEvents(taskId) {
  return stmt('SELECT * FROM task_events WHERE taskId = ? ORDER BY timestamp ASC').all(taskId);
}

/** Append a lifecycle event. */
export function addTaskEvent(taskId, phase, detail = null) {
  const now = new Date().toISOString();
  stmt(
    'INSERT INTO task_events (taskId, phase, detail, timestamp) VALUES (?, ?, ?, ?)',
  ).run(taskId, phase, detail, now);
}

// ---------------------------------------------------------------------------
// Launch claims (coordination)
// ---------------------------------------------------------------------------

/**
 * Attempt to claim a task for launching.
 * Returns `true` if the claim was inserted (i.e. no prior claim existed).
 */
export function claimTask(taskId, claimedBy) {
  const now = new Date().toISOString();
  const result = stmt(
    'INSERT OR IGNORE INTO launch_claims (taskId, claimedAt, claimedBy) VALUES (?, ?, ?)',
  ).run(taskId, now, claimedBy ?? null);
  return result.changes > 0;
}

/** Release a launch claim. */
export function releaseTaskClaim(taskId) {
  stmt('DELETE FROM launch_claims WHERE taskId = ?').run(taskId);
}

/** Return claims older than `maxAgeMs` (default 60 s). */
export function getStaleClaims(maxAgeMs = 60_000) {
  const cutoff = new Date(Date.now() - maxAgeMs).toISOString();
  return stmt('SELECT * FROM launch_claims WHERE claimedAt < ?').all(cutoff);
}

// ---------------------------------------------------------------------------
// Workers
// ---------------------------------------------------------------------------

/** Register a worker process for a task. */
export function registerWorker(taskId, pid, logPath) {
  const now = new Date().toISOString();
  stmt(
    'INSERT OR REPLACE INTO workers (taskId, pid, logPath, startedAt) VALUES (?, ?, ?, ?)',
  ).run(taskId, pid, logPath ?? null, now);
}

/** Remove a worker record. */
export function removeWorker(taskId) {
  stmt('DELETE FROM workers WHERE taskId = ?').run(taskId);
}

/** Get worker record for a task, or undefined. */
export function getWorker(taskId) {
  return stmt('SELECT * FROM workers WHERE taskId = ?').get(taskId);
}
