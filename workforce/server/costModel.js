/**
 * Self-calibrating tier-based cost estimator.
 *
 * Three tiers (simple / medium / complex) classified by prompt regex.
 * Tracks actual costs per tier and recalibrates when the observed median
 * drifts more than 15 % from the current estimate.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const MODEL_PATH = resolve(process.cwd(), 'cost-model.json');
const DRIFT_THRESHOLD = 0.15; // 15 %

// ---- Tier classification regexes ----
const SIMPLE_RE = /fix typo|rename|update comment|bump version|add import/i;
const MEDIUM_RE = /add feature|implement|create component|refactor/i;

const DEFAULT_MODEL = {
  tiers: {
    simple:  { baseCost: 0.05, actuals: [] },
    medium:  { baseCost: 0.25, actuals: [] },
    complex: { baseCost: 0.50, actuals: [] },
  },
  lastCalibrated: null,
};

/** In-memory model state. */
let model = structuredClone(DEFAULT_MODEL);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Return the median of a numeric array (sorted copy). */
function median(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/** Recalibrate a single tier if its median has drifted. */
function calibrateTier(tier) {
  const data = model.tiers[tier];
  if (data.actuals.length < 3) return false; // not enough data

  const med = median(data.actuals);
  const drift = Math.abs(med - data.baseCost) / data.baseCost;

  if (drift > DRIFT_THRESHOLD) {
    const oldCost = data.baseCost;
    data.baseCost = Math.round(med * 100) / 100; // round to cents
    model.lastCalibrated = new Date().toISOString();
    console.log(
      `[costModel] recalibrated ${tier}: $${oldCost.toFixed(2)} -> $${data.baseCost.toFixed(2)} (drift ${(drift * 100).toFixed(1)}%)`,
    );
    return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Classify a prompt into a cost tier.
 * @param {string} prompt
 * @returns {'simple' | 'medium' | 'complex'}
 */
export function classifyTier(prompt) {
  if (SIMPLE_RE.test(prompt)) return 'simple';
  if (MEDIUM_RE.test(prompt)) return 'medium';
  return 'complex';
}

/**
 * Estimate cost in dollars for a given prompt.
 * @param {string} prompt
 * @returns {number}
 */
export function estimateCost(prompt) {
  const tier = classifyTier(prompt);
  return model.tiers[tier].baseCost;
}

/**
 * Record an actual cost observation and trigger recalibration check.
 * @param {string} prompt
 * @param {number} actualCost
 */
export function recordActualCost(prompt, actualCost) {
  const tier = classifyTier(prompt);
  model.tiers[tier].actuals.push(actualCost);
  // Keep sliding window of last 100
  if (model.tiers[tier].actuals.length > 100) {
    model.tiers[tier].actuals = model.tiers[tier].actuals.slice(-100);
  }

  const didCalibrate = calibrateTier(tier);
  if (didCalibrate) {
    saveCostModel();
  }
}

/**
 * Return the current in-memory model state (deep copy).
 * @returns {object}
 */
export function getCostModel() {
  return structuredClone(model);
}

/**
 * Load the cost model from disk. Falls back to defaults if the file is
 * missing or malformed.
 */
export function loadCostModel() {
  try {
    const raw = readFileSync(MODEL_PATH, 'utf8');
    const parsed = JSON.parse(raw);

    // Merge with defaults so new tiers or missing keys don't break things.
    for (const tier of Object.keys(DEFAULT_MODEL.tiers)) {
      if (!parsed.tiers?.[tier]) {
        parsed.tiers ??= {};
        parsed.tiers[tier] = structuredClone(DEFAULT_MODEL.tiers[tier]);
      }
      parsed.tiers[tier].actuals ??= [];
    }
    model = parsed;
    console.log('[costModel] loaded from', MODEL_PATH);
  } catch {
    model = structuredClone(DEFAULT_MODEL);
    console.log('[costModel] no existing model found — using defaults');
  }
}

/**
 * Persist the current model to disk.
 */
export function saveCostModel() {
  try {
    writeFileSync(MODEL_PATH, JSON.stringify(model, null, 2) + '\n', 'utf8');
    console.log('[costModel] saved to', MODEL_PATH);
  } catch (err) {
    console.error('[costModel] save failed:', err.message);
  }
}
