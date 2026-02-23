import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
    const [role, setRole] = useState<'Recruiter' | 'Employee'>('Recruiter');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [dark, setDark] = useState(false);
    const navigate = useNavigate();

    const toggleDark = () => {
        setDark(!dark);
        document.documentElement.classList.toggle('dark');
    };

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        localStorage.setItem('user_role', role);
        localStorage.setItem('username', email || 'user@talentai.com');
        navigate('/jobs');
    };

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
            {/* Top bar */}
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: 36, height: 36, background: 'var(--primary)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
                        </svg>
                    </div>
                    <span style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)' }}>TalentAI</span>
                </div>
                <button onClick={toggleDark} style={{ width: 36, height: 36, border: '1px solid var(--border)', borderRadius: '50%', background: 'var(--surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    {dark ? '☀️' : '🌙'}
                </button>
            </div>

            {/* Card */}
            <div className="card" style={{ width: '100%', maxWidth: 480, padding: '40px', marginTop: 60 }}>
                <h1 style={{ fontWeight: 800, fontSize: 28, color: 'var(--text)', marginBottom: 6 }}>Welcome back</h1>
                <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 28 }}>Sign in to access your recruitment dashboard</p>

                <form onSubmit={handleLogin}>
                    <div style={{ marginBottom: 16 }}>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>Email address</label>
                        <input className="input" type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} />
                    </div>

                    <div style={{ marginBottom: 16 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>Password</label>
                            <span style={{ fontSize: 13, color: 'var(--primary)', cursor: 'pointer', fontWeight: 500 }}>Forgot password?</span>
                        </div>
                        <input className="input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
                    </div>

                    <div style={{ marginBottom: 24 }}>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 10 }}>Select your role</label>
                        <div style={{ display: 'flex', gap: 12 }}>
                            {(['Recruiter', 'Employee'] as const).map(r => (
                                <button key={r} type="button" onClick={() => setRole(r)} style={{
                                    flex: 1, padding: '12px', borderRadius: 10, fontWeight: 600, fontSize: 14, cursor: 'pointer', transition: 'all 0.15s',
                                    border: role === r ? '2px solid var(--primary)' : '1px solid var(--border-2)',
                                    background: role === r ? 'var(--primary-light)' : 'var(--surface)',
                                    color: role === r ? 'var(--primary)' : 'var(--text-muted)',
                                }}>
                                    {r}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button type="submit" style={{ width: '100%', padding: '14px', background: 'var(--primary)', color: 'white', fontWeight: 700, fontSize: 16, borderRadius: 10, border: 'none', cursor: 'pointer', marginBottom: 16, transition: 'all 0.15s' }}
                        onMouseOver={e => (e.currentTarget.style.background = 'var(--primary-hover)')}
                        onMouseOut={e => (e.currentTarget.style.background = 'var(--primary)')}>
                        Log in
                    </button>

                    <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
                        Don't have an account? <span style={{ color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }} onClick={() => { }}>Sign up for free</span>
                    </p>
                </form>
            </div>

            <p style={{ marginTop: 20, fontSize: 12, color: 'var(--text-faint)' }}>
                By continuing, you agree to our <span style={{ color: 'var(--primary)', cursor: 'pointer' }}>Terms of Service</span> and <span style={{ color: 'var(--primary)', cursor: 'pointer' }}>Privacy Policy</span>
            </p>
        </div>
    );
}
