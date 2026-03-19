#!/usr/bin/env node

/**
 * Watchdog Supervisor
 *
 * Monitors the backend server via health-check polling and auto-restarts on crash.
 * Runs as a standalone process -- spawns the server detached so it survives watchdog exit.
 *
 * Usage:  node watchdog-supervisor.js
 */

import { spawn } from "node:child_process";
import { readFile, mkdir, appendFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

// ---------------------------------------------------------------------------
// Defaults (overridden by supervisor-config.json when present)
// ---------------------------------------------------------------------------
const DEFAULTS = {
  serverCommand: "node server/index.js",
  serverPort: 3740,
  pollInterval: 10_000, // ms between health-check polls
  maxFailures: 3, // consecutive failures before restart
  maxRestartsPerHour: 5,
  additionalServers: [],
};

const PROJECT_ROOT = resolve(import.meta.dirname ?? ".");
const CONFIG_PATH = join(PROJECT_ROOT, "supervisor-config.json");
const LOG_DIR = join(homedir(), ".claude", "logs");
const LOG_PATH = join(LOG_DIR, "workforce-supervisor.jsonl");

// Exponential backoff schedule (seconds)
const BACKOFF_INITIAL = 5;
const BACKOFF_MULTIPLIER = 3;
const BACKOFF_CAP = 60;

// Post-spawn health-check settings
const SPAWN_HEALTH_TIMEOUT = 30_000; // 30s total
const SPAWN_HEALTH_INTERVAL = 2_000; // poll every 2s

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let config = { ...DEFAULTS };
let consecutiveFailures = 0;
let restartTimestamps = []; // timestamps of restarts in the last hour
let currentBackoff = BACKOFF_INITIAL;
let serverProcess = null;
let running = true;
let mainPollTimer = null;

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------
async function ensureLogDir() {
  await mkdir(LOG_DIR, { recursive: true });
}

async function log(level, message, extra = {}) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    message,
    ...extra,
  };

  const line = JSON.stringify(entry) + "\n";

  // Best-effort write -- never let logging crash the watchdog
  try {
    await appendFile(LOG_PATH, line);
  } catch {
    // ignore
  }

  // Also print to stderr for operator visibility
  const prefix = level === "error" ? "ERROR" : level === "warn" ? "WARN " : "INFO ";
  process.stderr.write(`[watchdog ${prefix}] ${message}\n`);
}

// ---------------------------------------------------------------------------
// Config loading
// ---------------------------------------------------------------------------
async function loadConfig() {
  try {
    const raw = await readFile(CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    config = { ...DEFAULTS, ...parsed };
    await log("info", `Loaded config from ${CONFIG_PATH}`, {
      config: {
        serverCommand: config.serverCommand,
        serverPort: config.serverPort,
        pollInterval: config.pollInterval,
        maxFailures: config.maxFailures,
        maxRestartsPerHour: config.maxRestartsPerHour,
        additionalServers: config.additionalServers.length,
      },
    });
  } catch (err) {
    if (err.code === "ENOENT") {
      await log("info", "No supervisor-config.json found, using defaults");
    } else {
      await log("warn", `Failed to parse supervisor-config.json: ${err.message}, using defaults`);
    }
    config = { ...DEFAULTS };
  }
}

// ---------------------------------------------------------------------------
// HTTP health check
// ---------------------------------------------------------------------------
async function ping(url, timeoutMs = 5_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Server spawning
// ---------------------------------------------------------------------------
function spawnServer() {
  const parts = config.serverCommand.split(/\s+/);
  const cmd = parts[0];
  const args = parts.slice(1);

  const child = spawn(cmd, args, {
    cwd: PROJECT_ROOT,
    detached: true,
    stdio: "ignore",
    env: { ...process.env, PORT: String(config.serverPort) },
  });

  child.unref();
  serverProcess = child;
  return child;
}

async function waitForHealthy() {
  const url = `http://localhost:${config.serverPort}/api/ping`;
  const deadline = Date.now() + SPAWN_HEALTH_TIMEOUT;

  while (Date.now() < deadline) {
    if (!running) return false;
    const ok = await ping(url);
    if (ok) return true;
    await sleep(SPAWN_HEALTH_INTERVAL);
  }
  return false;
}

// ---------------------------------------------------------------------------
// Restart logic with crash-loop protection
// ---------------------------------------------------------------------------
function pruneOldRestarts() {
  const oneHourAgo = Date.now() - 3_600_000;
  restartTimestamps = restartTimestamps.filter((ts) => ts > oneHourAgo);
}

async function handleRestart() {
  pruneOldRestarts();

  if (restartTimestamps.length >= config.maxRestartsPerHour) {
    await log("error", `Crash-loop protection: ${restartTimestamps.length} restarts in the last hour (max ${config.maxRestartsPerHour}). Stopping automatic restarts -- manual intervention required.`);
    return;
  }

  await log("warn", `Scheduling restart in ${currentBackoff}s (backoff)`);
  await sleep(currentBackoff * 1_000);

  if (!running) return;

  await log("info", "Spawning server process", { command: config.serverCommand });
  try {
    spawnServer();
  } catch (err) {
    await log("error", `Failed to spawn server: ${err.message}`);
    advanceBackoff();
    return;
  }

  restartTimestamps.push(Date.now());

  await log("info", "Waiting up to 30s for server to become healthy...");
  const healthy = await waitForHealthy();

  if (healthy) {
    await log("info", "Server is healthy after restart");
    consecutiveFailures = 0;
    currentBackoff = BACKOFF_INITIAL; // reset backoff on success
  } else {
    await log("error", "Server did not become healthy within 30s after restart");
    advanceBackoff();
  }
}

function advanceBackoff() {
  currentBackoff = Math.min(currentBackoff * BACKOFF_MULTIPLIER, BACKOFF_CAP);
}

// ---------------------------------------------------------------------------
// Main poll loop
// ---------------------------------------------------------------------------
async function pollOnce() {
  if (!running) return;

  const mainUrl = `http://localhost:${config.serverPort}/api/ping`;
  const ok = await ping(mainUrl);

  if (ok) {
    if (consecutiveFailures > 0) {
      await log("info", `Server recovered (was at ${consecutiveFailures} consecutive failure(s))`);
    }
    consecutiveFailures = 0;
    currentBackoff = BACKOFF_INITIAL;
  } else {
    consecutiveFailures++;
    await log("warn", `Health check failed (${consecutiveFailures}/${config.maxFailures})`, { url: mainUrl });

    if (consecutiveFailures >= config.maxFailures) {
      await log("error", `Server unreachable after ${consecutiveFailures} consecutive failures -- triggering restart`);
      consecutiveFailures = 0; // reset so we don't re-trigger while restarting
      await handleRestart();
    }
  }

  // Check additional servers (health-only, no restart)
  for (const server of config.additionalServers) {
    if (!running) break;
    const serverOk = await ping(server.url);
    const level = serverOk ? "info" : "warn";
    await log(level, `[additional] ${server.name}: ${serverOk ? "healthy" : "unreachable"}`, {
      url: server.url,
      healthy: serverOk,
    });
  }
}

function scheduleNextPoll() {
  if (!running) return;
  mainPollTimer = setTimeout(async () => {
    try {
      await pollOnce();
    } catch (err) {
      // Never let an unhandled error crash the watchdog
      await log("error", `Unexpected error in poll loop: ${err.message}`);
    }
    scheduleNextPoll();
  }, config.pollInterval);
}

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------
function shutdown(signal) {
  if (!running) return; // already shutting down
  running = false;

  if (mainPollTimer) {
    clearTimeout(mainPollTimer);
    mainPollTimer = null;
  }

  // Fire-and-forget log, then exit
  log("info", `Received ${signal}, shutting down watchdog`).finally(() => {
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------
async function main() {
  try {
    await ensureLogDir();
    await loadConfig();
    await log("info", "Watchdog supervisor started", {
      pid: process.pid,
      serverPort: config.serverPort,
      pollInterval: config.pollInterval,
      maxFailures: config.maxFailures,
      maxRestartsPerHour: config.maxRestartsPerHour,
    });

    // Run the first poll immediately, then schedule subsequent polls
    try {
      await pollOnce();
    } catch (err) {
      await log("error", `Unexpected error in initial poll: ${err.message}`);
    }
    scheduleNextPoll();
  } catch (err) {
    process.stderr.write(`[watchdog FATAL] Failed to start: ${err.message}\n`);
    process.exit(1);
  }
}

main();
