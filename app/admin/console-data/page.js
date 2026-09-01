'use client';
import { useState } from 'react';

export default function ConsoleDataPage() {
  const [raw, setRaw] = useState('');
  const [error, setError] = useState('');
  const [months, setMonths] = useState(null);
  const [loading, setLoading] = useState(false);

  async function onImport(e) {
    e.preventDefault();
    setError('');
    setMonths(null);
    setLoading(true);
    try {
      const res = await fetch('/api/console-retention/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not import that.');
        setLoading(false);
        return;
      }
      setMonths(data.months || []);
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
          Update console data
        </h1>
        <p style={{ color: '#6B7A99', fontSize: 13, margin: '0 0 20px', lineHeight: 1.6 }}>
          Open the retention report at{' '}
          <a href="https://console.easystore.pink/reports/retention?period=monthly&region=z1" target="_blank" rel="noopener" style={{ color: '#2F5CE0' }}>
            console.easystore.pink
          </a>
          , click <b>Copy table</b>, then paste the whole thing below. Every month row gets picked out
          automatically - paste the full table or just the latest month, either works.
        </p>

        <form onSubmit={onImport}>
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
          {months ? (
            <p style={{ color: '#0B7350', fontSize: 12.5, margin: '14px 0 0' }}>
              {months.length
                ? `Updated: ${months.slice().sort().reverse().join(', ')}.`
                : "Nothing usable in that paste - double-check it's the full copy from the console table."}
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
