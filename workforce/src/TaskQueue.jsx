import React, { useState, useEffect, useCallback } from 'react';
import { formatTimeAgo, formatCost, statusColor, statusIcon } from './utils.js';
import { refinePrompt, decomposeTask } from './services/aiSuggestionService.js';
import TaskDecomposer from './TaskDecomposer.jsx';

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    padding: '16px',
  },
  inputSection: {
    background: 'var(--surface)',
    borderRadius: '12px',
    border: '1px solid var(--border)',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  textarea: {
    width: '100%',
    minHeight: '80px',
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    color: 'var(--text)',
    padding: '10px 12px',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'vertical',
    outline: 'none',
    boxSizing: 'border-box',
  },
  row: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  select: {
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    color: 'var(--text)',
    padding: '8px 12px',
    fontSize: '14px',
    outline: 'none',
    minWidth: '160px',
  },
  btn: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
  btnPrimary: {
    background: 'var(--accent)',
    color: '#fff',
  },
  btnSecondary: {
    background: 'var(--surface2)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
  },
  btnDanger: {
    background: 'var(--red)',
    color: '#fff',
  },
  btnSmall: {
    padding: '4px 10px',
    fontSize: '12px',
  },
  warning: {
    background: 'rgba(251, 191, 36, 0.1)',
    border: '1px solid var(--amber)',
    borderRadius: '8px',
    padding: '10px 14px',
    color: 'var(--amber)',
    fontSize: '13px',
  },
  filterBar: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
  },
  filterBtn: {
    padding: '6px 14px',
    borderRadius: '20px',
    border: '1px solid var(--border)',
    background: 'transparent',
    color: 'var(--text-muted)',
    fontSize: '12px',
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
    gap: '8px',
  },
  taskCard: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    padding: '12px 16px',
    cursor: 'pointer',
    transition: 'border-color 0.15s',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
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
    whiteSpace: 'nowrap',
  },
  taskInfo: {
    flex: 1,
    minWidth: 0,
  },
  taskPrompt: {
    color: 'var(--text)',
    fontSize: '14px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    marginBottom: '4px',
  },
  taskMeta: {
    color: 'var(--text-muted)',
    fontSize: '12px',
    display: 'flex',
    gap: '12px',
  },
  actions: {
    display: 'flex',
    gap: '6px',
    flexShrink: 0,
  },
  refinedBox: {
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '12px',
    fontSize: '13px',
    color: 'var(--text)',
    whiteSpace: 'pre-wrap',
  },
  label: {
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '4px',
  },
  emptyState: {
    textAlign: 'center',
    color: 'var(--text-muted)',
    padding: '40px 20px',
    fontSize: '14px',
  },
};

const STATUSES = ['all', 'pending', 'running', 'done', 'failed'];

function wordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export default function TaskQueue({ tasks = [], onSelectTask, onRefresh }) {
  const [prompt, setPrompt] = useState('');
  const [project, setProject] = useState('');
  const [projects, setProjects] = useState([]);
  const [filter, setFilter] = useState('all');
  const [submitting, setSubmitting] = useState(false);
  const [refining, setRefining] = useState(false);
  const [refined, setRefined] = useState(null);
  const [decomposing, setDecomposing] = useState(false);
  const [subtasks, setSubtasks] = useState(null);
  const [error, setError] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState('default');
  const [autoMerge, setAutoMerge] = useState(false);

  // Load projects
  useEffect(() => {
    fetch('/api/projects')
      .then((r) => r.ok ? r.json() : [])
      .then((data) => setProjects(Array.isArray(data) ? data : []))
      .catch(() => setProjects([]));
  }, []);

  // Load profiles
  useEffect(() => {
    fetch('/api/profiles')
      .then(r => r.ok ? r.json() : [])
      .then(data => setProfiles(Array.isArray(data) ? data : []))
      .catch(() => setProfiles([]));
  }, []);

  const showWordWarning = wordCount(prompt) > 200;

  const handleSubmit = useCallback(async () => {
    if (!prompt.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          project: project || undefined,
          profile: selectedProfile !== 'default' ? selectedProfile : undefined,
          autoMerge: autoMerge || undefined,
        }),
      });
      if (!res.ok) throw new Error(`Submit failed: ${res.status}`);
      setPrompt('');
      setRefined(null);
      setSubtasks(null);
      onRefresh?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }, [prompt, project, onRefresh]);

  const handleRefine = useCallback(async () => {
    if (!prompt.trim()) return;
    setRefining(true);
    setError(null);
    try {
      const data = await refinePrompt(prompt.trim());
      setRefined(data.refined || data.prompt || JSON.stringify(data));
    } catch (err) {
      setError(`Refine failed: ${err.message}`);
    } finally {
      setRefining(false);
    }
  }, [prompt]);

  const handleDecompose = useCallback(async () => {
    if (!prompt.trim()) return;
    setDecomposing(true);
    setError(null);
    try {
      const data = await decomposeTask(prompt.trim());
      setSubtasks(data.subtasks || []);
    } catch (err) {
      setError(`Decompose failed: ${err.message}`);
    } finally {
      setDecomposing(false);
    }
  }, [prompt]);

  const handleAction = useCallback(async (e, taskId, action) => {
    e.stopPropagation();
    try {
      if (action === 'retry') {
        await fetch(`/api/tasks/${taskId}/retry`, { method: 'POST' });
      } else if (action === 'cancel') {
        await fetch(`/api/tasks/${taskId}/cancel`, { method: 'POST' });
      } else if (action === 'archive') {
        await fetch(`/api/tasks/${taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'archived', archivedAt: new Date().toISOString() }),
        });
      }
      onRefresh?.();
    } catch (err) {
      setError(`Action failed: ${err.message}`);
    }
  }, [onRefresh]);

  const handleDecomposeLaunch = useCallback(async (selectedSubtasks) => {
    try {
      for (const sub of selectedSubtasks) {
        await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: sub.prompt, project: project || undefined }),
        });
      }
      setSubtasks(null);
      onRefresh?.();
    } catch (err) {
      setError(`Launch subtasks failed: ${err.message}`);
    }
  }, [project, onRefresh]);

  const filtered = filter === 'all'
    ? tasks
    : tasks.filter((t) => t.status === filter);

  return (
    <div style={styles.container}>
      {/* Task input section */}
      <div style={styles.inputSection}>
        <textarea
          style={styles.textarea}
          placeholder="Describe the task for the agent..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />

        {showWordWarning && (
          <div style={styles.warning}>
            Prompt exceeds 200 words ({wordCount(prompt)}). Consider decomposing into subtasks for better results.
          </div>
        )}

        <div style={styles.row}>
          <select
            style={styles.select}
            value={project}
            onChange={(e) => setProject(e.target.value)}
          >
            <option value="">No project</option>
            {projects.map((p) => (
              <option key={typeof p === 'string' ? p : p.name} value={typeof p === 'string' ? p : p.name}>
                {typeof p === 'string' ? p : p.name}
              </option>
            ))}
          </select>

          {profiles.length > 0 && (
            <select
              style={styles.select}
              value={selectedProfile}
              onChange={(e) => setSelectedProfile(e.target.value)}
            >
              {profiles.map(p => (
                <option key={p.name} value={p.name}>{p.description || p.name}</option>
              ))}
            </select>
          )}

          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={autoMerge}
              onChange={(e) => setAutoMerge(e.target.checked)}
            />
            Auto-merge
          </label>

          <button
            style={{ ...styles.btn, ...styles.btnPrimary }}
            onClick={handleSubmit}
            disabled={submitting || !prompt.trim()}
          >
            {submitting ? 'Submitting...' : 'Submit Task'}
          </button>

          <button
            style={{ ...styles.btn, ...styles.btnSecondary }}
            onClick={handleRefine}
            disabled={refining || !prompt.trim()}
          >
            {refining ? 'Refining...' : 'Refine'}
          </button>

          <button
            style={{ ...styles.btn, ...styles.btnSecondary }}
            onClick={handleDecompose}
            disabled={decomposing || !prompt.trim()}
          >
            {decomposing ? 'Decomposing...' : 'Decompose'}
          </button>
        </div>

        {error && (
          <div style={{ color: 'var(--red)', fontSize: '13px' }}>{error}</div>
        )}

        {refined && (
          <div>
            <div style={styles.label}>Refined prompt</div>
            <div style={styles.refinedBox}>{refined}</div>
            <div style={{ ...styles.row, marginTop: '8px' }}>
              <button
                style={{ ...styles.btn, ...styles.btnPrimary, ...styles.btnSmall }}
                onClick={() => { setPrompt(refined); setRefined(null); }}
              >
                Use Refined
              </button>
              <button
                style={{ ...styles.btn, ...styles.btnSecondary, ...styles.btnSmall }}
                onClick={() => setRefined(null)}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {subtasks && (
          <TaskDecomposer
            subtasks={subtasks}
            onLaunch={handleDecomposeLaunch}
            onClose={() => setSubtasks(null)}
          />
        )}
      </div>

      {/* Filters */}
      <div style={styles.filterBar}>
        {STATUSES.map((s) => (
          <button
            key={s}
            style={{
              ...styles.filterBtn,
              ...(filter === s ? styles.filterBtnActive : {}),
            }}
            onClick={() => setFilter(s)}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
            {s !== 'all' && (
              <span style={{ marginLeft: '4px', opacity: 0.7 }}>
                ({tasks.filter((t) => t.status === s).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Task list */}
      <div style={styles.taskList}>
        {filtered.length === 0 && (
          <div style={styles.emptyState}>
            {filter === 'all' ? 'No tasks yet. Submit a prompt above.' : `No ${filter} tasks.`}
          </div>
        )}

        {filtered.map((task) => (
          <div
            key={task.id}
            style={styles.taskCard}
            onClick={() => onSelectTask?.(task)}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
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

            <div style={styles.taskInfo}>
              <div style={styles.taskPrompt}>
                {task.prompt?.length > 120 ? task.prompt.slice(0, 120) + '...' : task.prompt}
              </div>
              <div style={styles.taskMeta}>
                {task.project && <span>{task.project}</span>}
                <span>{formatTimeAgo(task.createdAt)}</span>
                {task.cost != null && <span>{formatCost(task.cost)}</span>}
              </div>
            </div>

            <div style={styles.actions}>
              {task.status === 'failed' && (
                <button
                  style={{ ...styles.btn, ...styles.btnSecondary, ...styles.btnSmall }}
                  onClick={(e) => handleAction(e, task.id, 'retry')}
                  title="Retry"
                >
                  Retry
                </button>
              )}
              {task.status === 'running' && (
                <button
                  style={{ ...styles.btn, ...styles.btnDanger, ...styles.btnSmall }}
                  onClick={(e) => handleAction(e, task.id, 'cancel')}
                  title="Cancel"
                >
                  Cancel
                </button>
              )}
              {task.status === 'done' && (
                <button
                  style={{ ...styles.btn, ...styles.btnSecondary, ...styles.btnSmall }}
                  onClick={(e) => handleAction(e, task.id, 'archive')}
                  title="Archive"
                >
                  Archive
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
