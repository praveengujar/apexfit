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
  serviceList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  serviceCard: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    padding: '14px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  statusDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  serviceInfo: {
    flex: 1,
    minWidth: 0,
  },
  serviceName: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text)',
    marginBottom: '2px',
  },
  serviceUrl: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    fontFamily: 'monospace',
  },
  responseTime: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    flexShrink: 0,
    textAlign: 'right',
    minWidth: '70px',
  },
  responseTimeGood: {
    color: 'var(--green)',
  },
  responseTimeSlow: {
    color: 'var(--amber)',
  },
  responseTimeBad: {
    color: 'var(--red)',
  },
  lastChecked: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    textAlign: 'right',
    marginTop: '8px',
  },
  loading: {
    textAlign: 'center',
    color: 'var(--text-muted)',
    padding: '40px 20px',
    fontSize: '14px',
  },
  summary: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
  },
  summaryCard: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    padding: '14px 20px',
    textAlign: 'center',
    flex: '1 1 120px',
    minWidth: '120px',
  },
  summaryValue: {
    fontSize: '24px',
    fontWeight: 700,
    marginBottom: '4px',
  },
  summaryLabel: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
};

const DEFAULT_SERVICES = [
  { name: 'Backend API', url: '/api/ping' },
  { name: 'Vite Dev Server', url: '/' },
];

function responseTimeStyle(ms) {
  if (ms < 200) return styles.responseTimeGood;
  if (ms < 1000) return styles.responseTimeSlow;
  return styles.responseTimeBad;
}

export default function TestMeTab() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pinging, setPinging] = useState(false);
  const [lastChecked, setLastChecked] = useState(null);
  const intervalRef = useRef(null);

  const pingService = useCallback(async (service) => {
    const start = performance.now();
    try {
      const res = await fetch(service.url, { method: 'GET', signal: AbortSignal.timeout(10000) });
      const elapsed = Math.round(performance.now() - start);
      return {
        ...service,
        healthy: res.ok,
        responseTime: elapsed,
        statusCode: res.status,
      };
    } catch (err) {
      const elapsed = Math.round(performance.now() - start);
      return {
        ...service,
        healthy: false,
        responseTime: elapsed,
        error: err.message,
      };
    }
  }, []);

  const pingAll = useCallback(async () => {
    setPinging(true);
    try {
      // Try to load configured services from API
      let serviceList = DEFAULT_SERVICES;
      try {
        const res = await fetch('/api/servers');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            serviceList = data;
          }
        }
      } catch {
        // Use defaults
      }

      const results = await Promise.all(serviceList.map(pingService));
      setServices(results);
      setLastChecked(new Date());
    } finally {
      setPinging(false);
      setLoading(false);
    }
  }, [pingService]);

  // Initial load + auto-refresh every 30s
  useEffect(() => {
    pingAll();
    intervalRef.current = setInterval(pingAll, 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [pingAll]);

  const healthyCount = services.filter((s) => s.healthy).length;
  const downCount = services.filter((s) => !s.healthy).length;
  const avgResponse = services.length > 0
    ? Math.round(services.reduce((sum, s) => sum + (s.responseTime || 0), 0) / services.length)
    : 0;

  if (loading) return <div style={styles.loading}>Checking services...</div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>Service Health</span>
        <button
          style={{ ...styles.btn, ...styles.btnPrimary, opacity: pinging ? 0.6 : 1 }}
          onClick={pingAll}
          disabled={pinging}
        >
          {pinging ? 'Pinging...' : 'Ping All'}
        </button>
      </div>

      {/* Summary cards */}
      <div style={styles.summary}>
        <div style={styles.summaryCard}>
          <div style={{ ...styles.summaryValue, color: 'var(--green)' }}>{healthyCount}</div>
          <div style={styles.summaryLabel}>Healthy</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={{ ...styles.summaryValue, color: downCount > 0 ? 'var(--red)' : 'var(--text-muted)' }}>
            {downCount}
          </div>
          <div style={styles.summaryLabel}>Down</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={{ ...styles.summaryValue, color: 'var(--text)' }}>{avgResponse}ms</div>
          <div style={styles.summaryLabel}>Avg Response</div>
        </div>
      </div>

      {/* Service list */}
      <div style={styles.serviceList}>
        {services.map((service, i) => (
          <div key={service.name || i} style={styles.serviceCard}>
            <div
              style={{
                ...styles.statusDot,
                background: service.healthy ? 'var(--green)' : 'var(--red)',
                boxShadow: service.healthy
                  ? '0 0 8px rgba(74, 222, 128, 0.4)'
                  : '0 0 8px rgba(248, 113, 113, 0.4)',
              }}
            />
            <div style={styles.serviceInfo}>
              <div style={styles.serviceName}>{service.name}</div>
              <div style={styles.serviceUrl}>{service.url}</div>
              {service.error && (
                <div style={{ fontSize: '11px', color: 'var(--red)', marginTop: '2px' }}>
                  {service.error}
                </div>
              )}
            </div>
            <div style={{ ...styles.responseTime, ...responseTimeStyle(service.responseTime || 0) }}>
              {service.responseTime != null ? `${service.responseTime}ms` : '--'}
            </div>
          </div>
        ))}
      </div>

      {lastChecked && (
        <div style={styles.lastChecked}>
          Last checked: {lastChecked.toLocaleTimeString()} (auto-refreshes every 30s)
        </div>
      )}
    </div>
  );
}
