import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const PROFILES_PATH = resolve(process.cwd(), 'profiles.json');

let _profiles = null;

const DEFAULT_PROFILES = {
  default: {
    command: 'claude',
    args: ['--print', '--dangerously-skip-permissions'],
    description: 'Claude Code (auto-accept)',
    passPromptVia: 'arg', // 'arg' = -p flag, 'stdin' = pipe to stdin
  },
  interactive: {
    command: 'claude',
    args: [],
    description: 'Claude Code (interactive)',
    passPromptVia: 'none', // user interacts via tmux
  },
};

/**
 * Load profiles from disk. Falls back to defaults.
 */
export function loadProfiles() {
  try {
    if (existsSync(PROFILES_PATH)) {
      const raw = readFileSync(PROFILES_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      _profiles = { ...DEFAULT_PROFILES, ...(parsed.profiles || parsed) };
      console.log(`[profiles] Loaded ${Object.keys(_profiles).length} profiles from ${PROFILES_PATH}`);
    } else {
      _profiles = { ...DEFAULT_PROFILES };
      console.log('[profiles] Using default profiles');
    }
  } catch (err) {
    console.warn('[profiles] Failed to load profiles:', err.message);
    _profiles = { ...DEFAULT_PROFILES };
  }
  return _profiles;
}

/**
 * Get a profile by name. Returns default if not found.
 * @param {string} name
 * @returns {{ command: string, args: string[], description: string, passPromptVia: string }}
 */
export function getProfile(name) {
  if (!_profiles) loadProfiles();
  return _profiles[name] || _profiles.default;
}

/**
 * Get all available profile names and descriptions.
 * @returns {Array<{ name: string, description: string }>}
 */
export function listProfiles() {
  if (!_profiles) loadProfiles();
  return Object.entries(_profiles).map(([name, p]) => ({
    name,
    description: p.description || name,
    command: p.command,
  }));
}
