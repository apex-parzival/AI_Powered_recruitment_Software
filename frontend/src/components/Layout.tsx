import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';

function ThemeToggle() {
    const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');
    useEffect(() => {
        document.documentElement.classList.toggle('dark', dark);
        localStorage.setItem('theme', dark ? 'dark' : 'light');
    }, [dark]);
    return (
        <button onClick={() => setDark(d => !d)}
            style={{ width: 38, height: 38, borderRadius: '50%', border: '1px solid var(--glass-border)', background: 'var(--surface-2)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, backdropFilter: 'blur(8px)', flexShrink: 0 }}>
            {dark ? '☀️' : '🌙'}
        </button>
    );
}

const navItems = [
    {
        to: '/dashboard', label: 'Dashboard', icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect width="7" height="7" x="3" y="3" rx="1" /><rect width="7" height="7" x="14" y="3" rx="1" /><rect width="7" height="7" x="3" y="14" rx="1" /><rect width="7" height="7" x="14" y="14" rx="1" />
            </svg>
        )
    },
    {
        to: '/jobs', label: 'Jobs', icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect width="20" height="14" x="2" y="7" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
        )
    },
    {
        to: '/candidates', label: 'Candidates', icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
        )
    },
    {
        to: '/interviews', label: 'Interviews', icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
        )
    },
    {
        to: '/evaluations', label: 'Evaluations', icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
        )
    },
    {
        to: '/profile', label: 'Profile', icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="8" r="5" /><path d="M20 21a8 8 0 1 0-16 0" />
            </svg>
        )
    },
];

export default function Layout() {
    const navigate = useNavigate();
    const username = localStorage.getItem('username') || 'user@talentai.com';
    const role = localStorage.getItem('user_role') || 'Recruiter';
    const displayName = localStorage.getItem('user_name') || (username.includes('@') ? username.split('@')[0] : username);
    const initials = displayName.slice(0, 2).toUpperCase();
    const picture = localStorage.getItem('user_picture') || '';

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const handleNavClick = () => setSidebarOpen(false);

    const handleSignOut = () => {
        localStorage.clear();
        navigate('/login');
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>

            {/* Mobile overlay */}
            <div
                className={`sidebar-overlay${sidebarOpen ? ' open' : ''}`}
                onClick={() => setSidebarOpen(false)}
            />

            {/* Sidebar */}
            <aside
                className={`app-sidebar${sidebarOpen ? ' open' : ''}`}
                style={{
                    width: 'var(--sidebar-w, 220px)', flexShrink: 0,
                    background: 'rgba(255,255,255,0.6)',
                    backdropFilter: 'blur(24px) saturate(200%)',
                    WebkitBackdropFilter: 'blur(24px) saturate(200%)',
                    borderRight: '1px solid var(--glass-border)',
                    boxShadow: '4px 0 24px rgba(99,60,180,0.08)',
                    display: 'flex', flexDirection: 'column', padding: '20px 12px',
                    position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50, overflowY: 'auto'
                }}
            >
                {/* Logo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 4, marginBottom: 32 }}>
                    <div style={{ width: 38, height: 38, background: 'linear-gradient(135deg, #7C3AED, #9B3AED)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(124,58,237,0.4)', flexShrink: 0 }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                            <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
                        </svg>
                    </div>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)', letterSpacing: '-0.3px' }}>TalentAI</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500 }}>Recruitment Platform</div>
                    </div>
                </div>

                {/* Nav */}
                <nav style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
                    {navItems.map(item => (
                        <NavLink key={item.to} to={item.to} className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`} onClick={handleNavClick}>
                            {item.icon}
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                {/* User section */}
                <div style={{ background: 'var(--primary-light)', borderRadius: 14, padding: '12px', border: '1px solid rgba(124,58,237,0.15)', display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* Avatar: Google picture or initials */}
                    {picture ? (
                        <img
                            src={picture}
                            alt={displayName}
                            referrerPolicy="no-referrer"
                            style={{ width: 38, height: 38, borderRadius: 12, objectFit: 'cover', flexShrink: 0, border: '2px solid rgba(124,58,237,0.3)' }}
                        />
                    ) : (
                        <div style={{ width: 38, height: 38, borderRadius: 12, background: 'linear-gradient(135deg, var(--primary), #9B3AED)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                            {initials}
                        </div>
                    )}
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{displayName}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>{role}</div>
                    </div>
                    <button onClick={handleSignOut}
                        title="Sign out"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 8, display: 'flex', flexShrink: 0 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                    </button>
                </div>
            </aside>

            {/* Main area */}
            <div className="app-main" style={{ flex: 1, marginLeft: 'var(--sidebar-w, 220px)', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                {/* Top bar */}
                <header className="app-header" style={{
                    position: 'sticky', top: 0, zIndex: 40,
                    background: 'rgba(255,255,255,0.65)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    borderBottom: '1px solid var(--glass-border)',
                    padding: '0 28px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12
                }}>
                    {/* Hamburger (mobile only) */}
                    <button className="hamburger-btn" onClick={() => setSidebarOpen(o => !o)} aria-label="Open menu">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
                        </svg>
                    </button>
                    <div style={{ flex: 1 }} />
                    <ThemeToggle />
                </header>

                <main className="app-content" style={{ flex: 1, padding: '28px 32px', overflowY: 'auto' }}>
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
