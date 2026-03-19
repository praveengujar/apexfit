import React, { useState, useEffect, useCallback } from 'react';

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    padding: '16px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '8px',
  },
  title: {
    fontSize: '18px',
    fontWeight: 700,
    color: 'var(--text)',
  },
  periodPicker: {
    display: 'flex',
    gap: '4px',
  },
  periodBtn: {
    padding: '6px 14px',
    borderRadius: '20px',
    border: '1px solid var(--border)',
    background: 'transparent',
    color: 'var(--text-muted)',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  periodBtnActive: {
    background: 'var(--accent)',
    color: '#fff',
    borderColor: 'var(--accent)',
  },
  featureList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  featureRow: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  featureName: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text)',
    minWidth: '120px',
  },
  usageBadge: {
    padding: '3px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.5px',
    minWidth: '80px',
    textAlign: 'center',
  },
  barContainer: {
    flex: 1,
    height: '24px',
    background: 'var(--surface2)',
    borderRadius: '6px',
    overflow: 'hidden',
    position: 'relative',
  },
  bar: {
    height: '100%',
    borderRadius: '6px',
    transition: 'width 0.4s ease',
    minWidth: '2px',
  },
  barLabel: {
    position: 'absolute',
    right: '8px',
    top: '50%',
    transform: 'translateY(-50%)',
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--text)',
  },
  chartSection: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '16px',
  },
  chartTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text)',
    marginBottom: '12px',
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

const USAGE_LEVELS = {
  Active: { color: 'var(--green)', bg: 'rgba(74, 222, 128, 0.15)' },
  Occasional: { color: 'var(--amber)', bg: 'rgba(251, 191, 36, 0.15)' },
  Dormant: { color: 'var(--text-muted)', bg: 'rgba(139, 157, 195, 0.15)' },
  Unused: { color: 'var(--red)', bg: 'rgba(248, 113, 113, 0.15)' },
};

const DEFAULT_FEATURES = [
  'Queue', 'Sessions', 'Backlog', 'Projects', 'Health', 'Adoption', 'TestMe', 'Releases',
];

function classifyUsage(visits) {
  if (visits >= 20) return 'Active';
  if (visits >= 5) return 'Occasional';
  if (visits >= 1) return 'Dormant';
  return 'Unused';
}

export default function AdoptionTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('7d');

  const fetchAdoption = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/adoption?period=${period}`);
      if (!res.ok) throw new Error(`${res.status}`);
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(`Failed to load adoption data: ${err.message}`);
      // Fall back to empty feature set
      setData({ features: DEFAULT_FEATURES.map((name) => ({ name, visits: 0 })) });
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { fetchAdoption(); }, [fetchAdoption]);

  if (loading) return <div style={styles.loading}>Loading adoption data...</div>;

  const features = data?.features || DEFAULT_FEATURES.map((name) => ({ name, visits: 0 }));
  const maxVisits = Math.max(1, ...features.map((f) => f.visits || 0));

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>Feature Adoption</span>
        <div style={styles.periodPicker}>
          {['7d', '30d'].map((p) => (
            <button
              key={p}
              style={{
                ...styles.periodBtn,
                ...(period === p ? styles.periodBtnActive : {}),
              }}
              onClick={() => setPeriod(p)}
            >
              {p === '7d' ? 'Last 7 days' : 'Last 30 days'}
            </button>
          ))}
        </div>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {/* Bar chart */}
      <div style={styles.chartSection}>
        <div style={styles.chartTitle}>Visits per Tab</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {features.map((f) => {
            const visits = f.visits || 0;
            const pct = (visits / maxVisits) * 100;
            const level = classifyUsage(visits);
            const levelStyle = USAGE_LEVELS[level];

            return (
              <div key={f.name} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ ...styles.featureName, minWidth: '90px', fontSize: '12px' }}>
                  {f.name}
                </span>
                <div style={styles.barContainer}>
                  <div
                    style={{
                      ...styles.bar,
                      width: `${Math.max(pct, 1)}%`,
                      background: levelStyle.color,
                      opacity: 0.7,
                    }}
                  />
                  <span style={styles.barLabel}>{visits}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Feature list with usage levels */}
      <div style={styles.featureList}>
        {features.map((f) => {
          const visits = f.visits || 0;
          const level = classifyUsage(visits);
          const levelStyle = USAGE_LEVELS[level];

          return (
            <div key={f.name} style={styles.featureRow}>
              <span style={styles.featureName}>{f.name}</span>
              <span
                style={{
                  ...styles.usageBadge,
                  background: levelStyle.bg,
                  color: levelStyle.color,
                }}
              >
                {level}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {visits} visit{visits !== 1 ? 's' : ''}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
