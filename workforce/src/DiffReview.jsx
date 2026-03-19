import React, { useState, useEffect, useCallback } from 'react';

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: '24px',
  },
  container: {
    background: 'var(--bg, #0a0e1a)',
    border: '1px solid var(--border, #1e3a5f)',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '960px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '16px 20px',
    borderBottom: '1px solid var(--border, #1e3a5f)',
    background: 'var(--surface, #111827)',
    gap: '12px',
  },
  headerLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: '16px',
    fontWeight: 700,
    color: 'var(--text, #e2e8f0)',
    margin: 0,
  },
  prompt: {
    fontSize: '13px',
    color: 'var(--text-muted, #8b9dc3)',
    lineHeight: 1.4,
    margin: 0,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted, #8b9dc3)',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '6px',
    lineHeight: 1,
    flexShrink: 0,
  },
  statsBar: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
    padding: '10px 20px',
    background: 'var(--surface2, #1a2236)',
    borderBottom: '1px solid var(--border, #1e3a5f)',
    fontSize: '13px',
    color: 'var(--text-muted, #8b9dc3)',
    flexWrap: 'wrap',
  },
  statItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  additions: {
    color: 'var(--green, #4ade80)',
    fontWeight: 600,
  },
  deletions: {
    color: 'var(--red, #f87171)',
    fontWeight: 600,
  },
  body: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
    minHeight: 0,
  },
  fileList: {
    width: '220px',
    flexShrink: 0,
    borderRight: '1px solid var(--border, #1e3a5f)',
    overflowY: 'auto',
    background: 'var(--surface, #111827)',
    padding: '8px 0',
  },
  fileListTitle: {
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--text-muted, #8b9dc3)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    padding: '6px 14px',
    margin: 0,
  },
  fileItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 14px',
    fontSize: '12px',
    color: 'var(--text, #e2e8f0)',
    cursor: 'default',
    fontFamily: 'monospace',
    wordBreak: 'break-all',
    lineHeight: 1.3,
  },
  fileDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: 'var(--accent, #818cf8)',
    flexShrink: 0,
  },
  diffArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '0',
    minWidth: 0,
  },
  diffPre: {
    margin: 0,
    padding: '12px 16px',
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
    fontSize: '12px',
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
    color: 'var(--text, #e2e8f0)',
  },
  diffLineAdd: {
    background: 'rgba(74, 222, 128, 0.12)',
    color: 'var(--green, #4ade80)',
    display: 'block',
    padding: '0 8px',
    margin: '0 -16px',
  },
  diffLineDel: {
    background: 'rgba(248, 113, 113, 0.12)',
    color: 'var(--red, #f87171)',
    display: 'block',
    padding: '0 8px',
    margin: '0 -16px',
  },
  diffLineHunk: {
    color: 'var(--accent2, #38bdf8)',
    display: 'block',
    padding: '0 8px',
    margin: '0 -16px',
  },
  diffLineHeader: {
    fontWeight: 700,
    color: 'var(--text, #e2e8f0)',
    display: 'block',
    padding: '0 8px',
    margin: '0 -16px',
  },
  diffLineNormal: {
    display: 'block',
    padding: '0 8px',
    margin: '0 -16px',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    padding: '14px 20px',
    borderTop: '1px solid var(--border, #1e3a5f)',
    background: 'var(--surface, #111827)',
  },
  btn: {
    padding: '9px 20px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
  approveBtn: {
    background: 'var(--green, #4ade80)',
    color: '#000',
  },
  rejectBtn: {
    background: 'var(--red, #f87171)',
    color: '#000',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    gap: '12px',
    flex: 1,
  },
  spinner: {
    width: '28px',
    height: '28px',
    border: '3px solid var(--border, #1e3a5f)',
    borderTopColor: 'var(--accent, #818cf8)',
    borderRadius: '50%',
    animation: 'diffSpin 0.8s linear infinite',
  },
  loadingText: {
    fontSize: '14px',
    color: 'var(--text-muted, #8b9dc3)',
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    gap: '12px',
    flex: 1,
  },
  errorIcon: {
    fontSize: '32px',
    color: 'var(--red, #f87171)',
  },
  errorText: {
    fontSize: '14px',
    color: 'var(--red, #f87171)',
    textAlign: 'center',
  },
  retryBtn: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid var(--border, #1e3a5f)',
    background: 'var(--surface2, #1a2236)',
    color: 'var(--text, #e2e8f0)',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '4px',
  },
};

// Inject keyframes for spinner
const spinnerKeyframes = `@keyframes diffSpin { to { transform: rotate(360deg); } }`;

function classifyDiffLine(line) {
  if (line.startsWith('diff --git') || line.startsWith('---') || line.startsWith('+++')) {
    return 'header';
  }
  if (line.startsWith('@@')) {
    return 'hunk';
  }
  if (line.startsWith('+')) {
    return 'add';
  }
  if (line.startsWith('-')) {
    return 'del';
  }
  return 'normal';
}

const lineStyleMap = {
  add: styles.diffLineAdd,
  del: styles.diffLineDel,
  hunk: styles.diffLineHunk,
  header: styles.diffLineHeader,
  normal: styles.diffLineNormal,
};

export default function DiffReview({ task, onApprove, onReject, onClose }) {
  const [diffData, setDiffData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchDiff = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${task.id}/diff`);
      if (!res.ok) {
        throw new Error(`Failed to load diff (${res.status})`);
      }
      const data = await res.json();
      setDiffData(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch diff');
    } finally {
      setLoading(false);
    }
  }, [task.id]);

  useEffect(() => {
    fetchDiff();
  }, [fetchDiff]);

  const handleApprove = useCallback(async () => {
    setActionLoading('approve');
    try {
      await fetch(`/api/tasks/${task.id}/approve`, { method: 'POST' });
      onApprove(task.id);
    } catch {
      setError('Failed to approve task');
    } finally {
      setActionLoading(null);
    }
  }, [task.id, onApprove]);

  const handleReject = useCallback(async () => {
    setActionLoading('reject');
    try {
      await fetch(`/api/tasks/${task.id}/reject`, { method: 'POST' });
      onReject(task.id);
    } catch {
      setError('Failed to reject task');
    } finally {
      setActionLoading(null);
    }
  }, [task.id, onReject]);

  const renderDiffLines = useCallback(() => {
    if (!diffData?.diff) return null;
    const lines = diffData.diff.split('\n');
    return lines.map((line, i) => {
      const type = classifyDiffLine(line);
      return (
        <span key={i} style={lineStyleMap[type]}>
          {line || '\n'}
        </span>
      );
    });
  }, [diffData]);

  return (
    <>
      <style>{spinnerKeyframes}</style>
      <div style={styles.overlay} onClick={onClose}>
        <div style={styles.container} onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div style={styles.header}>
            <div style={styles.headerLeft}>
              <h3 style={styles.title}>Review Changes</h3>
              {task.prompt && (
                <p style={styles.prompt}>{task.prompt}</p>
              )}
            </div>
            <button
              style={styles.closeBtn}
              onClick={onClose}
              title="Close"
            >
              ✕
            </button>
          </div>

          {/* Loading state */}
          {loading && (
            <div style={styles.loadingContainer}>
              <div style={styles.spinner} />
              <span style={styles.loadingText}>Loading diff...</span>
            </div>
          )}

          {/* Error state */}
          {!loading && error && !diffData && (
            <div style={styles.errorContainer}>
              <span style={styles.errorIcon}>⚠</span>
              <span style={styles.errorText}>{error}</span>
              <button style={styles.retryBtn} onClick={fetchDiff}>
                Retry
              </button>
            </div>
          )}

          {/* Diff content */}
          {!loading && diffData && (
            <>
              {/* Stats bar */}
              <div style={styles.statsBar}>
                <span style={styles.statItem}>
                  {diffData.files?.length || 0} file{(diffData.files?.length || 0) !== 1 ? 's' : ''} changed
                </span>
                <span style={{ ...styles.statItem, ...styles.additions }}>
                  +{diffData.additions ?? 0} additions
                </span>
                <span style={{ ...styles.statItem, ...styles.deletions }}>
                  −{diffData.deletions ?? 0} deletions
                </span>
              </div>

              <div style={styles.body}>
                {/* File list sidebar */}
                <div style={styles.fileList}>
                  <p style={styles.fileListTitle}>Changed Files</p>
                  {diffData.files?.map((file, i) => (
                    <div key={i} style={styles.fileItem}>
                      <span style={styles.fileDot} />
                      <span>{file}</span>
                    </div>
                  ))}
                </div>

                {/* Diff view */}
                <div style={styles.diffArea}>
                  <pre style={styles.diffPre}>
                    {renderDiffLines()}
                  </pre>
                </div>
              </div>

              {/* Action error banner */}
              {error && (
                <div style={{ padding: '8px 20px', background: 'rgba(248,113,113,0.1)', color: 'var(--red, #f87171)', fontSize: '13px' }}>
                  {error}
                </div>
              )}

              {/* Footer actions */}
              <div style={styles.footer}>
                <button
                  style={{ ...styles.btn, ...styles.rejectBtn, opacity: actionLoading ? 0.6 : 1 }}
                  onClick={handleReject}
                  disabled={!!actionLoading}
                >
                  {actionLoading === 'reject' ? 'Rejecting...' : 'Reject'}
                </button>
                <button
                  style={{ ...styles.btn, ...styles.approveBtn, opacity: actionLoading ? 0.6 : 1 }}
                  onClick={handleApprove}
                  disabled={!!actionLoading}
                >
                  {actionLoading === 'approve' ? 'Merging...' : 'Approve & Merge'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
