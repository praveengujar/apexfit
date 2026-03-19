/**
 * Pure utility functions for the Workforce frontend.
 */

// Strip ANSI escape codes from raw terminal output
const ANSI_RE = /\x1b\[[0-9;]*[A-Za-z]/g;

/**
 * Extract meaningful output from Claude CLI raw output.
 * Strips ANSI codes, then looks for "Result:" prefix or falls back to last paragraph.
 */
export function extractTaskOutput(rawOutput) {
  if (!rawOutput) return '';
  const clean = rawOutput.replace(ANSI_RE, '').trim();

  // Look for an explicit "Result:" line
  const resultIdx = clean.indexOf('Result:');
  if (resultIdx !== -1) {
    return clean.slice(resultIdx + 'Result:'.length).trim();
  }

  // Fall back to last non-empty paragraph
  const paragraphs = clean.split(/\n\s*\n/).filter((p) => p.trim());
  return paragraphs.length > 0 ? paragraphs[paragraphs.length - 1].trim() : clean;
}

/**
 * Find a session-ID (UUID-like pattern) inside raw output.
 */
export function extractSessionId(rawOutput) {
  if (!rawOutput) return null;
  const match = rawOutput.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
  );
  return match ? match[0] : null;
}

/**
 * Return a diagnostic object based on output content and exit code.
 * @returns {{ category: 'success'|'failure'|'error', reason: string }}
 */
export function diagnoseOutput(output, exitCode) {
  if (exitCode === 0) {
    return { category: 'success', reason: 'Task completed successfully' };
  }

  const lower = (output || '').toLowerCase();

  if (lower.includes('error')) {
    // Try to pull a one-liner from the output
    const errorLine = (output || '')
      .split('\n')
      .find((l) => /error/i.test(l));
    return {
      category: 'failure',
      reason: errorLine ? errorLine.trim() : 'Task failed with an error',
    };
  }

  if (exitCode !== undefined && exitCode !== null) {
    return {
      category: 'error',
      reason: `Process exited with code ${exitCode}`,
    };
  }

  return { category: 'error', reason: 'Unknown failure' };
}

/**
 * Format a date string as a human-friendly relative time.
 * "2m ago", "1h ago", "3d ago"
 */
export function formatTimeAgo(dateString) {
  if (!dateString) return '';
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffSec = Math.max(0, Math.floor((now - then) / 1000));

  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

/**
 * Format a dollar amount for display.
 */
export function formatCost(dollars) {
  if (dollars == null || isNaN(dollars)) return '$0.00';
  return `$${Number(dollars).toFixed(2)}`;
}

/**
 * Map task status to a CSS color value.
 */
export function statusColor(status) {
  const colors = {
    pending: '#818cf8',
    running: '#38bdf8',
    done: '#4ade80',
    failed: '#f87171',
    archived: '#6b7280',
    review: '#f472b6',
    paused: '#fbbf24',
  };
  return colors[status] || '#8b9dc3';
}

/**
 * Map task status to an emoji icon.
 */
export function statusIcon(status) {
  const icons = {
    pending: '\u23f3',   // hourglass
    running: '\u25b6\ufe0f',   // play
    done: '\u2705',      // check
    failed: '\u274c',    // cross
    archived: '\ud83d\udce6', // package
    review: '\ud83d\udd0d',  // magnifying glass
    paused: '\u23f8\ufe0f',  // pause button
  };
  return icons[status] || '\u2753';
}
