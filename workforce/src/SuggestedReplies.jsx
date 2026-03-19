import React, { useState, useEffect } from 'react';
import { suggestReplies } from './services/aiSuggestionService.js';

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  btnGroup: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
  },
  btn: {
    padding: '6px 12px',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    background: 'var(--surface2)',
    color: 'var(--text)',
    fontSize: '12px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'border-color 0.15s, background 0.15s',
    maxWidth: '280px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  loading: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    fontStyle: 'italic',
  },
  error: {
    fontSize: '12px',
    color: 'var(--red)',
  },
};

export default function SuggestedReplies({ sessionId, context, onSelect }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    suggestReplies(sessionId, context)
      .then((data) => {
        if (!cancelled) {
          setSuggestions(data.suggestions || []);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [sessionId, context]);

  if (loading) {
    return <div style={styles.loading}>Generating suggestions...</div>;
  }

  if (error) {
    return <div style={styles.error}>Could not load suggestions</div>;
  }

  if (!suggestions.length) return null;

  return (
    <div style={styles.container}>
      <div style={styles.label}>Suggested replies</div>
      <div style={styles.btnGroup}>
        {suggestions.map((text, i) => (
          <button
            key={i}
            style={styles.btn}
            onClick={() => onSelect?.(text)}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent)';
              e.currentTarget.style.background = 'var(--surface)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.background = 'var(--surface2)';
            }}
            title={text}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}
