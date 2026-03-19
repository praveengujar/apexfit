import React, { useState, useEffect, useCallback } from 'react';

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    padding: '16px',
  },
  title: {
    fontSize: '18px',
    fontWeight: 700,
    color: 'var(--text)',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '12px',
  },
  metricCard: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  metricHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricName: {
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  metricStatus: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
  },
  metricValue: {
    fontSize: '28px',
    fontWeight: 700,
    color: 'var(--text)',
    lineHeight: 1.1,
  },
  metricTarget: {
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  sparkline: {
    width: '100%',
    height: '30px',
  },
  suggestionsSection: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text)',
  },
  suggestion: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '10px 12px',
    background: 'var(--surface2)',
    borderRadius: '8px',
  },
  suggestionDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    marginTop: '4px',
    flexShrink: 0,
  },
  suggestionText: {
    fontSize: '13px',
    color: 'var(--text)',
    lineHeight: 1.4,
  },
  feedbackSection: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '16px',
  },
  feedbackRow: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
  },
  feedbackItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px',
  },
  loading: {
    textAlign: 'center',
    color: 'var(--text-muted)',
    padding: '40px 20px',
    fontSize: '14px',
  },
  error: {
    color: 'var(--red)',
    fontSize: '13px',
  },
};

const DEFAULT_METRICS = [
  { name: 'Done Rate', key: 'doneRate', target: 85, unit: '%', format: (v) => `${v}%` },
  { name: 'Fail Rate', key: 'failRate', target: 10, unit: '%', format: (v) => `${v}%`, invertStatus: true },
  { name: 'Retry Rate', key: 'retryRate', target: 15, unit: '%', format: (v) => `${v}%`, invertStatus: true },
  { name: 'One-Shot Rate', key: 'oneShotRate', target: 70, unit: '%', format: (v) => `${v}%` },
  { name: 'Uptime', key: 'uptime', target: 99, unit: '%', format: (v) => `${v}%` },
];

function getMetricStatus(metric, value) {
  if (value == null) return 'var(--text-muted)';
  if (metric.invertStatus) {
    // Lower is better
    if (value <= metric.target) return 'var(--green)';
    if (value <= metric.target * 1.5) return 'var(--amber)';
    return 'var(--red)';
  }
  // Higher is better
  if (value >= metric.target) return 'var(--green)';
  if (value >= metric.target * 0.8) return 'var(--amber)';
  return 'var(--red)';
}

// Simple SVG sparkline
function Sparkline({ data = [], color = 'var(--accent)' }) {
  if (data.length < 2) {
    return (
      <svg style={styles.sparkline} viewBox="0 0 100 30">
        <line x1="0" y1="15" x2="100" y2="15" stroke="var(--border)" strokeWidth="1" strokeDasharray="4" />
      </svg>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 2;
  const height = 30 - padding * 2;
  const width = 100;
  const step = width / (data.length - 1);

  const points = data.map((v, i) => {
    const x = i * step;
    const y = padding + height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg style={styles.sparkline} viewBox="0 0 100 30" preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function generateSuggestions(metrics) {
  const suggestions = [];

  if (metrics.failRate != null && metrics.failRate > 10) {
    suggestions.push({
      color: 'var(--red)',
      text: `Fail rate is ${metrics.failRate}% (target: <10%). Review recent failures for common error patterns. Consider adding retry logic or improving prompt specificity.`,
    });
  }

  if (metrics.oneShotRate != null && metrics.oneShotRate < 70) {
    suggestions.push({
      color: 'var(--amber)',
      text: `One-shot rate is ${metrics.oneShotRate}% (target: 70%). Tasks often need retries. Improve task prompts with more context and clearer acceptance criteria.`,
    });
  }

  if (metrics.doneRate != null && metrics.doneRate < 85) {
    suggestions.push({
      color: 'var(--amber)',
      text: `Done rate is ${metrics.doneRate}% (target: 85%). Consider decomposing larger tasks and using the refine feature before submission.`,
    });
  }

  if (metrics.retryRate != null && metrics.retryRate > 15) {
    suggestions.push({
      color: 'var(--amber)',
      text: `Retry rate is ${metrics.retryRate}% (target: <15%). High retries waste compute. Check if tasks are failing on environment issues vs. logic errors.`,
    });
  }

  if (metrics.uptime != null && metrics.uptime < 99) {
    suggestions.push({
      color: 'var(--red)',
      text: `Uptime is ${metrics.uptime}% (target: 99%). Check server logs and health endpoints for recurring issues.`,
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      color: 'var(--green)',
      text: 'All metrics are meeting or exceeding targets. System is performing well.',
    });
  }

  return suggestions;
}

export default function HealthTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/health-metrics');
      if (!res.ok) throw new Error(`${res.status}`);
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(`Failed to load health metrics: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHealth(); }, [fetchHealth]);

  if (loading) return <div style={styles.loading}>Loading health metrics...</div>;

  const metrics = data?.metrics || {};
  const trends = data?.trends || {};
  const feedback = data?.feedback || null;
  const suggestions = generateSuggestions(metrics);

  return (
    <div style={styles.container}>
      <div style={styles.title}>Health Dashboard</div>

      {error && <div style={styles.error}>{error}</div>}

      {/* Metrics cards grid */}
      <div style={styles.metricsGrid}>
        {DEFAULT_METRICS.map((m) => {
          const value = metrics[m.key];
          const statusColor = getMetricStatus(m, value);
          const trendData = trends[m.key] || [];

          return (
            <div key={m.key} style={styles.metricCard}>
              <div style={styles.metricHeader}>
                <span style={styles.metricName}>{m.name}</span>
                <div style={{ ...styles.metricStatus, background: statusColor }} />
              </div>
              <div style={{ ...styles.metricValue, color: statusColor }}>
                {value != null ? m.format(value) : '--'}
              </div>
              <div style={styles.metricTarget}>Target: {m.format(m.target)}</div>
              <Sparkline data={trendData} color={statusColor} />
            </div>
          );
        })}
      </div>

      {/* Improvement suggestions */}
      <div style={styles.suggestionsSection}>
        <div style={styles.sectionTitle}>Improvement Suggestions</div>
        {suggestions.map((s, i) => (
          <div key={i} style={styles.suggestion}>
            <div style={{ ...styles.suggestionDot, background: s.color }} />
            <div style={styles.suggestionText}>{s.text}</div>
          </div>
        ))}
      </div>

      {/* Feedback summary */}
      {feedback && (
        <div style={styles.feedbackSection}>
          <div style={{ ...styles.sectionTitle, marginBottom: '8px' }}>Feedback Summary</div>
          <div style={styles.feedbackRow}>
            <div style={styles.feedbackItem}>
              <span style={{ fontSize: '18px' }}>+</span>
              <span style={{ color: 'var(--green)', fontWeight: 600 }}>{feedback.thumbsUp || 0}</span>
            </div>
            <div style={styles.feedbackItem}>
              <span style={{ fontSize: '18px' }}>-</span>
              <span style={{ color: 'var(--red)', fontWeight: 600 }}>{feedback.thumbsDown || 0}</span>
            </div>
            {feedback.total > 0 && (
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {Math.round((feedback.thumbsUp / feedback.total) * 100)}% positive
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
