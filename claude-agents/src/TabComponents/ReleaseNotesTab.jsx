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
  releaseList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  releaseCard: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    overflow: 'hidden',
  },
  releaseHeader: {
    padding: '14px 16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  releaseLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  version: {
    fontSize: '15px',
    fontWeight: 700,
    color: 'var(--text)',
  },
  date: {
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
  changeCount: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    background: 'var(--surface2)',
    padding: '2px 8px',
    borderRadius: '10px',
  },
  chevron: {
    color: 'var(--text-muted)',
    fontSize: '14px',
    transition: 'transform 0.2s',
  },
  changeList: {
    padding: '0 16px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  changeItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    padding: '6px 0',
  },
  changeBadge: {
    padding: '2px 8px',
    borderRadius: '8px',
    fontSize: '10px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    flexShrink: 0,
    minWidth: '70px',
    textAlign: 'center',
  },
  changeText: {
    fontSize: '13px',
    color: 'var(--text)',
    lineHeight: 1.4,
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
  emptyState: {
    textAlign: 'center',
    color: 'var(--text-muted)',
    padding: '40px 20px',
    fontSize: '14px',
  },
};

const CHANGE_TYPE_STYLES = {
  feature: { background: 'rgba(129, 140, 248, 0.15)', color: 'var(--accent)' },
  fix: { background: 'rgba(74, 222, 128, 0.15)', color: 'var(--green)' },
  improvement: { background: 'rgba(56, 189, 248, 0.15)', color: 'var(--accent2)' },
  breaking: { background: 'rgba(248, 113, 113, 0.15)', color: 'var(--red)' },
  docs: { background: 'rgba(139, 157, 195, 0.15)', color: 'var(--text-muted)' },
};

function getChangeStyle(type) {
  return CHANGE_TYPE_STYLES[type?.toLowerCase()] || CHANGE_TYPE_STYLES.improvement;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default function ReleaseNotesTab() {
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(new Set());

  const fetchReleases = useCallback(async () => {
    try {
      const res = await fetch('/api/releases');
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setReleases(Array.isArray(data) ? data : data.releases || []);
      // Auto-expand the first release
      if (data.length > 0 || data.releases?.length > 0) {
        const list = Array.isArray(data) ? data : data.releases || [];
        if (list.length > 0) {
          setExpanded(new Set([list[0].version || list[0].id || 0]));
        }
      }
      setError(null);
    } catch (err) {
      setError(`Failed to load releases: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReleases(); }, [fetchReleases]);

  const toggleExpanded = useCallback((key) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  if (loading) return <div style={styles.loading}>Loading releases...</div>;

  return (
    <div style={styles.container}>
      <div style={styles.title}>Release Notes</div>

      {error && <div style={styles.error}>{error}</div>}

      {releases.length === 0 && !error && (
        <div style={styles.emptyState}>No releases recorded yet.</div>
      )}

      <div style={styles.releaseList}>
        {releases.map((release, idx) => {
          const key = release.version || release.id || idx;
          const isExpanded = expanded.has(key);
          const changes = release.changes || [];

          return (
            <div key={key} style={styles.releaseCard}>
              <div
                style={styles.releaseHeader}
                onClick={() => toggleExpanded(key)}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface2)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={styles.releaseLeft}>
                  <span style={styles.version}>{release.version || `Release ${idx + 1}`}</span>
                  <span style={styles.date}>{formatDate(release.date)}</span>
                  <span style={styles.changeCount}>
                    {changes.length} change{changes.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <span style={{
                  ...styles.chevron,
                  transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                }}>
                  &rsaquo;
                </span>
              </div>

              {isExpanded && changes.length > 0 && (
                <div style={styles.changeList}>
                  {changes.map((change, ci) => {
                    const typeStyle = getChangeStyle(change.type);
                    return (
                      <div key={ci} style={styles.changeItem}>
                        <span style={{ ...styles.changeBadge, ...typeStyle }}>
                          {change.type || 'update'}
                        </span>
                        <span style={styles.changeText}>
                          {change.description || change.text || change.message || ''}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {isExpanded && changes.length === 0 && (
                <div style={{ ...styles.changeList, color: 'var(--text-muted)', fontSize: '13px' }}>
                  No changes recorded.
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
