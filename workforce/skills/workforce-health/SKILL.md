---
name: workforce-health
description: Show health metrics, cost tracking, and operational insights for the workforce. Use when user asks about agent performance or costs.
---

When the user invokes /workforce-health, display operational health metrics.

## Steps

1. Call `workforce_health_metrics` for performance data
2. Call `workforce_cost_summary` for cost data

## Output Format

### Performance Metrics
Show as a table with target vs actual:

| Metric | Actual | Target | Status |
|--------|--------|--------|--------|
| Success Rate | X% | 85% | pass/warn/fail |
| Failure Rate | X% | <10% | pass/warn/fail |
| One-Shot Rate | X% | 70% | pass/warn/fail |
| Retry Rate | X% | <15% | pass/warn/fail |

### Cost Tracking
- Today: $X.XX
- This week: $X.XX
- This month: $X.XX
- By tier: Simple $X / Medium $X / Complex $X

### Improvement Suggestions
Show any suggestions from the health metrics API.

### Analysis
Provide your own analysis:
- Are costs trending up or stable?
- What's driving failures? (check recent failed tasks)
- Recommendations for improving one-shot rate
