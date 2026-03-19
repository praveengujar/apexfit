import React, { useState, useEffect, useCallback, useRef } from 'react';
import { formatTimeAgo, formatCost, statusColor, statusIcon, extractTaskOutput } from './utils.js';

// Tab components
import TaskQueue from './TaskQueue.jsx';
import BacklogTab from './BacklogTab.jsx';
import BacklogChat from './BacklogChat.jsx';
import TerminalSessionCard from './TerminalSessionCard.jsx';
import ProjectCard from './ProjectCard.jsx';
import HealthTab from './TabComponents/HealthTab.jsx';
import AdoptionTab from './AdoptionTab.jsx';
import TestMeTab from './TestMeTab.jsx';
import ReleaseNotesTab from './TabComponents/ReleaseNotesTab.jsx';
import SuggestedReplies from './SuggestedReplies.jsx';
import TaskDecomposer from './TaskDecomposer.jsx';
import DiffReview from './DiffReview.jsx';
import TerminalView from './TerminalView.jsx';

// ---------------------------------------------------------------------------
// Error Boundary — catches render errors in tab components
// ---------------------------------------------------------------------------
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 32, color: 'var(--red)', background: 'var(--surface)', borderRadius: 12, margin: 16 }}>
          <h3>Something went wrong</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{this.state.error?.message}</p>
          <button
            className="btn btn-secondary"
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{ marginTop: 12 }}
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const TABS = [
  { key: 'queue', label: 'Queue' },
  { key: 'sessions', label: 'Sessions' },
  { key: 'backlog', label: 'Backlog' },
  { key: 'projects', label: 'Projects' },
  { key: 'health', label: 'Health' },
  { key: 'adoption', label: 'Adoption' },
  { key: 'testme', label: 'Test Me' },
  { key: 'releases', label: 'Releases' },
];

const WS_URL =
  import.meta.env.MODE === 'production'
    ? `ws://${window.location.host}`
    : 'ws://localhost:3740';

const POLL_INTERVAL = 5000;

// ---------------------------------------------------------------------------
// App Component
// ---------------------------------------------------------------------------
export default function App() {
  // ----- state -----
  const [tasks, setTasks] = useState([]);
  const [activeTab, setActiveTab] = useState('queue');
  const [selectedTask, setSelectedTask] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [reviewTask, setReviewTask] = useState(null);
  const [terminalTaskId, setTerminalTaskId] = useState(null);

  // refs for cleanup
  const wsRef = useRef(null);
  const pollRef = useRef(null);
  const toastIdRef = useRef(0);

  // ----- toast helpers -----
  const addToast = useCallback((message, type = 'info') => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  // ----- polling fallback -----
  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch('/api/tasks');
        if (res.ok) {
          const data = await res.json();
          setTasks(Array.isArray(data) ? data : []);
        }
      } catch {
        // silently retry next interval
      }
    }, POLL_INTERVAL);
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  // ----- WebSocket -----
  useEffect(() => {
    let reconnectTimer;

    function connect() {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
        stopPolling();
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'tasks') {
            setTasks(Array.isArray(msg.data) ? msg.data : []);
          }
        } catch {
          // ignore non-JSON frames
        }
      };

      ws.onclose = () => {
        setWsConnected(false);
        startPolling();
        // attempt reconnect after 5s
        reconnectTimer = setTimeout(connect, POLL_INTERVAL);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      stopPolling();
      if (wsRef.current) wsRef.current.close();
    };
  }, [startPolling, stopPolling]);

  // ----- Adoption tracking -----
  const trackAdoption = useCallback((tab) => {
    fetch('/api/adoption', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tab, timestamp: new Date().toISOString() }),
    }).catch(() => {});
  }, []);

  const handleTabSwitch = useCallback(
    (tab) => {
      setActiveTab(tab);
      trackAdoption(tab);
    },
    [trackAdoption]
  );

  // ----- Fetch sessions when sessions tab active -----
  useEffect(() => {
    if (activeTab !== 'sessions') return;

    let cancelled = false;
    async function fetchSessions() {
      try {
        const res = await fetch('/api/claude-sessions');
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setSessions(Array.isArray(data) ? data : []);
        }
      } catch {
        // ignore
      }
    }
    fetchSessions();

    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  // ----- Task actions -----
  const handleRetry = async (taskId) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/retry`, { method: 'POST' });
      if (res.ok) addToast('Task queued for retry', 'success');
      else addToast('Retry failed', 'error');
    } catch {
      addToast('Network error', 'error');
    }
  };

  const handleCancel = async (taskId) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/cancel`, { method: 'POST' });
      if (res.ok) addToast('Task cancelled', 'warning');
      else addToast('Cancel failed', 'error');
    } catch {
      addToast('Network error', 'error');
    }
  };

  const handleArchive = async (taskId) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      if (res.ok) {
        addToast('Task archived', 'info');
        setSelectedTask(null);
      } else addToast('Archive failed', 'error');
    } catch {
      addToast('Network error', 'error');
    }
  };

  const handleApprove = async (taskId) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/approve`, { method: 'POST' });
      if (res.ok) {
        addToast('Changes approved and merged', 'success');
        setReviewTask(null);
      } else addToast('Approve failed', 'error');
    } catch { addToast('Network error', 'error'); }
  };

  const handleReject = async (taskId) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/reject`, { method: 'POST' });
      if (res.ok) {
        addToast('Changes rejected', 'warning');
        setReviewTask(null);
      } else addToast('Reject failed', 'error');
    } catch { addToast('Network error', 'error'); }
  };

  const handlePause = async (taskId) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/pause`, { method: 'POST' });
      if (res.ok) addToast('Task paused', 'info');
      else addToast('Pause failed', 'error');
    } catch { addToast('Network error', 'error'); }
  };

  const handleResume = async (taskId) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/resume`, { method: 'POST' });
      if (res.ok) addToast('Task resumed', 'success');
      else addToast('Resume failed', 'error');
    } catch { addToast('Network error', 'error'); }
  };

  // ----- Render active tab -----
  function renderTab() {
    switch (activeTab) {
      case 'queue':
        return <TaskQueue tasks={tasks} onSelectTask={setSelectedTask} />;
      case 'sessions':
        return (
          <div className="card-grid">
            {sessions.length === 0 && (
              <div className="empty-state">
                <div className="icon">&#128421;</div>
                <p>No active sessions</p>
              </div>
            )}
            {sessions.map((s) => (
              <TerminalSessionCard key={s.id || s.sessionId} session={s} />
            ))}
          </div>
        );
      case 'backlog':
        return <BacklogTab tasks={tasks} onSelect={setSelectedTask} />;
      case 'projects':
        return <ProjectCard tasks={tasks} />;
      case 'health':
        return <HealthTab tasks={tasks} />;
      case 'adoption':
        return <AdoptionTab />;
      case 'testme':
        return <TestMeTab addToast={addToast} />;
      case 'releases':
        return <ReleaseNotesTab />;
      default:
        return null;
    }
  }

  // ----- Task Detail Modal -----
  function renderModal() {
    if (!selectedTask) return null;
    const t = selectedTask;
    return (
      <div className="modal-overlay" onClick={() => setSelectedTask(null)}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <button className="modal-close" onClick={() => setSelectedTask(null)}>
            &times;
          </button>

          <h2>
            {statusIcon(t.status)} {t.prompt?.slice(0, 80) || 'Task Detail'}
          </h2>

          {/* Status */}
          <div className="modal-section">
            <div className="modal-section-title">Status</div>
            <span className={`badge badge-${t.status}`}>{t.status}</span>
          </div>

          {/* Prompt */}
          <div className="modal-section">
            <div className="modal-section-title">Prompt</div>
            <div className="modal-output">{t.prompt || '(none)'}</div>
          </div>

          {/* Output */}
          {t.output && (
            <div className="modal-section">
              <div className="modal-section-title">Output</div>
              <div className="modal-output">{extractTaskOutput(t.output)}</div>
            </div>
          )}

          {/* Events timeline */}
          {t.events && t.events.length > 0 && (
            <div className="modal-section">
              <div className="modal-section-title">Events</div>
              <div className="events-timeline">
                {t.events.map((ev, i) => (
                  <div className="event-item" key={i}>
                    <span className="event-time">
                      {formatTimeAgo(ev.timestamp)}
                    </span>
                    <span className="event-text">{ev.message || ev.type}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Meta row: cost + timestamps */}
          <div className="modal-section flex-between text-sm text-muted">
            <span>Cost: {formatCost(t.cost)}</span>
            <span>Created: {t.createdAt ? formatTimeAgo(t.createdAt) : '--'}</span>
          </div>

          {/* Actions */}
          <div className="btn-group">
            {(t.status === 'failed' || t.status === 'done') && (
              <button className="btn btn-primary" onClick={() => handleRetry(t.id)}>
                Retry
              </button>
            )}
            {(t.status === 'pending' || t.status === 'running') && (
              <button className="btn btn-danger" onClick={() => handleCancel(t.id)}>
                Cancel
              </button>
            )}
            {t.status !== 'archived' && (
              <button className="btn btn-secondary" onClick={() => handleArchive(t.id)}>
                Archive
              </button>
            )}
            {t.status === 'review' && (
              <button className="btn btn-primary" onClick={() => { setReviewTask(t); setSelectedTask(null); }}>
                Review Changes
              </button>
            )}
            {t.status === 'running' && (
              <>
                <button className="btn btn-secondary" onClick={() => handlePause(t.id)}>
                  Pause
                </button>
                <button className="btn btn-secondary" onClick={() => { setTerminalTaskId(t.id); setSelectedTask(null); }}>
                  Attach
                </button>
              </>
            )}
            {t.status === 'paused' && (
              <button className="btn btn-primary" onClick={() => handleResume(t.id)}>
                Resume
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ----- Main render -----
  return (
    <div className="app-shell">
      {/* Top bar */}
      <header className="top-bar">
        <h1>Workforce</h1>
        <div className="ws-indicator">
          <span className={`ws-dot ${wsConnected ? 'connected' : ''}`} />
          {wsConnected ? 'Connected' : 'Disconnected'}
        </div>
      </header>

      {/* Tab bar */}
      <nav className="tab-bar">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`tab-btn ${activeTab === t.key ? 'active' : ''}`}
            onClick={() => handleTabSwitch(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main className="content-area">
        <ErrorBoundary>{renderTab()}</ErrorBoundary>
      </main>

      {/* Task detail modal */}
      {renderModal()}

      {/* Diff review modal */}
      {reviewTask && (
        <DiffReview
          task={reviewTask}
          onApprove={handleApprove}
          onReject={handleReject}
          onClose={() => setReviewTask(null)}
        />
      )}

      {/* Terminal attach modal */}
      {terminalTaskId && (
        <div className="modal-overlay" onClick={() => setTerminalTaskId(null)}>
          <div className="modal" style={{ maxWidth: '900px', width: '90%' }} onClick={e => e.stopPropagation()}>
            <TerminalView taskId={terminalTaskId} onClose={() => setTerminalTaskId(null)} />
          </div>
        </div>
      )}

      {/* Toast notifications */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}
