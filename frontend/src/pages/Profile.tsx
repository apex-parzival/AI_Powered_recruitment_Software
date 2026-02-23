import { useState } from 'react';

export default function Profile() {
    const username = localStorage.getItem('username') || 'user@talentai.com';
    const role = localStorage.getItem('user_role') || 'Recruiter';
    const displayName = username.includes('@') ? username.split('@')[0] : username;
    const initials = displayName.slice(0, 2).toUpperCase();
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(displayName);
    const [email, setEmail] = useState(username);

    return (
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
            <div style={{ marginBottom: 28 }}>
                <h1 style={{ fontWeight: 900, fontSize: 32, color: 'var(--text)', margin: '0 0 4px' }}>Profile</h1>
                <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Manage your account information and preferences</p>
            </div>

            {/* Profile Card */}
            <div className="glass" style={{ padding: '32px 32px', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 28 }}>
                    <div style={{ width: 80, height: 80, borderRadius: 20, background: 'linear-gradient(135deg, var(--primary), #9B3AED)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 28, boxShadow: '0 8px 24px rgba(124,58,237,0.4)' }}>
                        {initials}
                    </div>
                    <div>
                        <h2 style={{ fontWeight: 800, fontSize: 22, color: 'var(--text)', margin: '0 0 4px' }}>{displayName}</h2>
                        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 10px' }}>{role} · {email}</p>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <span style={{ padding: '4px 12px', background: 'var(--success-light)', color: 'var(--success)', borderRadius: 999, fontSize: 12, fontWeight: 700 }}>Active</span>
                            <span style={{ padding: '4px 12px', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: 999, fontSize: 12, fontWeight: 700 }}>{role}</span>
                        </div>
                    </div>
                    <button className="btn-secondary" style={{ marginLeft: 'auto' }} onClick={() => setEditing(!editing)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                        Edit Profile
                    </button>
                </div>

                {editing ? (
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Display Name</label>
                            <input className="input" value={name} onChange={e => setName(e.target.value)} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Email</label>
                            <input className="input" value={email} onChange={e => setEmail(e.target.value)} />
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button className="btn-primary" onClick={() => { localStorage.setItem('username', email); setEditing(false); }}>Save Changes</button>
                            <button className="btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
                        </div>
                    </div>
                ) : (
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 24 }}>
                        <h3 style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 16 }}>Account Information</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            {[
                                { label: 'Full Name', value: displayName },
                                { label: 'Email Address', value: email },
                                { label: 'Role', value: role },
                                { label: 'Member Since', value: 'February 2026' },
                            ].map(field => (
                                <div key={field.label}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{field.label}</div>
                                    <div style={{ fontSize: 14, color: 'var(--text)', fontWeight: 600 }}>{field.value}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                {[
                    { label: 'Jobs Created', value: '8' },
                    { label: 'Interviews Done', value: '34' },
                    { label: 'Candidates Reviewed', value: '127' },
                ].map(s => (
                    <div key={s.label} className="card" style={{ padding: '20px', textAlign: 'center' }}>
                        <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--primary)', marginBottom: 4 }}>{s.value}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{s.label}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}
