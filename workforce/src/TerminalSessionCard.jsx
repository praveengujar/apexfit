import React, { useState, useCallback, useMemo } from 'react';
import SuggestedReplies from './SuggestedReplies.jsx';
import { formatTimeAgo } from './utils.js';

const styles = {
  card: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  sessionId: {
    fontSize: '13px',
    fontFamily: 'monospace',
    color: 'var(--text)',
    background: 'var(--surface2)',
    padding: '3px 8px',
    borderRadius: '6px',
  },
  statusRow: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '3px 10px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  meta: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  replySection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  replyRow: {
    display: 'flex',
    gap: '8px',
  },
  input: {
    flex: 1,
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    color: 'var(--text)',
    padding: '8px 12px',
    fontSize: '14px',
    outline: 'none',
  },
  btn: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnPrimary: {
    background: 'var(--accent)',
    color: '#fff',
  },
  outputToggle: {
    background: 'none',
    border: 'none',
    color: 'var(--accent)',
    fontSize: '12px',
    cursor: 'pointer',
    padding: 0,
    textAlign: 'left',
  },
  outputBox: {
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '10px 12px',
    fontFamily: 'monospace',
    fontSize: '12px',
    color: 'var(--text)',
    maxHeight: '200px',
    overflowY: 'auto',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
    lineHeight: 1.5,
  },
};

const STATUS_STYLES = {
  active: { background: 'rgba(74, 222, 128, 0.15)', color: 'var(--green)' },
  waiting: { background: 'rgba(129, 140, 248, 0.15)', color: 'var(--accent)' },
  stuck: { background: 'rgba(251, 191, 36, 0.15)', color: 'var(--amber)' },
};

const STUCK_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

export default function TerminalSessionCard({ session }) {
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [showOutput, setShowOutput] = useState(false);
  const [error, setError] = useState(null);

  const isStuck = useMemo(() => {
    if (!session?.lastActivity) return false;
    return Date.now() - new Date(session.lastActivity).getTime() > STUCK_THRESHOLD_MS;
  }, [session?.lastActivity]);

  const effectiveStatus = isStuck && session?.status !== 'active' ? 'stuck' : (session?.status || 'active');
  const showReply = effectiveStatus === 'waiting' || effectiveStatus === 'stuck';

  const handleReply = useCallback(async () => {
    if (!replyText.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${session.id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: replyText.trim() }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      setReplyText('');
    } catch (err) {
      setError(`Reply failed: ${err.message}`);
    } finally {
      setSending(false);
    }
  }, [replyText, sending, session?.id]);

  const handleSuggestionSelect = useCallback((text) => {
    setReplyText(text);
  }, []);

  const outputLines = useMemo(() => {
    if (!session?.output) return '';
    const lines = session.output.split('\n');
    return lines.slice(-50).join('\n');
  }, [session?.output]);

  if (!session) return null;

  const statusStyle = STATUS_STYLES[effectiveStatus] || STATUS_STYLES.active;

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <span style={styles.sessionId}>{session.id}</span>
        <div style={styles.statusRow}>
          <span style={{ ...styles.badge, ...statusStyle }}>
            {effectiveStatus}
          </span>
        </div>
      </div>

      <div style={styles.meta}>
        {session.project && <span>Project: {session.project}</span>}
        {session.lastActivity && (
          <span>Last activity: {formatTimeAgo(session.lastActivity)}</span>
        )}
      </div>

      {showReply && (
        <div style={styles.replySection}>
          <SuggestedReplies
            sessionId={session.id}
            context={outputLines}
            onSelect={handleSuggestionSelect}
          />

          <div style={styles.replyRow}>
            <input
              style={styles.input}
              placeholder="Type a reply..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleReply();
              }}
              disabled={sending}
            />
            <button
              style={{
                ...styles.btn,
                ...styles.btnPrimary,
                opacity: (!replyText.trim() || sending) ? 0.5 : 1,
              }}
              onClick={handleReply}
              disabled={!replyText.trim() || sending}
            >
              {sending ? 'Sending...' : 'Reply'}
            </button>
          </div>

          {error && (
            <div style={{ color: 'var(--red)', fontSize: '12px' }}>{error}</div>
          )}
        </div>
      )}

      {/* View Output toggle */}
      <div>
        <button
          style={styles.outputToggle}
          onClick={() => setShowOutput(!showOutput)}
        >
          {showOutput ? 'Hide Output' : 'View Output'}
        </button>
        {showOutput && (
          <div style={{ ...styles.outputBox, marginTop: '8px' }}>
            {outputLines || 'No output available.'}
          </div>
        )}
      </div>
    </div>
  );
}
