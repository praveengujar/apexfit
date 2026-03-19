/**
 * Frontend error capture SDK.
 * Captures window.onerror and unhandledrejection events,
 * batches them, and ships to POST /api/logs every 5 seconds.
 */

const MAX_QUEUE = 50;
let queue = [];
let flushTimer = null;

function enqueue(entry) {
  if (queue.length >= MAX_QUEUE) {
    queue.shift(); // drop oldest to stay within limit
  }
  queue.push(entry);
}

function flush() {
  if (queue.length === 0) return;

  const batch = queue.splice(0, queue.length);

  fetch('/api/logs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(batch),
  }).catch(() => {
    // Re-queue on network failure (up to limit)
    batch.forEach((entry) => enqueue(entry));
  });
}

/**
 * Initialize global error listeners and start the flush interval.
 * Call once at app startup (main.jsx).
 */
export function initErrorCapture() {
  // Capture synchronous errors
  window.onerror = (message, source, lineno, colno, error) => {
    enqueue({
      level: 'error',
      message: String(message),
      stack: error?.stack || `${source}:${lineno}:${colno}`,
      timestamp: new Date().toISOString(),
      url: window.location.href,
    });
  };

  // Capture unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    enqueue({
      level: 'error',
      message: reason?.message || String(reason),
      stack: reason?.stack || '',
      timestamp: new Date().toISOString(),
      url: window.location.href,
    });
  });

  // Flush batch every 5 seconds
  flushTimer = setInterval(flush, 5000);

  // Flush on page unload so we don't lose trailing errors
  window.addEventListener('beforeunload', flush);
}
