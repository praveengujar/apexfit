import React, { useState, useEffect, useCallback, useRef } from 'react';

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
  btnRow: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
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
    background: 'var(--surface2)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
  },
  btnSmall: {
    padding: '4px 10px',
    fontSize: '12px',
  },
  btnDanger: {
    background: 'transparent',
    color: 'var(--red)',
    border: '1px solid var(--red)',
  },
  addForm: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  input: {
    width: '100%',
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    color: 'var(--text)',
    padding: '8px 12px',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    minHeight: '60px',
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    color: 'var(--text)',
    padding: '8px 12px',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'vertical',
    outline: 'none',
    boxSizing: 'border-box',
  },
  select: {
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    color: 'var(--text)',
    padding: '8px 12px',
    fontSize: '14px',
    outline: 'none',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  item: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'grab',
    transition: 'border-color 0.15s, background 0.15s',
  },
  itemDragging: {
    opacity: 0.5,
    borderColor: 'var(--accent)',
  },
  dragOver: {
    borderColor: 'var(--accent2)',
    background: 'var(--surface2)',
  },
  itemContent: {
    flex: 1,
    minWidth: 0,
  },
  itemTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text)',
    marginBottom: '2px',
  },
  itemTitleInput: {
    background: 'var(--surface2)',
    border: '1px solid var(--accent)',
    borderRadius: '4px',
    color: 'var(--text)',
    padding: '2px 6px',
    fontSize: '14px',
    fontWeight: 600,
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  itemDesc: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  itemMeta: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    fontSize: '11px',
    color: 'var(--text-muted)',
    marginTop: '4px',
  },
  priorityBadge: {
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.5px',
    flexShrink: 0,
  },
  actions: {
    display: 'flex',
    gap: '6px',
    flexShrink: 0,
  },
  emptyState: {
    textAlign: 'center',
    color: 'var(--text-muted)',
    padding: '40px 20px',
    fontSize: '14px',
  },
  loading: {
    textAlign: 'center',
    color: 'var(--text-muted)',
    padding: '20px',
    fontSize: '14px',
  },
  error: {
    color: 'var(--red)',
    fontSize: '13px',
    padding: '8px 0',
  },
};

const PRIORITY_COLORS = {
  P0: 'var(--red)',
  P1: 'var(--amber)',
  P2: 'var(--green)',
};

function priorityBadgeStyle(priority) {
  const color = PRIORITY_COLORS[priority] || 'var(--text-muted)';
  return {
    ...styles.priorityBadge,
    background: `${color}20`,
    color,
  };
}

export default function BacklogTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPriority, setFormPriority] = useState('P2');
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [scoring, setScoring] = useState(false);
  const [generating, setGenerating] = useState(false);
  const dragItem = useRef(null);
  const dragOver = useRef(null);
  const [dragOverId, setDragOverId] = useState(null);

  const fetchBacklog = useCallback(async () => {
    try {
      const res = await fetch('/api/backlog');
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : data.items || []);
      setError(null);
    } catch (err) {
      setError(`Failed to load backlog: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBacklog(); }, [fetchBacklog]);

  const handleAdd = useCallback(async () => {
    if (!formTitle.trim()) return;
    try {
      const res = await fetch('/api/backlog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle.trim(),
          description: formDesc.trim(),
          priority: formPriority,
        }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      setFormTitle('');
      setFormDesc('');
      setFormPriority('P2');
      setShowForm(false);
      fetchBacklog();
    } catch (err) {
      setError(`Add failed: ${err.message}`);
    }
  }, [formTitle, formDesc, formPriority, fetchBacklog]);

  const handleDelete = useCallback(async (id) => {
    try {
      await fetch(`/api/backlog/${id}`, { method: 'DELETE' });
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(`Delete failed: ${err.message}`);
    }
  }, []);

  const handleLaunch = useCallback(async (item) => {
    try {
      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: item.description || item.title }),
      });
      handleDelete(item.id);
    } catch (err) {
      setError(`Launch failed: ${err.message}`);
    }
  }, [handleDelete]);

  const handleAIScore = useCallback(async () => {
    setScoring(true);
    try {
      const res = await fetch('/api/backlog/stack-rank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      fetchBacklog();
    } catch (err) {
      setError(`AI score failed: ${err.message}`);
    } finally {
      setScoring(false);
    }
  }, [fetchBacklog]);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/backlog/generate', { method: 'POST' });
      if (!res.ok) throw new Error(`${res.status}`);
      fetchBacklog();
    } catch (err) {
      setError(`Generate failed: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  }, [fetchBacklog]);

  const handleEditStart = useCallback((item) => {
    setEditingId(item.id);
    setEditTitle(item.title);
  }, []);

  const handleEditSave = useCallback(async (id) => {
    if (!editTitle.trim()) return;
    try {
      await fetch(`/api/backlog/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle.trim() }),
      });
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, title: editTitle.trim() } : item))
      );
    } catch (err) {
      setError(`Edit failed: ${err.message}`);
    }
    setEditingId(null);
  }, [editTitle]);

  // Drag-and-drop handlers
  const handleDragStart = useCallback((idx) => {
    dragItem.current = idx;
  }, []);

  const handleDragEnter = useCallback((idx) => {
    dragOver.current = idx;
    setDragOverId(items[idx]?.id);
  }, [items]);

  const handleDragEnd = useCallback(async () => {
    setDragOverId(null);
    if (dragItem.current === null || dragOver.current === null) return;
    if (dragItem.current === dragOver.current) return;

    const reordered = [...items];
    const [removed] = reordered.splice(dragItem.current, 1);
    reordered.splice(dragOver.current, 0, removed);
    setItems(reordered);
    dragItem.current = null;
    dragOver.current = null;

    try {
      await fetch('/api/backlog/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: reordered.map((item) => item.id) }),
      });
    } catch (err) {
      setError(`Reorder failed: ${err.message}`);
      fetchBacklog();
    }
  }, [items, fetchBacklog]);

  if (loading) return <div style={styles.loading}>Loading backlog...</div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>Backlog ({items.length})</span>
        <div style={styles.btnRow}>
          <button
            style={{ ...styles.btn, ...styles.btnSecondary }}
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? 'Cancel' : '+ Add Item'}
          </button>
          <button
            style={{ ...styles.btn, ...styles.btnSecondary }}
            onClick={handleAIScore}
            disabled={scoring || items.length === 0}
          >
            {scoring ? 'Scoring...' : 'AI Score'}
          </button>
          <button
            style={{ ...styles.btn, ...styles.btnSecondary }}
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? 'Generating...' : 'Generate Ideas'}
          </button>
        </div>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {showForm && (
        <div style={styles.addForm}>
          <input
            style={styles.input}
            placeholder="Title"
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            autoFocus
          />
          <textarea
            style={styles.textarea}
            placeholder="Description (optional)"
            value={formDesc}
            onChange={(e) => setFormDesc(e.target.value)}
          />
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <select
              style={styles.select}
              value={formPriority}
              onChange={(e) => setFormPriority(e.target.value)}
            >
              <option value="P0">P0 - Critical</option>
              <option value="P1">P1 - Important</option>
              <option value="P2">P2 - Nice to have</option>
            </select>
            <button
              style={{ ...styles.btn, ...styles.btnPrimary }}
              onClick={handleAdd}
              disabled={!formTitle.trim()}
            >
              Add
            </button>
          </div>
        </div>
      )}

      <div style={styles.list}>
        {items.length === 0 && (
          <div style={styles.emptyState}>
            Backlog is empty. Add items or generate ideas with AI.
          </div>
        )}

        {items.map((item, idx) => (
          <div
            key={item.id}
            style={{
              ...styles.item,
              ...(dragOverId === item.id ? styles.dragOver : {}),
            }}
            draggable
            onDragStart={() => handleDragStart(idx)}
            onDragEnter={() => handleDragEnter(idx)}
            onDragOver={(e) => e.preventDefault()}
            onDragEnd={handleDragEnd}
          >
            <span style={priorityBadgeStyle(item.priority)}>
              {item.priority || 'P2'}
            </span>

            <div style={styles.itemContent}>
              {editingId === item.id ? (
                <input
                  style={styles.itemTitleInput}
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={() => handleEditSave(item.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleEditSave(item.id);
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  autoFocus
                />
              ) : (
                <div
                  style={styles.itemTitle}
                  onClick={() => handleEditStart(item)}
                  title="Click to edit"
                >
                  {item.title}
                </div>
              )}
              {item.description && (
                <div style={styles.itemDesc}>{item.description}</div>
              )}
              <div style={styles.itemMeta}>
                {item.effort && <span>Effort: {item.effort}</span>}
                {item.score != null && <span>Score: {item.score}</span>}
              </div>
            </div>

            <div style={styles.actions}>
              <button
                style={{ ...styles.btn, ...styles.btnPrimary, ...styles.btnSmall }}
                onClick={() => handleLaunch(item)}
                title="Launch as task"
              >
                Launch
              </button>
              <button
                style={{ ...styles.btn, ...styles.btnDanger, ...styles.btnSmall }}
                onClick={() => handleDelete(item.id)}
                title="Delete"
              >
                Del
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
