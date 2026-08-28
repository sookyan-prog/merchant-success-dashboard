'use client';
import { useState } from 'react';

export default function AccountPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setOk('');
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not change password.');
        setLoading(false);
        return;
      }
      setOk('Password updated. Use it next time you sign in.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setLoading(false);
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
        <h1 style={{ fontFamily: "'Poppins', sans-serif", fontSize: 20, color: '#0E2E63', margin: '0 0 4px' }}>
          Change password
        </h1>
        <p style={{ color: '#6B7A99', fontSize: 13, margin: '0 0 24px' }}>
          Enter your current password, then your new one.
        </p>

        <label style={{ display: 'block', fontSize: 12, color: '#0E2E63', fontWeight: 600, marginBottom: 6 }}>
          Current password
        </label>
        <input
          type="password"
          required
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          style={inputStyle}
          autoFocus
        />

        <label style={{ display: 'block', fontSize: 12, color: '#0E2E63', fontWeight: 600, margin: '16px 0 6px' }}>
          New password
        </label>
        <input
          type="password"
          required
          minLength={8}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          style={inputStyle}
        />

        <label style={{ display: 'block', fontSize: 12, color: '#0E2E63', fontWeight: 600, margin: '16px 0 6px' }}>
          Confirm new password
        </label>
        <input
          type="password"
          required
          minLength={8}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          style={inputStyle}
        />

        {error ? (
          <p style={{ color: '#D6336C', fontSize: 12.5, margin: '14px 0 0' }}>{error}</p>
        ) : null}
        {ok ? (
          <p style={{ color: '#0B7350', fontSize: 12.5, margin: '14px 0 0' }}>{ok}</p>
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
          {loading ? 'Saving…' : 'Save new password'}
        </button>

        <p style={{ fontSize: 11.5, textAlign: 'center', marginTop: 18, marginBottom: 0 }}>
          <a href="/dashboard.html" style={{ color: '#6B7A99' }}>
            Back to dashboard
          </a>
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
