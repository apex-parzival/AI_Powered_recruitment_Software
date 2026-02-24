import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

const VERDICT_STYLE: Record<string, { bg: string; color: string }> = {
    ACCEPT: { bg: 'rgba(34,197,94,0.15)', color: '#22C55E' },
    HOLD: { bg: 'rgba(245,158,11,0.15)', color: '#F59E0B' },
    REJECT: { bg: 'rgba(239,68,68,0.15)', color: '#EF4444' },
};

export default function Interviews() {
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const load = async () => {
            try {
                const r = await api.get('/candidates?limit=200');
                const withSession = (r.data as any[]).filter(c => c.interview_session_id);
                setSessions(withSession);
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        load();
    }, []);

    const completed = sessions.filter(s => !s.final_verdict).length;
    const evaluated = sessions.filter(s => s.final_verdict).length;

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontWeight: 900, fontSize: 28, color: 'var(--text)', margin: '0 0 4px' }}>Interviews</h1>
                    <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>
                        {sessions.length} interview sessions · {evaluated} fully evaluated
                    </p>
                </div>
            </div>

            {/* Stats strip */}
            <div style={{ display: 'flex', gap: 14, marginBottom: 24 }}>
                {[
                    { label: 'Total Sessions', value: sessions.length, color: 'var(--primary)' },
                    { label: 'Pending Eval', value: completed, color: 'var(--warning)' },
                    { label: 'Fully Evaluated', value: evaluated, color: 'var(--success)' },
                ].map(s => (
                    <div key={s.label} className="glass" style={{ padding: '16px 22px', display: 'flex', alignItems: 'center', gap: 14, flex: 1 }}>
                        <div style={{ fontSize: 28, fontWeight: 900, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div className="glass" style={{ overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ padding: 56, textAlign: 'center' }}>
                        <div style={{ width: 40, height: 40, border: '4px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
                        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading interview sessions...</p>
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)' }}>
                                {['Candidate', 'Position', 'Resume Score', 'Interview Score', 'Final Verdict', 'Actions'].map(h => (
                                    <th key={h} style={{ padding: '12px 18px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', letterSpacing: '0.05em' }}>
                                        {h.toUpperCase()}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {sessions.length === 0 ? (
                                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)', fontSize: 14 }}>
                                    No interview sessions yet. Start an interview from the Candidates page.
                                </td></tr>
                            ) : sessions.map((c, i) => {
                                const vs = c.final_verdict ? VERDICT_STYLE[c.final_verdict] : null;
                                const hue = (i * 47 + 180) % 360;
                                const initials = (c.name || 'C').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
                                return (
                                    <tr key={c.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                                        onMouseOver={e => (e.currentTarget as HTMLElement).style.background = 'var(--surface-2)'}
                                        onMouseOut={e => (e.currentTarget as HTMLElement).style.background = ''}>
                                        {/* Candidate */}
                                        <td style={{ padding: '14px 18px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{ width: 38, height: 38, borderRadius: '50%', background: `hsl(${hue},60%,55%)`, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>{initials}</div>
                                                <div>
                                                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{c.name}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        {/* Position */}
                                        <td style={{ padding: '14px 18px' }}>
                                            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{c.job_title}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.current_role}</div>
                                        </td>
                                        {/* Resume Score */}
                                        <td style={{ padding: '14px 18px' }}>
                                            {c.resume_score != null ? (
                                                <span style={{ fontWeight: 800, fontSize: 15, color: c.resume_score >= 0.75 ? '#22C55E' : c.resume_score >= 0.55 ? '#3B82F6' : '#F59E0B' }}>
                                                    {Math.round(c.resume_score * 100)}%
                                                </span>
                                            ) : <span style={{ color: 'var(--text-faint)', fontSize: 13 }}>—</span>}
                                        </td>
                                        {/* Interview Score */}
                                        <td style={{ padding: '14px 18px' }}>
                                            {c.interview_score != null ? (
                                                <span style={{ fontWeight: 800, fontSize: 15, color: c.interview_score >= 0.75 ? '#22C55E' : c.interview_score >= 0.55 ? '#3B82F6' : '#F59E0B' }}>
                                                    {Math.round(c.interview_score * 100)}%
                                                </span>
                                            ) : <span style={{ color: 'var(--text-faint)', fontSize: 13 }}>Pending</span>}
                                        </td>
                                        {/* Verdict */}
                                        <td style={{ padding: '14px 18px' }}>
                                            {vs ? (
                                                <span style={{ fontSize: 12, fontWeight: 800, padding: '3px 10px', borderRadius: 999, background: vs.bg, color: vs.color }}>
                                                    {c.final_verdict}
                                                </span>
                                            ) : c.interview_score != null ? (
                                                <span style={{ fontSize: 12, color: 'var(--warning)', fontWeight: 600 }}>Needs Evaluation</span>
                                            ) : (
                                                <span style={{ color: 'var(--text-faint)', fontSize: 13 }}>—</span>
                                            )}
                                        </td>
                                        {/* Actions */}
                                        <td style={{ padding: '14px 18px' }}>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button className="btn-secondary" style={{ fontSize: 11, padding: '6px 12px' }}
                                                    onClick={() => navigate(`/interview-report/${c.interview_session_id}`)}>
                                                    📄 Report
                                                </button>
                                                {!c.final_verdict && (
                                                    <button className="btn-primary" style={{ fontSize: 11, padding: '6px 12px' }}
                                                        onClick={() => navigate(`/evaluate/${c.application_id}`)}>
                                                        📋 Evaluate
                                                    </button>
                                                )}
                                                {c.final_verdict && (
                                                    <button className="btn-secondary" style={{ fontSize: 11, padding: '6px 12px' }}
                                                        onClick={() => navigate(`/evaluate/${c.application_id}`)}>
                                                        ✏️ Re-evaluate
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
