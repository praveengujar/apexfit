/**
 * Service for AI-powered features.
 * Wraps all AI-related API calls behind a clean interface.
 */

const JSON_HEADERS = { 'Content-Type': 'application/json' };

async function post(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json();
}

/**
 * Refine a task prompt via AI.
 * @param {string} prompt - Raw user prompt
 * @returns {Promise<{ refined: string }>}
 */
export async function refinePrompt(prompt) {
  return post('/api/tasks/refine', { prompt });
}

/**
 * Decompose a prompt into subtasks.
 * @param {string} prompt
 * @returns {Promise<{ subtasks: Array<{ prompt: string, tier: string, estimatedCost: number }> }>}
 */
export async function decomposeTask(prompt) {
  return post('/api/tasks/decompose', { prompt });
}

/**
 * Analyze scope of a prompt.
 * @param {string} prompt
 * @returns {Promise<{ analysis: object }>}
 */
export async function analyzeScope(prompt) {
  return post('/api/tasks/analyze', { prompt });
}

/**
 * Get AI-suggested replies for a waiting session.
 * @param {string} sessionId
 * @param {string} context
 * @returns {Promise<{ suggestions: string[] }>}
 */
export async function suggestReplies(sessionId, context) {
  return post('/api/suggest-replies', { sessionId, context });
}

/**
 * Chat with AI about backlog items.
 * @param {string} message
 * @param {Array} context - Current backlog items for context
 * @returns {Promise<{ reply: string }>}
 */
export async function chatBacklog(message, context) {
  return post('/api/backlog/chat', { message, context });
}
