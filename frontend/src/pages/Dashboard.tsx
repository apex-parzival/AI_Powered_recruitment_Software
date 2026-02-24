import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

interface Stats {
    total_jobs: number;
    total_candidates: number;
    total_applications: number;
    completed_applications: number;
    recommended: number;
    total_interviews: number;
    completed_interviews: number;
    final_evaluations: number;
    verdicts: { ACCEPT?: number; HOLD?: number; REJECT?: number };
    avg_resume_score: number;
    acceptance_rate: number;
}

function StatCard({ icon, label, value, sub, color }: any) {
    return (
        <div className="glass" style={{ padding: '22px 24px', display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                {icon}
            </div>
            <div>
                <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--text)', lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginTop: 3 }}>{label}</div>
                {sub && <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>{sub}</div>}
            </div>
        </div>
    );
}

function VerdictBar({ label, count, total, color }: any) {
    const pct = total > 0 ? Math.round(count / total * 100) : 0;
    return (
        <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 13 }}>
                <span style={{ fontWeight: 600, color: 'var(--text)' }}>{label}</span>
                <span style={{ fontWeight: 700, color }}>{count} <span style={{ fontWeight: 400, color: 'var(--text-faint)' }}>({pct}%)</span></span>
            </div>
            <div className="progress-bar-track" style={{ height: 8 }}>
                <div className="progress-bar-fill" style={{ width: `${pct}%`, background: color }} />
            </div>
        </div>
    );
}

export default function Dashboard() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [recentJobs, setRecentJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const username = localStorage.getItem('user_name') || 'Recruiter';

    useEffect(() => {
        const load = async () => {
            try {
                const [sRes, jRes] = await Promise.all([
                    api.get('/stats'),
                    api.get('/jobs'),
                ]);
                setStats(sRes.data);
                setRecentJobs((jRes.data as any[]).slice(0, 5));
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        load();
    }, []);

    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                <div style={{ width: 40, height: 40, border: '4px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            </div>
        );
    }

    return (
        <div>
            {/* Greeting */}
            <div style={{ marginBottom: 28 }}>
                <h1 style={{ fontWeight: 900, fontSize: 28, color: 'var(--text)', margin: '0 0 4px' }}>
                    {greeting}, {username} 👋
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>
                    Here's your TalentAI platform overview
                </p>
            </div>

            {/* Stats grid */}
            <div className="dash-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
                <StatCard icon="💼" label="Active Jobs" value={stats?.total_jobs ?? 0} sub="Across all departments" color="#7C3AED" />
                <StatCard icon="👥" label="Total Candidates" value={stats?.total_candidates ?? 0} sub={`${stats?.recommended ?? 0} recommended`} color="#3B82F6" />
                <StatCard icon="📄" label="Applications" value={stats?.total_applications ?? 0} sub={`${stats?.completed_applications ?? 0} fully scored`} color="#22C55E" />
                <StatCard icon="🎥" label="Interviews" value={stats?.total_interviews ?? 0} sub={`${stats?.completed_interviews ?? 0} completed`} color="#F59E0B" />
                <StatCard icon="📊" label="Avg Resume Score" value={`${stats?.avg_resume_score ?? 0}%`} sub="Powered by Gemini Flash" color="#EF4444" />
                <StatCard icon="✅" label="Accept Rate" value={`${stats?.acceptance_rate ?? 0}%`} sub={`of ${stats?.final_evaluations ?? 0} final evals`} color="#22C55E" />
            </div>

            {/* Two-column bottom */}
            <div className="dash-overview-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Final Verdict Distribution */}
                <div className="glass" style={{ padding: '24px 28px' }}>
                    <h3 style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)', margin: '0 0 20px' }}>
                        Final Verdict Distribution
                    </h3>
                    {stats?.final_evaluations ? (
                        <>
                            <VerdictBar label="✅ ACCEPT" count={stats.verdicts?.ACCEPT ?? 0} total={stats.final_evaluations} color="#22C55E" />
                            <VerdictBar label="⏸ HOLD" count={stats.verdicts?.HOLD ?? 0} total={stats.final_evaluations} color="#F59E0B" />
                            <VerdictBar label="❌ REJECT" count={stats.verdicts?.REJECT ?? 0} total={stats.final_evaluations} color="#EF4444" />
                            <div style={{ marginTop: 14, fontSize: 12, color: 'var(--text-faint)', textAlign: 'right' }}>
                                {stats.final_evaluations} total evaluations
                            </div>
                        </>
                    ) : (
                        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No evaluations yet</p>
                    )}
                </div>

                {/* Recent Jobs */}
                <div className="glass" style={{ padding: '24px 28px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                        <h3 style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)', margin: 0 }}>Recent Jobs</h3>
                        <button onClick={() => navigate('/jobs')} style={{ fontSize: 12, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                            View all →
                        </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {recentJobs.map((j: any) => (
                            <div key={j.id} onClick={() => navigate(`/jobs/${j.id}/pipeline`)}
                                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 12, cursor: 'pointer', border: '1px solid var(--glass-border)', transition: 'all 0.15s' }}
                                onMouseOver={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
                                onMouseOut={e => (e.currentTarget.style.borderColor = 'var(--glass-border)')}>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{j.title}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{j.department}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>{j.application_count ?? 0}</div>
                                    <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>applicants</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
