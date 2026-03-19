import React, { useState, useEffect, useRef, useCallback } from 'react';

const WS_READY_STATES = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
};

function getWebSocketUrl(taskId) {
  if (process.env.NODE_ENV === 'production' || (typeof window !== 'undefined' && window.location.protocol === 'https:')) {
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    return `${proto}://${window.location.host}/ws/terminal/${taskId}`;
  }
  return `ws://localhost:3740/ws/terminal/${taskId}`;
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.75)',
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
    maxWidth: '1000px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 16px',
    borderBottom: '1px solid var(--border, #1e3a5f)',
    background: 'var(--surface, #111827)',
    gap: '10px',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  taskBadge: {
    fontSize: '11px',
    fontFamily: 'monospace',
    color: 'var(--accent2, #38bdf8)',
    background: 'var(--surface2, #1a2236)',
    padding: '3px 10px',
    borderRadius: '6px',
    letterSpacing: '0.3px',
  },
  statusIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    fontWeight: 600,
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  detachBtn: {
    padding: '6px 14px',
    borderRadius: '8px',
    border: '1px solid var(--border, #1e3a5f)',
    background: 'var(--surface2, #1a2236)',
    color: 'var(--text, #e2e8f0)',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
  terminalArea: {
    flex: 1,
    minHeight: '400px',
    maxHeight: 'calc(90vh - 120px)',
    overflowY: 'auto',
    background: '#000',
    padding: '12px 16px',
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
    fontSize: '13px',
    lineHeight: 1.55,
    color: '#b5e8b0',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
  },
  disconnectedOverlay: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 20px',
    gap: '12px',
    flex: 1,
    minHeight: '400px',
    background: '#000',
  },
  disconnectedText: {
    fontSize: '14px',
    color: 'var(--text-muted, #8b9dc3)',
  },
  reconnectBtn: {
    padding: '8px 18px',
    borderRadius: '8px',
    border: '1px solid var(--border, #1e3a5f)',
    background: 'var(--surface2, #1a2236)',
    color: 'var(--accent, #818cf8)',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  inputBar: {
    display: 'flex',
    gap: '0',
    borderTop: '1px solid var(--border, #1e3a5f)',
    background: 'var(--surface, #111827)',
  },
  promptSymbol: {
    display: 'flex',
    alignItems: 'center',
    padding: '0 12px',
    color: 'var(--green, #4ade80)',
    fontFamily: 'monospace',
    fontSize: '14px',
    fontWeight: 700,
    background: 'var(--surface, #111827)',
    userSelect: 'none',
  },
  input: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    color: 'var(--text, #e2e8f0)',
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
    fontSize: '13px',
    padding: '12px 12px 12px 0',
    outline: 'none',
  },
  sendBtn: {
    padding: '0 18px',
    background: 'var(--accent, #818cf8)',
    border: 'none',
    color: '#fff',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
};

const CONNECTION_STATUS = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  ERROR: 'error',
};

const statusColors = {
  [CONNECTION_STATUS.CONNECTING]: 'var(--amber, #fbbf24)',
  [CONNECTION_STATUS.CONNECTED]: 'var(--green, #4ade80)',
  [CONNECTION_STATUS.DISCONNECTED]: 'var(--text-muted, #8b9dc3)',
  [CONNECTION_STATUS.ERROR]: 'var(--red, #f87171)',
};

const statusLabels = {
  [CONNECTION_STATUS.CONNECTING]: 'Connecting...',
  [CONNECTION_STATUS.CONNECTED]: 'Connected',
  [CONNECTION_STATUS.DISCONNECTED]: 'Disconnected',
  [CONNECTION_STATUS.ERROR]: 'Error',
};

export default function TerminalView({ taskId, onClose }) {
  const [output, setOutput] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [connectionStatus, setConnectionStatus] = useState(CONNECTION_STATUS.CONNECTING);
  const wsRef = useRef(null);
  const terminalRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, []);

  const connect = useCallback(() => {
    // Clean up any existing connection
    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onmessage = null;
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      if (wsRef.current.readyState === WS_READY_STATES.OPEN ||
          wsRef.current.readyState === WS_READY_STATES.CONNECTING) {
        wsRef.current.close();
      }
    }

    setConnectionStatus(CONNECTION_STATUS.CONNECTING);
    const url = getWebSocketUrl(taskId);
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnectionStatus(CONNECTION_STATUS.CONNECTED);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'output') {
          setOutput((prev) => prev + msg.data);
        } else if (msg.type === 'status') {
          if (msg.data === 'closed') {
            setConnectionStatus(CONNECTION_STATUS.DISCONNECTED);
          }
        }
      } catch {
        // Treat non-JSON messages as raw output
        setOutput((prev) => prev + event.data);
      }
    };

    ws.onclose = () => {
      setConnectionStatus(CONNECTION_STATUS.DISCONNECTED);
    };

    ws.onerror = () => {
      setConnectionStatus(CONNECTION_STATUS.ERROR);
    };
  }, [taskId]);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) {
        wsRef.current.onopen = null;
        wsRef.current.onmessage = null;
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        if (wsRef.current.readyState === WS_READY_STATES.OPEN ||
            wsRef.current.readyState === WS_READY_STATES.CONNECTING) {
          wsRef.current.close();
        }
      }
    };
  }, [connect]);

  // Auto-scroll when output changes
  useEffect(() => {
    scrollToBottom();
  }, [output, scrollToBottom]);

  const sendInput = useCallback(() => {
    const text = inputValue.trim();
    if (!text) return;
    if (wsRef.current?.readyState === WS_READY_STATES.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'input', data: text }));
      setInputValue('');
      inputRef.current?.focus();
    }
  }, [inputValue]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendInput();
      }
    },
    [sendInput],
  );

  const handleDetach = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.onclose = null; // prevent status flash
      if (wsRef.current.readyState === WS_READY_STATES.OPEN ||
          wsRef.current.readyState === WS_READY_STATES.CONNECTING) {
        wsRef.current.close();
      }
      wsRef.current = null;
    }
    onClose();
  }, [onClose]);

  const isConnected = connectionStatus === CONNECTION_STATUS.CONNECTED;
  const isDisconnectedOrError =
    connectionStatus === CONNECTION_STATUS.DISCONNECTED ||
    connectionStatus === CONNECTION_STATUS.ERROR;

  return (
    <div style={styles.overlay}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <span style={styles.taskBadge}>
              {taskId}
            </span>
            <div
              style={{
                ...styles.statusIndicator,
                color: statusColors[connectionStatus],
              }}
            >
              <span
                style={{
                  ...styles.statusDot,
                  background: statusColors[connectionStatus],
                }}
              />
              {statusLabels[connectionStatus]}
            </div>
          </div>
          <div style={styles.headerRight}>
            <button style={styles.detachBtn} onClick={handleDetach}>
              Detach
            </button>
          </div>
        </div>

        {/* Terminal output */}
        {isDisconnectedOrError && !output ? (
          <div style={styles.disconnectedOverlay}>
            <span style={{ fontSize: '28px', color: 'var(--text-muted, #8b9dc3)' }}>
              {connectionStatus === CONNECTION_STATUS.ERROR ? '⚠' : '⏻'}
            </span>
            <span style={styles.disconnectedText}>
              {connectionStatus === CONNECTION_STATUS.ERROR
                ? 'Connection failed'
                : 'Terminal disconnected'}
            </span>
            <button style={styles.reconnectBtn} onClick={connect}>
              Reconnect
            </button>
          </div>
        ) : (
          <div ref={terminalRef} style={styles.terminalArea}>
            {output || (
              <span style={{ color: 'var(--text-muted, #8b9dc3)', fontStyle: 'italic' }}>
                {connectionStatus === CONNECTION_STATUS.CONNECTING
                  ? 'Connecting to session...'
                  : 'Waiting for output...'}
              </span>
            )}
            {isDisconnectedOrError && output && (
              <div style={{ marginTop: '16px', textAlign: 'center' }}>
                <span
                  style={{
                    fontSize: '12px',
                    color: 'var(--text-muted, #8b9dc3)',
                    display: 'block',
                    marginBottom: '8px',
                  }}
                >
                  {connectionStatus === CONNECTION_STATUS.ERROR
                    ? 'Connection lost'
                    : 'Session ended'}
                </span>
                <button style={styles.reconnectBtn} onClick={connect}>
                  Reconnect
                </button>
              </div>
            )}
          </div>
        )}

        {/* Input bar */}
        <div style={styles.inputBar}>
          <span style={styles.promptSymbol}>$</span>
          <input
            ref={inputRef}
            type="text"
            style={{
              ...styles.input,
              opacity: isConnected ? 1 : 0.4,
            }}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isConnected ? 'Type a command...' : 'Not connected'}
            disabled={!isConnected}
            autoFocus
          />
          <button
            style={{
              ...styles.sendBtn,
              opacity: isConnected && inputValue.trim() ? 1 : 0.4,
            }}
            onClick={sendInput}
            disabled={!isConnected || !inputValue.trim()}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
