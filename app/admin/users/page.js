'use client';
import { useEffect, useState } from 'react';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'am' });
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch('/api/users');
    if (res.status === 403) {
      setError('Only a manager account can view this page.');
      setLoading(false);
      return;
    }
    const data = await res.json();
    setUsers(data.users || []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setOk('');
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Could not create the account.');
      return;
    }
    setOk(`Account created for ${data.user.email}. Share the starting password with them directly.`);
    setForm({ name: '', email: '', password: '', role: 'am' });
    load();
  }

  return (
    <div style={{ maxWidth: 640, margin: '40px auto', padding: '0 20px', fontFamily: 'inherit', color: '#0E2E63' }}>
      <h1 style={{ fontFamily: "'Poppins', sans-serif", fontSize: 22 }}>Account manager logins</h1>
      <p style={{ color: '#6B7A99', fontSize: 13.5 }}>
        Create a login for each account manager. Give them the email and starting password directly
        (WhatsApp, in person) - it isn't emailed automatically yet.
      </p>

      <form onSubmit={onSubmit} style={{ background: '#fff', border: '1px solid #E2E8F5', borderRadius: 12, padding: 20, marginBottom: 28 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Name">
            <input style={inputStyle} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Email">
            <input style={inputStyle} type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Starting password">
            <input style={inputStyle} required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </Field>
          <Field label="Role">
            <select style={inputStyle} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="am">Account manager</option>
              <option value="manager">Manager</option>
            </select>
          </Field>
        </div>
        {error ? <p style={{ color: '#D6336C', fontSize: 12.5 }}>{error}</p> : null}
        {ok ? <p style={{ color: '#0B7350', fontSize: 12.5 }}>{ok}</p> : null}
        <button
          type="submit"
          style={{ marginTop: 8, padding: '9px 18px', borderRadius: 8, border: 0, background: '#0E2E63', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
        >
          Create account
        </button>
      </form>

      <h2 style={{ fontSize: 15 }}>Existing accounts</h2>
      {loading ? (
        <p>Loading…</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
          <thead>
            <tr style={{ textAlign: 'left', color: '#6B7A99', fontSize: 11.5, textTransform: 'uppercase' }}>
              <th style={{ padding: '6px 0' }}>Name</th>
              <th>Email</th>
              <th>Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} style={{ borderTop: '1px solid #EEF2FA' }}>
                <td style={{ padding: '8px 0' }}>{u.name}</td>
                <td>{u.email}</td>
                <td style={{ textTransform: 'capitalize' }}>{u.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ display: 'block', fontSize: 11.5, fontWeight: 600, marginBottom: 4 }}>{label}</span>
      {children}
    </label>
  );
}

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  border: '1px solid #DDE4F0',
  borderRadius: 7,
  padding: '7px 9px',
  fontSize: 13,
  fontFamily: 'inherit',
};
