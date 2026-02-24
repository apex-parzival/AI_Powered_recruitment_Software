import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';

export default function Login() {
    const [role, setRole] = useState<'Recruiter' | 'Employee'>('Recruiter');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const toggleDark = () => {
        const next = !dark;
        setDark(next);
        document.documentElement.classList.toggle('dark', next);
        localStorage.setItem('theme', next ? 'dark' : 'light');
    };

    // Decode Google JWT payload (base64)
    const decodeJwt = (token: string): Record<string, any> => {
        try {
            const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
            return JSON.parse(atob(base64));
        } catch {
            return {};
        }
    };

    const handleGoogleSuccess = (credentialResponse: CredentialResponse) => {
        setError('');
        if (!credentialResponse.credential) {
            setError('Google sign-in failed – no credential returned.');
            return;
        }
        const payload = decodeJwt(credentialResponse.credential);
        localStorage.setItem('user_role', 'Recruiter');
        localStorage.setItem('user_name', payload.name || 'Recruiter');
        localStorage.setItem('username', payload.email || 'recruiter@company.com');
        localStorage.setItem('user_email', payload.email || '');
        localStorage.setItem('user_picture', payload.picture || '');
        navigate('/dashboard');
    };

    const handleGoogleError = () => {
        setError('Google sign-in was cancelled or failed. Please try again.');
    };

    // Employee / fallback email+password login
    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!email) { setError('Please enter your email address.'); return; }
        localStorage.setItem('user_role', role);
        localStorage.setItem('user_name', email.split('@')[0]);
        localStorage.setItem('username', email);
        localStorage.setItem('user_email', email);
        localStorage.setItem('user_picture', '');
        navigate('/dashboard');
    };

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-gradient)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 16px 24px' }}>
            {/* Top bar */}
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', background: 'var(--surface)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderBottom: '1px solid var(--glass-border)', zIndex: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #7C3AED, #9B3AED)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(124,58,237,0.4)' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
                        </svg>
                    </div>
                    <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--text)' }}>TalentAI</span>
                </div>
                <button onClick={toggleDark} style={{ width: 36, height: 36, border: '1px solid var(--glass-border)', borderRadius: '50%', background: 'var(--surface-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 16 }}>
                    {dark ? '☀️' : '🌙'}
                </button>
            </div>

            {/* Card */}
            <div className="card" style={{ width: '100%', maxWidth: 460, padding: 'clamp(24px, 5vw, 44px)' }}>
                <div style={{ marginBottom: 28, textAlign: 'center' }}>
                    <div style={{ width: 56, height: 56, background: 'linear-gradient(135deg, #7C3AED, #9B3AED)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 8px 20px rgba(124,58,237,0.35)' }}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
                        </svg>
                    </div>
                    <h1 style={{ fontWeight: 800, fontSize: 'clamp(22px, 4vw, 28px)', color: 'var(--text)', marginBottom: 6 }}>Welcome back</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Sign in to your recruitment dashboard</p>
                </div>

                {/* Role selector */}
                <div style={{ marginBottom: 24 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-2)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Select your role</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        {(['Recruiter', 'Employee'] as const).map(r => (
                            <button key={r} type="button" onClick={() => setRole(r)} style={{
                                padding: '12px 10px', borderRadius: 12, fontWeight: 600, fontSize: 14, cursor: 'pointer',
                                transition: 'all 0.18s ease',
                                border: role === r ? '2px solid var(--primary)' : '1.5px solid var(--border-2)',
                                background: role === r ? 'var(--primary-light)' : 'var(--surface-2)',
                                color: role === r ? 'var(--primary)' : 'var(--text-muted)',
                                boxShadow: role === r ? '0 0 0 3px rgba(124,58,237,0.1)' : 'none',
                            }}>
                                {r === 'Recruiter' ? '🧑‍💼 ' : '👤 '}{r}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div style={{ marginBottom: 16, padding: '10px 14px', background: 'var(--error-light)', borderRadius: 10, border: '1px solid rgba(239,68,68,0.25)', color: 'var(--error)', fontSize: 13, fontWeight: 500 }}>
                        {error}
                    </div>
                )}

                {/* --- RECRUITER: Google Sign-In --- */}
                {role === 'Recruiter' && (
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                            <div style={{ flex: 1, height: 1, background: 'var(--border-2)' }} />
                            <span style={{ fontSize: 12, color: 'var(--text-faint)', fontWeight: 500 }}>Sign in securely</span>
                            <div style={{ flex: 1, height: 1, background: 'var(--border-2)' }} />
                        </div>

                        {/* Google button centered */}
                        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                            <GoogleLogin
                                onSuccess={handleGoogleSuccess}
                                onError={handleGoogleError}
                                theme="outline"
                                size="large"
                                text="signin_with"
                                shape="rectangular"
                                width="380"
                            />
                        </div>

                        <div style={{ background: 'var(--primary-light)', borderRadius: 12, padding: '12px 14px', border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                <span style={{ fontSize: 16 }}>🔒</span>
                                <div>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', marginBottom: 2 }}>Recruiter access via Google</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>Your Google account is used for secure authentication. We only access your name, email, and profile picture.</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- EMPLOYEE: Email + Password --- */}
                {role === 'Employee' && (
                    <form onSubmit={handleLogin}>
                        <div style={{ marginBottom: 16 }}>
                            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>Email address</label>
                            <input className="input" type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} required />
                        </div>

                        <div style={{ marginBottom: 24 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>Password</label>
                                <span style={{ fontSize: 13, color: 'var(--primary)', cursor: 'pointer', fontWeight: 500 }}>Forgot password?</span>
                            </div>
                            <input className="input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
                        </div>

                        <button type="submit" className="btn-primary" style={{ width: '100%', padding: '14px', fontSize: 15, marginBottom: 16 }}>
                            Log in as Employee
                        </button>
                    </form>
                )}
            </div>

            <p style={{ marginTop: 20, fontSize: 12, color: 'var(--text-faint)', textAlign: 'center', maxWidth: 360, lineHeight: 1.6 }}>
                By continuing, you agree to our <span style={{ color: 'var(--primary)', cursor: 'pointer' }}>Terms of Service</span> and <span style={{ color: 'var(--primary)', cursor: 'pointer' }}>Privacy Policy</span>
            </p>
        </div>
    );
}
