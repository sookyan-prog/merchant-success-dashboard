'use client';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not sign in.');
        setLoading(false);
        return;
      }
      const next = params.get('next') || '/dashboard.html';
      window.location.href = next;
    } catch {
      setError('Something went wrong. Try again.');
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F4F7FC',
      }}
    >
      <form
        onSubmit={onSubmit}
        style={{
          width: 380,
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 18px 50px rgba(14,46,99,.12)',
          padding: '36px 32px',
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: '#E1345A',
            color: '#fff',
            display: 'grid',
            placeItems: 'center',
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 700,
            marginBottom: 18,
          }}
        >
          MS
        </div>
        <h1 style={{ fontFamily: "'Poppins', sans-serif", fontSize: 20, color: '#0E2E63', margin: '0 0 4px' }}>
          Merchant Success
        </h1>
        <p style={{ color: '#6B7A99', fontSize: 13, margin: '0 0 24px' }}>Sign in to your account</p>

        <label style={{ display: 'block', fontSize: 12, color: '#0E2E63', fontWeight: 600, marginBottom: 6 }}>
          Email address
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
          autoFocus
        />

        <label style={{ display: 'block', fontSize: 12, color: '#0E2E63', fontWeight: 600, margin: '16px 0 6px' }}>
          Password
        </label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
        />

        {error ? (
          <p style={{ color: '#D6336C', fontSize: 12.5, margin: '14px 0 0' }}>{error}</p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            marginTop: 22,
            padding: '11px 0',
            borderRadius: 9,
            border: 0,
            background: '#0E2E63',
            color: '#fff',
            fontWeight: 600,
            fontSize: 14,
            cursor: loading ? 'default' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>

        <p style={{ fontSize: 11.5, color: '#9AA7C2', marginTop: 20, marginBottom: 0, textAlign: 'center' }}>
          Internal use only. Ask Sook Yan if you don't have an account yet.
        </p>
      </form>
    </div>
  );
}

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  border: '1px solid #DDE4F0',
  borderRadius: 8,
  padding: '9px 11px',
  fontSize: 13.5,
  color: '#0E2E63',
  fontFamily: 'inherit',
};
