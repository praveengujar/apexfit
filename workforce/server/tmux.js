import { execFileSync, execFile } from 'node:child_process';

let _tmuxAvailable = null;

/**
 * Check if tmux is installed. Caches result.
 */
export function isTmuxAvailable() {
  if (_tmuxAvailable !== null) return _tmuxAvailable;
  try {
    execFileSync('tmux', ['-V'], { stdio: 'pipe' });
    _tmuxAvailable = true;
  } catch {
    _tmuxAvailable = false;
  }
  return _tmuxAvailable;
}

/**
 * Create a new detached tmux session running a command.
 * @param {string} name - session name (e.g. 'wf-abc123')
 * @param {string} command - full shell command to run
 * @param {string} cwd - working directory
 * @param {object} env - environment variables (merged with process.env)
 */
export function createSession(name, command, cwd, env = {}) {
  // Use tmux new-session with shell command
  // The command runs inside the tmux session
  const mergedEnv = { ...process.env, ...env };

  // Build env export prefix for the command
  const envPrefix = Object.entries(env)
    .map(([k, v]) => `export ${k}=${JSON.stringify(v)}`)
    .join('; ');

  const fullCommand = envPrefix ? `${envPrefix}; ${command}` : command;

  execFileSync('tmux', [
    'new-session', '-d',
    '-s', name,
    '-c', cwd,
    fullCommand,
  ], { stdio: 'pipe', env: mergedEnv });
}

/**
 * Send keystrokes to a tmux session (simulates typing + Enter).
 * @param {string} name - session name
 * @param {string} text - text to type
 * @param {boolean} pressEnter - whether to press Enter after (default true)
 */
export function sendKeys(name, text, pressEnter = true) {
  const args = ['send-keys', '-t', name, text];
  if (pressEnter) args.push('Enter');
  execFileSync('tmux', args, { stdio: 'pipe' });
}

/**
 * Capture current visible content of a tmux pane.
 * @param {string} name - session name
 * @param {number} historyLines - number of history lines to capture (default 2000)
 * @returns {string} captured pane content
 */
export function capturePane(name, historyLines = 2000) {
  try {
    return execFileSync('tmux', [
      'capture-pane', '-t', name,
      '-p',             // print to stdout
      '-S', `-${historyLines}`, // start from N lines back
    ], { stdio: 'pipe', encoding: 'utf8' });
  } catch {
    return '';
  }
}

/**
 * Kill a tmux session.
 * @param {string} name - session name
 */
export function killSession(name) {
  try {
    execFileSync('tmux', ['kill-session', '-t', name], { stdio: 'pipe' });
  } catch {
    // Session may already be dead
  }
}

/**
 * List all tmux sessions matching a prefix.
 * @param {string} prefix - filter sessions starting with this prefix
 * @returns {string[]} session names
 */
export function listSessions(prefix = '') {
  try {
    const output = execFileSync('tmux', [
      'list-sessions', '-F', '#{session_name}',
    ], { stdio: 'pipe', encoding: 'utf8' });

    const sessions = output.trim().split('\n').filter(Boolean);
    return prefix ? sessions.filter(s => s.startsWith(prefix)) : sessions;
  } catch {
    return [];
  }
}

/**
 * Check if a tmux session exists.
 * @param {string} name - session name
 * @returns {boolean}
 */
export function hasSession(name) {
  try {
    execFileSync('tmux', ['has-session', '-t', name], { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the PID of the process running inside a tmux session.
 * @param {string} name - session name
 * @returns {number|null} PID or null
 */
export function getSessionPid(name) {
  try {
    const output = execFileSync('tmux', [
      'list-panes', '-t', name,
      '-F', '#{pane_pid}',
    ], { stdio: 'pipe', encoding: 'utf8' });

    const pid = parseInt(output.trim(), 10);
    return isNaN(pid) ? null : pid;
  } catch {
    return null;
  }
}

/**
 * Check if the process inside a tmux session is still running.
 * @param {string} name - session name
 * @returns {boolean}
 */
export function isSessionAlive(name) {
  if (!hasSession(name)) return false;
  const pid = getSessionPid(name);
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
