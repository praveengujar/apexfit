/**
 * Local codebase similarity search.
 *
 * Walks JS/JSX/CSS files under a root directory (skipping node_modules, .git,
 * dist, build), extracts search terms from a natural-language query, and
 * returns the top 10 files ranked by term-match count.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const SEARCHABLE_EXTS = new Set(['.js', '.jsx', '.ts', '.tsx', '.css']);

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build']);

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'it', 'this', 'that', 'as', 'be',
  'are', 'was', 'were', 'been', 'has', 'have', 'had', 'do', 'does', 'did',
  'will', 'would', 'could', 'should', 'may', 'might', 'can', 'not', 'no',
  'so', 'if', 'then', 'else', 'when', 'how', 'what', 'where', 'which',
  'who', 'all', 'each', 'every', 'any', 'some', 'my', 'your', 'its',
  'we', 'they', 'i', 'me', 'us', 'he', 'she', 'him', 'her', 'them',
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Recursively collect file paths matching searchable extensions.
 * @param {string} dir
 * @param {string[]} files - accumulator
 * @returns {string[]}
 */
function walkDir(dir, files = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return files;
  }

  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;

    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      walkDir(fullPath, files);
    } else if (entry.isFile() && SEARCHABLE_EXTS.has(extname(entry.name))) {
      files.push(fullPath);
    }
  }
  return files;
}

/**
 * Extract meaningful search terms from a natural-language query.
 * @param {string} query
 * @returns {string[]}
 */
function extractTerms(query) {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z0-9_-]/g, ''))
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

/**
 * Pull a short context snippet around the first match in content.
 * @param {string} content
 * @param {string} term
 * @returns {string}
 */
function extractSnippet(content, term) {
  const idx = content.toLowerCase().indexOf(term);
  if (idx === -1) return '';

  const start = Math.max(0, idx - 40);
  const end = Math.min(content.length, idx + term.length + 60);
  let snippet = content.slice(start, end).replace(/\n/g, ' ').trim();
  if (start > 0) snippet = '...' + snippet;
  if (end < content.length) snippet += '...';
  return snippet;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Search local JS/JSX/CSS files for relevance to a natural-language query.
 *
 * @param {string} query   - Natural-language search query
 * @param {string} rootDir - Root directory to search (default: cwd)
 * @returns {Array<{ file: string, matches: number, snippet: string }>}
 *   Top 10 files sorted by match count descending.
 */
export function searchCode(query, rootDir = process.cwd()) {
  const terms = extractTerms(query);
  if (terms.length === 0) return [];

  const files = walkDir(rootDir);
  const results = [];

  for (const filePath of files) {
    // Skip files larger than 500KB
    try {
      const stat = statSync(filePath);
      if (stat.size > 512_000) continue;
    } catch {
      continue;
    }

    let content;
    try {
      content = readFileSync(filePath, 'utf8');
    } catch {
      continue;
    }

    const lower = content.toLowerCase();
    let matches = 0;
    let firstMatchTerm = '';

    for (const term of terms) {
      // Count all occurrences of this term in the file
      let pos = 0;
      while (true) {
        const idx = lower.indexOf(term, pos);
        if (idx === -1) break;
        matches++;
        if (!firstMatchTerm) firstMatchTerm = term;
        pos = idx + term.length;
      }
    }

    if (matches > 0) {
      results.push({
        file: filePath,
        matches,
        snippet: extractSnippet(content, firstMatchTerm),
      });
    }
  }

  // Sort descending by match count, take top 10
  results.sort((a, b) => b.matches - a.matches);
  return results.slice(0, 10);
}
