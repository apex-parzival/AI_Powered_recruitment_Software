import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, interviewApi } from '../api';

const VERDICT_STYLE: Record<string, { bg: string; color: string }> = {
    ACCEPT: { bg: 'rgba(34,197,94,0.15)', color: '#22C55E' },
    HOLD: { bg: 'rgba(245,158,11,0.15)', color: '#F59E0B' },
    REJECT: { bg: 'rgba(239,68,68,0.15)', color: '#EF4444' },
};

function Avatar({ name, idx }: { name: string; idx: number }) {
    const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
    const hue = (idx * 47 + 180) % 360;
    return (
        <div style={{ width: 42, height: 42, borderRadius: '50%', background: `hsl(${hue},60%,55%)`, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, flexShrink: 0 }}>
            {initials || '?'}
        </div>
    );
}

function Score({ value, label }: { value: number | null; label?: string }) {
    if (value == null) return <span style={{ color: 'var(--text-faint)', fontSize: 13 }}>—</span>;
    const pct = value <= 1 ? Math.round(value * 100) : Math.round(value);
    const color = pct >= 75 ? '#22C55E' : pct >= 55 ? '#3B82F6' : '#F59E0B';
    return <span style={{ fontWeight: 800, fontSize: 15, color }}>{pct}<span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-faint)' }}>%</span></span>;
}

export default function Candidates() {
    const [candidates, setCandidates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'all' | 'recommend' | 'interview' | 'evaluated'>('all');
    const [starting, setStarting] = useState<number | null>(null);
    const navigate = useNavigate();

    const load = useCallback(async () => {
        try {
            const r = await api.get('/candidates');
            setCandidates(r.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const startInterview = async (appId: number) => {
        setStarting(appId);
        try {
            const r = await interviewApi.startSession(appId);
            navigate(`/interview-room/${r.data.id}`);
        } catch (e: any) {
            alert(e?.response?.data?.detail || 'Error starting interview');
        } finally { setStarting(null); }
    };

    const filtered = candidates.filter(c => {
        const matchSearch = search === '' || `${c.name} ${c.email} ${c.job_title} ${(c.skills || []).join(' ')}`.toLowerCase().includes(search.toLowerCase());
        const matchFilter =
            filter === 'all' ||
            (filter === 'recommend' && c.recommendation_flag) ||
            (filter === 'interview' && c.interview_session_id) ||
            (filter === 'evaluated' && c.final_verdict);
        return matchSearch && matchFilter;
    });

    const stats = {
        total: candidates.length,
        recommended: candidates.filter(c => c.recommendation_flag).length,
        interviewed: candidates.filter(c => c.interview_session_id).length,
        evaluated: candidates.filter(c => c.final_verdict).length,
    };

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontWeight: 900, fontSize: 28, color: 'var(--text)', margin: '0 0 4px' }}>Candidates</h1>
                    <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>
                        {stats.total} candidates · {stats.recommended} AI-recommended · {stats.evaluated} fully evaluated
                    </p>
                </div>
            </div>

            {/* Quick-filter pills */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                {([
                    ['all', `All (${stats.total})`],
                    ['recommend', `⭐ Recommended (${stats.recommended})`],
                    ['interview', `🎥 Interviewed (${stats.interviewed})`],
                    ['evaluated', `📋 Evaluated (${stats.evaluated})`],
                ] as const).map(([val, label]) => (
                    <button key={val} onClick={() => setFilter(val)}
                        style={{
                            padding: '8px 16px', borderRadius: 999, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                            background: filter === val ? 'var(--primary)' : 'var(--surface-2)',
                            color: filter === val ? 'white' : 'var(--text-muted)',
                            backdropFilter: 'blur(8px)', border: `1px solid ${filter === val ? 'var(--primary)' : 'var(--glass-border)'}` as any
                        }}>
                        {label}
                    </button>
                ))}
                <div style={{ marginLeft: 'auto', position: 'relative' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="2" strokeLinecap="round" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                    <input className="input" placeholder="Search name, role, skills..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 34, width: 240 }} />
                </div>
            </div>

            {/* Table */}
            <div className="glass" style={{ overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ padding: 56, textAlign: 'center' }}>
                        <div style={{ width: 40, height: 40, border: '4px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
                        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading candidates...</p>
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                {['Candidate', 'Role & Skills', 'Resume Score', 'Interview', 'Final Verdict', 'Actions'].map(h => (
                                    <th key={h} style={{ padding: '12px 18px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h.toUpperCase()}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)', fontSize: 14 }}>No candidates match your filter</td></tr>
                            ) : filtered.map((c, idx) => {
                                const verdict = c.final_verdict;
                                const vstyle = verdict ? VERDICT_STYLE[verdict] : null;
                                return (
                                    <tr key={c.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                                        onMouseOver={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'}
                                        onMouseOut={e => (e.currentTarget as HTMLElement).style.background = ''}>
                                        {/* Candidate */}
                                        <td style={{ padding: '14px 18px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <Avatar name={c.name} idx={idx} />
                                                <div>
                                                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        {c.name}
                                                        {c.recommendation_flag && <span style={{ fontSize: 10, background: 'rgba(34,197,94,0.15)', color: '#22C55E', padding: '1px 7px', borderRadius: 999, fontWeight: 700 }}>⭐ TOP</span>}
                                                    </div>
                                                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{c.email}</div>
                                                    {c.experience_years > 0 && <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 1 }}>{c.experience_years} yrs · {c.companies?.[0] || ''}</div>}
                                                </div>
                                            </div>
                                        </td>
                                        {/* Role + Skills */}
                                        <td style={{ padding: '14px 18px' }}>
                                            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{c.job_title}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{c.current_role}</div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                                                {(c.skills || []).slice(0, 3).map((s: string) => (
                                                    <span key={s} style={{ fontSize: 10, background: 'var(--primary-light)', color: 'var(--primary)', padding: '2px 7px', borderRadius: 999, fontWeight: 600 }}>{s}</span>
                                                ))}
                                                {(c.skills || []).length > 3 && <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>+{c.skills.length - 3}</span>}
                                            </div>
                                        </td>
                                        {/* Resume Score */}
                                        <td style={{ padding: '14px 18px' }}>
                                            <Score value={c.resume_score} />
                                        </td>
                                        {/* Interview Score */}
                                        <td style={{ padding: '14px 18px' }}>
                                            {c.interview_session_id ? (
                                                <div>
                                                    <Score value={c.interview_score} />
                                                    <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 2 }}>
                                                        <button onClick={() => navigate(`/interview-report/${c.interview_session_id}`)}
                                                            style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 11, cursor: 'pointer', fontWeight: 600, padding: 0 }}>
                                                            View report →
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : <span style={{ color: 'var(--text-faint)', fontSize: 13 }}>—</span>}
                                        </td>
                                        {/* Final Verdict */}
                                        <td style={{ padding: '14px 18px' }}>
                                            {verdict && vstyle ? (
                                                <div>
                                                    <span style={{ fontSize: 12, fontWeight: 800, padding: '3px 10px', borderRadius: 999, background: vstyle.bg, color: vstyle.color }}>
                                                        {verdict}
                                                    </span>
                                                    {c.final_score && <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 3 }}>{Math.round(c.final_score * 100)}% composite</div>}
                                                </div>
                                            ) : <span style={{ color: 'var(--text-faint)', fontSize: 13 }}>Pending</span>}
                                        </td>
                                        {/* Actions */}
                                        <td style={{ padding: '14px 18px' }}>
                                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                                {!c.interview_session_id && c.status === 'completed' && (
                                                    <button className="btn-primary" style={{ fontSize: 11, padding: '6px 12px' }}
                                                        onClick={() => startInterview(c.application_id)} disabled={starting === c.application_id}>
                                                        {starting === c.application_id ? '...' : '🎥 Interview'}
                                                    </button>
                                                )}
                                                {c.interview_session_id && !c.final_verdict && (
                                                    <button className="btn-secondary" style={{ fontSize: 11, padding: '6px 12px' }}
                                                        onClick={() => navigate(`/evaluate/${c.application_id}`)}>
                                                        📋 Evaluate
                                                    </button>
                                                )}
                                                {c.final_verdict && (
                                                    <button className="btn-secondary" style={{ fontSize: 11, padding: '6px 12px' }}
                                                        onClick={() => navigate(`/evaluate/${c.application_id}`)}>
                                                        View Result
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
