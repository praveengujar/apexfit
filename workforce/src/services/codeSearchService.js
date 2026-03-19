/**
 * Client for code search API.
 * Searches across the codebase via the backend grep/search endpoint.
 */

/**
 * Search code by query string.
 * @param {string} query - Search term or regex pattern
 * @returns {Promise<Array<{ file: string, matches: number, snippet: string }>>}
 */
export async function searchCode(query) {
  const params = new URLSearchParams({ q: query });
  const res = await fetch(`/api/code-search?${params}`);
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json();
}
