/**
 * In-memory cancellation tokens for running tasks.
 *
 * Each token tracks whether a task has been cancelled and allows
 * registering callbacks that fire on cancellation.
 */

export class CancellationToken {
  /** @type {boolean} */
  #cancelled = false;

  /** @type {Array<() => void>} */
  #callbacks = [];

  get cancelled() {
    return this.#cancelled;
  }

  /** Mark the token as cancelled and invoke all registered callbacks. */
  cancel() {
    if (this.#cancelled) return;
    this.#cancelled = true;
    for (const cb of this.#callbacks) {
      try {
        cb();
      } catch (err) {
        console.error('[CancellationToken] callback error:', err);
      }
    }
    this.#callbacks = [];
  }

  /**
   * Register a callback to run when this token is cancelled.
   * If already cancelled, the callback fires immediately.
   *
   * @param {() => void} callback
   */
  onCancel(callback) {
    if (this.#cancelled) {
      callback();
      return;
    }
    this.#callbacks.push(callback);
  }
}

// ---------------------------------------------------------------------------
// Token store (Map<taskId, CancellationToken>)
// ---------------------------------------------------------------------------
const tokens = new Map();

/**
 * Create and store a cancellation token for a task.
 * If one already exists it is returned as-is (not replaced).
 *
 * @param {string} taskId
 * @returns {CancellationToken}
 */
export function createToken(taskId) {
  if (tokens.has(taskId)) return tokens.get(taskId);
  const token = new CancellationToken();
  tokens.set(taskId, token);
  return token;
}

/**
 * Retrieve an existing token, or undefined.
 *
 * @param {string} taskId
 * @returns {CancellationToken|undefined}
 */
export function getToken(taskId) {
  return tokens.get(taskId);
}

/**
 * Cancel a task's token (if it exists) and remove it from the store.
 *
 * @param {string} taskId
 */
export function cancelTask(taskId) {
  const token = tokens.get(taskId);
  if (token) {
    token.cancel();
    tokens.delete(taskId);
  }
}

/**
 * Remove a token from the store without cancelling it.
 * Useful for normal completion cleanup.
 *
 * @param {string} taskId
 */
export function removeToken(taskId) {
  tokens.delete(taskId);
}
