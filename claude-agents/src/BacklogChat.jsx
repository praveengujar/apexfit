import React, { useState, useCallback, useRef, useEffect } from 'react';
import { chatBacklog } from './services/aiSuggestionService.js';

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: 'var(--surface)',
    borderRadius: '12px',
    border: '1px solid var(--border)',
    overflow: 'hidden',
  },
  header: {
    padding: '12px 16px',
    borderBottom: '1px solid var(--border)',
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text)',
    background: 'var(--surface2)',
  },
  messageList: {
    flex: 1,
    overflowY: 'auto',
    padding: '12px 16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  msgUser: {
    alignSelf: 'flex-end',
    background: 'var(--accent)',
    color: '#fff',
    borderRadius: '12px 12px 4px 12px',
    padding: '8px 14px',
    fontSize: '13px',
    maxWidth: '80%',
    wordBreak: 'break-word',
    lineHeight: 1.4,
  },
  msgAI: {
    alignSelf: 'flex-start',
    background: 'var(--surface2)',
    color: 'var(--text)',
    borderRadius: '12px 12px 12px 4px',
    padding: '8px 14px',
    fontSize: '13px',
    maxWidth: '80%',
    wordBreak: 'break-word',
    lineHeight: 1.4,
  },
  thinking: {
    alignSelf: 'flex-start',
    color: 'var(--text-muted)',
    fontSize: '13px',
    fontStyle: 'italic',
    padding: '4px 0',
  },
  actionBlock: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    padding: '8px 12px',
    marginTop: '6px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '8px',
  },
  actionText: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    flex: 1,
    minWidth: 0,
  },
  actionBtn: {
    padding: '4px 12px',
    borderRadius: '6px',
    border: 'none',
    background: 'var(--accent)',
    color: '#fff',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    flexShrink: 0,
  },
  inputRow: {
    display: 'flex',
    gap: '8px',
    padding: '12px 16px',
    borderTop: '1px solid var(--border)',
    background: 'var(--surface2)',
  },
  input: {
    flex: 1,
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    color: 'var(--text)',
    padding: '8px 12px',
    fontSize: '14px',
    outline: 'none',
  },
  sendBtn: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    background: 'var(--accent)',
    color: '#fff',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  emptyState: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-muted)',
    fontSize: '13px',
    padding: '20px',
    textAlign: 'center',
  },
};

// Parse ACTION directives from AI response text
function parseActions(text) {
  const actionRegex = /\[(ADD_ITEM|PRIORITIZE|REMOVE_ITEM|EDIT_ITEM):\s*([^\]]+)\]/g;
  const actions = [];
  let match;
  while ((match = actionRegex.exec(text)) !== null) {
    actions.push({ full: match[0], type: match[1], args: match[2].trim() });
  }
  return actions;
}

// Strip action directives from visible text
function stripActions(text) {
  return text.replace(/\[(ADD_ITEM|PRIORITIZE|REMOVE_ITEM|EDIT_ITEM):\s*[^\]]+\]/g, '').trim();
}

export default function BacklogChat({ backlogItems = [], onBacklogUpdate }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const listRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, thinking]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || thinking) return;

    const userMsg = { role: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setThinking(true);

    try {
      const data = await chatBacklog(text, backlogItems);
      const reply = data.reply || data.message || '';
      const actions = parseActions(reply);
      const cleanText = stripActions(reply);

      setMessages((prev) => [
        ...prev,
        { role: 'ai', text: cleanText, actions },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'ai', text: 'Error: ' + err.message, actions: [] },
      ]);
    } finally {
      setThinking(false);
    }
  }, [input, thinking, backlogItems]);

  const handleApplyAction = useCallback(async (action) => {
    try {
      if (action.type === 'ADD_ITEM') {
        await fetch('/api/backlog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: action.args, priority: 'P2' }),
        });
      } else if (action.type === 'PRIORITIZE') {
        const parts = action.args.split(',').map((s) => s.trim());
        const id = parts[0];
        const priority = parts[1];
        await fetch('/api/backlog/' + id, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ priority }),
        });
      } else if (action.type === 'REMOVE_ITEM') {
        await fetch('/api/backlog/' + action.args, { method: 'DELETE' });
      }
      onBacklogUpdate?.();
    } catch (err) {
      console.error('Apply action failed:', err);
    }
  }, [onBacklogUpdate]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>Backlog Assistant</div>

      <div style={styles.messageList} ref={listRef}>
        {messages.length === 0 && !thinking && (
          <div style={styles.emptyState}>
            Chat with AI about your backlog. Ask for prioritization advice, scope refinement, or new ideas.
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i}>
            <div style={msg.role === 'user' ? styles.msgUser : styles.msgAI}>
              {msg.text}
            </div>
            {msg.actions?.map((action, j) => (
              <div key={j} style={styles.actionBlock}>
                <span style={styles.actionText}>
                  {action.type}: {action.args}
                </span>
                <button
                  style={styles.actionBtn}
                  onClick={() => handleApplyAction(action)}
                >
                  Apply
                </button>
              </div>
            ))}
          </div>
        ))}

        {thinking && (
          <div style={styles.thinking}>thinking...</div>
        )}
      </div>

      <div style={styles.inputRow}>
        <input
          style={styles.input}
          placeholder="Ask about your backlog..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={thinking}
        />
        <button
          style={{
            ...styles.sendBtn,
            opacity: (!input.trim() || thinking) ? 0.5 : 1,
          }}
          onClick={handleSend}
          disabled={!input.trim() || thinking}
        >
          Send
        </button>
      </div>
    </div>
  );
}
