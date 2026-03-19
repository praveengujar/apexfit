import React, { useState, useCallback } from 'react';
import { formatCost } from './utils.js';

const styles = {
  container: {
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    padding: '16px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  title: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text)',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '0 4px',
    lineHeight: 1,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '12px',
  },
  item: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '10px 12px',
    background: 'var(--surface)',
    borderRadius: '8px',
    border: '1px solid var(--border)',
  },
  checkbox: {
    marginTop: '2px',
    accentColor: 'var(--accent)',
    width: '16px',
    height: '16px',
    cursor: 'pointer',
  },
  itemContent: {
    flex: 1,
    minWidth: 0,
  },
  itemPrompt: {
    color: 'var(--text)',
    fontSize: '13px',
    lineHeight: 1.4,
    marginBottom: '4px',
  },
  itemMeta: {
    display: 'flex',
    gap: '10px',
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
  tierBadge: {
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '10px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  actions: {
    display: 'flex',
    gap: '8px',
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
  btnSecondary: {
    background: 'var(--surface)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
  },
  summary: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    marginBottom: '8px',
  },
};

const tierColors = {
  haiku: 'var(--green)',
  sonnet: 'var(--accent2)',
  opus: 'var(--pink)',
};

export default function TaskDecomposer({ subtasks = [], onLaunch, onClose }) {
  const [selected, setSelected] = useState(() => new Set(subtasks.map((_, i) => i)));

  const toggleItem = useCallback((idx) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      if (prev.size === subtasks.length) return new Set();
      return new Set(subtasks.map((_, i) => i));
    });
  }, [subtasks.length]);

  const handleLaunchAll = useCallback(() => {
    onLaunch?.(subtasks);
  }, [subtasks, onLaunch]);

  const handleLaunchSelected = useCallback(() => {
    const items = subtasks.filter((_, i) => selected.has(i));
    if (items.length > 0) onLaunch?.(items);
  }, [subtasks, selected, onLaunch]);

  if (!subtasks.length) return null;

  const totalCost = subtasks
    .filter((_, i) => selected.has(i))
    .reduce((sum, s) => sum + (s.estimatedCost || 0), 0);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>
          Subtask Breakdown ({subtasks.length} tasks)
        </span>
        <button style={styles.closeBtn} onClick={onClose} title="Close">
          x
        </button>
      </div>

      <div style={styles.summary}>
        {selected.size} of {subtasks.length} selected
        {totalCost > 0 && ` | Est. ${formatCost(totalCost)}`}
        {' | '}
        <span
          style={{ color: 'var(--accent)', cursor: 'pointer' }}
          onClick={toggleAll}
        >
          {selected.size === subtasks.length ? 'Deselect all' : 'Select all'}
        </span>
      </div>

      <div style={styles.list}>
        {subtasks.map((sub, idx) => (
          <div key={idx} style={styles.item}>
            <input
              type="checkbox"
              style={styles.checkbox}
              checked={selected.has(idx)}
              onChange={() => toggleItem(idx)}
            />
            <div style={styles.itemContent}>
              <div style={styles.itemPrompt}>{sub.prompt}</div>
              <div style={styles.itemMeta}>
                {sub.tier && (
                  <span
                    style={{
                      ...styles.tierBadge,
                      background: `${tierColors[sub.tier] || 'var(--text-muted)'}20`,
                      color: tierColors[sub.tier] || 'var(--text-muted)',
                    }}
                  >
                    {sub.tier}
                  </span>
                )}
                {sub.estimatedCost != null && (
                  <span>~{formatCost(sub.estimatedCost)}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={styles.actions}>
        <button
          style={{ ...styles.btn, ...styles.btnPrimary }}
          onClick={handleLaunchAll}
        >
          Launch All ({subtasks.length})
        </button>
        <button
          style={{ ...styles.btn, ...styles.btnSecondary }}
          onClick={handleLaunchSelected}
          disabled={selected.size === 0}
        >
          Launch Selected ({selected.size})
        </button>
      </div>
    </div>
  );
}
