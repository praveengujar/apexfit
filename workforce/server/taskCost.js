/**
 * Static cost estimation with caching.
 *
 * Wraps costModel.js tier classification and adds task-specific overhead
 * adjustments for caching and retries.
 */

import { classifyTier, estimateCost as baseEstimate } from './costModel.js';

const CACHE_OVERHEAD = 0.10; // 10 % markup
const RETRY_OVERHEAD = 0.05; // 5 % per retry

/** Memoisation cache: "prompt::retryCount" -> result */
const cache = new Map();

/**
 * Estimate the full cost for a task, including overhead adjustments.
 *
 * @param {string} prompt       - The task prompt
 * @param {number} retryCount   - Number of retries already attempted (default 0)
 * @returns {{ tier: string, baseCost: number, adjustments: object, totalCost: number }}
 */
export function estimateTaskCost(prompt, retryCount = 0) {
  const cacheKey = `${prompt}::${retryCount}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const tier = classifyTier(prompt);
  const baseCost = baseEstimate(prompt);

  const adjustments = {};
  let multiplier = 1;

  // Cache overhead: 10 % if the prompt mentions caching
  if (/cache|caching/i.test(prompt)) {
    adjustments.cache_overhead = CACHE_OVERHEAD;
    multiplier += CACHE_OVERHEAD;
  }

  // Retry overhead: 5 % per retry
  if (retryCount > 0) {
    const retryTotal = RETRY_OVERHEAD * retryCount;
    adjustments.retry_overhead = retryTotal;
    multiplier += retryTotal;
  }

  const totalCost = Math.round(baseCost * multiplier * 100) / 100;

  const result = { tier, baseCost, adjustments, totalCost };
  cache.set(cacheKey, result);
  return result;
}
