'use client';
import { useState } from 'react';

function currentMonth() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

export default function ChurnDataPage() {
  const [month, setMonth] = useState(currentMonth());
  const [raw, setRaw] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function onImport(e) {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch('/api/churn-stores/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw, month }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not import that.');
        setLoading(false);
        return;
      }
      setResult(data);
      setLoading(false);
    } catch {
      setError('Something went wrong. Try again.');
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F4F7FC', padding: '40px 24px' }}>
      <div
        style={{
          maxWidth: 640,
          margin: '0 auto',
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 18px 50px rgba(14,46,99,.12)',
          padding: '36px 32px',
        }}
      >
        <h1 style={{ fontFamily: "'Poppins', sans-serif", fontSize: 20, color: '#0E2E63', margin: '0 0 4px' }}>
          Update churn queue data
        </h1>
        <p style={{ color: '#6B7A99', fontSize: 13, margin: '0 0 20px', lineHeight: 1.6 }}>
          Open the Churn Stores report at{' '}
          <a href="https://console.easystore.pink" target="_blank" rel="noopener" style={{ color: '#2F5CE0' }}>
            console.easystore.pink
          </a>
          {' '}(Reports &gt; Churn Stores), click <b>Copy table</b>, pick which month the report was showing,
          then paste the whole thing below.
        </p>

        <form onSubmit={onImport}>
          <label style={{ display: 'block', fontSize: 12.5, color: '#0E2E63', fontWeight: 600, marginBottom: 6 }}>
            Month this report was showing
          </label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            style={{
              border: '1px solid #DDE4F0',
              borderRadius: 8,
              padding: '9px 12px',
              fontSize: 13,
              color: '#0E2E63',
              marginBottom: 16,
            }}
          />

          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder="Paste the copied table here"
            style={{
              width: '100%',
              minHeight: 220,
              boxSizing: 'border-box',
              border: '1px solid #DDE4F0',
              borderRadius: 8,
              padding: '10px 12px',
              fontSize: 12.5,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              color: '#0E2E63',
              resize: 'vertical',
            }}
          />

          {error ? <p style={{ color: '#D6336C', fontSize: 12.5, margin: '14px 0 0' }}>{error}</p> : null}
          {result ? (
            <p style={{ color: '#0B7350', fontSize: 12.5, margin: '14px 0 0' }}>
              {result.count} store{result.count === 1 ? '' : 's'} saved for {result.month}.
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading || !raw.trim()}
            style={{
              marginTop: 18,
              padding: '11px 20px',
              borderRadius: 9,
              border: 0,
              background: '#0E2E63',
              color: '#fff',
              fontWeight: 600,
              fontSize: 14,
              cursor: loading || !raw.trim() ? 'default' : 'pointer',
              opacity: loading || !raw.trim() ? 0.6 : 1,
            }}
          >
            {loading ? 'Importing…' : 'Import'}
          </button>
        </form>

        <p style={{ fontSize: 11.5, textAlign: 'center', marginTop: 22, marginBottom: 0 }}>
          <a href="/dashboard.html" style={{ color: '#6B7A99' }}>
            Back to dashboard
          </a>
        </p>
      </div>
    </div>
  );
}
