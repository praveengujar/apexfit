/**
 * Client-side token cost calculation.
 * Pricing per 1M tokens for Anthropic models.
 */

export const PRICING = {
  haiku: { input: 0.25, output: 1.25 },
  sonnet: { input: 3.0, output: 15.0 },
  opus: { input: 15.0, output: 75.0 },
};

/**
 * Calculate the dollar cost for a given model and token counts.
 * @param {string} model - One of 'haiku', 'sonnet', 'opus'
 * @param {number} inputTokens - Number of input tokens
 * @param {number} outputTokens - Number of output tokens
 * @returns {number} Cost in dollars
 */
export function calculateCost(model, inputTokens, outputTokens) {
  const tier = PRICING[model];
  if (!tier) return 0;
  const inputCost = (inputTokens / 1_000_000) * tier.input;
  const outputCost = (outputTokens / 1_000_000) * tier.output;
  return inputCost + outputCost;
}
