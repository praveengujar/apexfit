import React, { useState, useCallback } from 'react';
import { statusColor, statusIcon, formatTimeAgo, formatCost } from './utils.js';

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
  },
  projectName: {
    fontSize: '16px',
    fontWeight: 700,
    color: 'var(--text)',
  },
  taskCount: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    background: 'var(--surface2)',
    padding: '3px 10px',
    borderRadius: '12px',
  },
  progressBar: {
    height: '8px',
    borderRadius: '4px',
    background: 'var(--surface2)',
    overflow: 'hidden',
    display: 'flex',
  },
  progressSegment: {
    height: '100%',
    transition: 'width 0.3s ease',
  },
  legend: {
    display: 'flex',
    gap: '12px',
    fontSize: '11px',
    color: 'var(--text-muted)',
    flexWrap: 'wrap',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  legendDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  filterBar: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
  },
  filterBtn: {
    padding: '4px 10px',
    borderRadius: '14px',
    border: '1px solid var(--border)',
    background: 'transparent',
    color: 'var(--text-muted)',
    fontSize: '11px',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  filterBtnActive: {
    background: 'var(--accent)',
    color: '#fff',
    borderColor: 'var(--accent)',
  },
  taskList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    maxHeight: '300px',
    overflowY: 'auto',
  },
  taskRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 10px',
    background: 'var(--surface2)',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '10px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    flexShrink: 0,
  },
  taskPrompt: {
    flex: 1,
    fontSize: '12px',
    color: 'var(--text)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    minWidth: 0,
  },
  taskMeta: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    flexShrink: 0,
  },
  btn: {
    padding: '6px 14px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  btnDanger: {
    background: 'transparent',
    color: 'var(--red)',
    border: '1px solid var(--red)',
  },
  emptyState: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    textAlign: 'center',
    padding: '16px',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
};

const STATUS_ORDER = ['done', 'running', 'pending', 'failed'];
const STATUS_BAR_COLORS = {
  done: 'var(--green)',
  running: 'var(--accent2)',
  pending: 'var(--accent)',
  failed: 'var(--red)',
};
const FILTERS = ['all', 'pending', 'running', 'done', 'failed'];

export default function ProjectCard({ project, tasks = [], onSelectTask }) {
  const [filter, setFilter] = useState('all');
  const [cancelling, setCancelling] = useState(false);

  const projectName = typeof project === 'string' ? project : project?.name || 'Unknown';
  const projectTasks = tasks.filter((t) => t.project === projectName);
  const total = projectTasks.length;

  const counts = {};
  for (const s of STATUS_ORDER) {
    counts[s] = projectTasks.filter((t) => t.status === s).length;
  }

  const filteredTasks = filter === 'all'
    ? projectTasks
    : projectTasks.filter((t) => t.status === filter);

  const handleCancelAll = useCallback(async () => {
    setCancelling(true);
    try {
      await fetch(`/api/projects/${encodeURIComponent(projectName)}/done`, {
        method: 'POST',
      });
    } catch (err) {
      console.error('Cancel all failed:', err);
    } finally {
      setCancelling(false);
    }
  }, [projectName]);

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <span style={styles.projectName}>{projectName}</span>
        <span style={styles.taskCount}>{total} task{total !== 1 ? 's' : ''}</span>
      </div>

      {/* Segmented progress bar */}
      {total > 0 && (
        <>
          <div style={styles.progressBar}>
            {STATUS_ORDER.map((s) => {
              const pct = (counts[s] / total) * 100;
              if (pct === 0) return null;
              return (
                <div
                  key={s}
                  style={{
                    ...styles.progressSegment,
                    width: `${pct}%`,
                    background: STATUS_BAR_COLORS[s],
                  }}
                />
              );
            })}
          </div>

          <div style={styles.legend}>
            {STATUS_ORDER.map((s) => (
              counts[s] > 0 && (
                <span key={s} style={styles.legendItem}>
                  <span style={{ ...styles.legendDot, background: STATUS_BAR_COLORS[s] }} />
                  {s} ({counts[s]})
                </span>
              )
            ))}
          </div>
        </>
      )}

      {/* Status filters */}
      <div style={styles.filterBar}>
        {FILTERS.map((s) => (
          <button
            key={s}
            style={{
              ...styles.filterBtn,
              ...(filter === s ? styles.filterBtnActive : {}),
            }}
            onClick={() => setFilter(s)}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Task list */}
      <div style={styles.taskList}>
        {filteredTasks.length === 0 && (
          <div style={styles.emptyState}>No {filter === 'all' ? '' : filter + ' '}tasks</div>
        )}
        {filteredTasks.map((task) => (
          <div
            key={task.id}
            style={styles.taskRow}
            onClick={() => onSelectTask?.(task)}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--border)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface2)'; }}
          >
            <span
              style={{
                ...styles.badge,
                background: `${statusColor(task.status)}20`,
                color: statusColor(task.status),
              }}
            >
              {statusIcon(task.status)} {task.status}
            </span>
            <span style={styles.taskPrompt}>
              {task.prompt?.length > 80 ? task.prompt.slice(0, 80) + '...' : task.prompt}
            </span>
            <span style={styles.taskMeta}>
              {formatTimeAgo(task.createdAt)}
              {task.cost != null ? ` | ${formatCost(task.cost)}` : ''}
            </span>
          </div>
        ))}
      </div>

      {/* Cancel All */}
      {counts.running > 0 && (
        <div style={styles.footer}>
          <button
            style={{ ...styles.btn, ...styles.btnDanger }}
            onClick={handleCancelAll}
            disabled={cancelling}
          >
            {cancelling ? 'Cancelling...' : 'Cancel All'}
          </button>
        </div>
      )}
    </div>
  );
}
