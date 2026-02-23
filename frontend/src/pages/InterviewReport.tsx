import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { interviewApi } from '../api';

type Tab = 'transcript' | 'evaluation';

function VerdictChip({ v }: { v: string }) {
    const map: any = { consistent: ['#22C55E', '#DCFCE7'], inconsistent: ['#EF4444', '#FEE2E2'], not_covered: ['#9CA3AF', '#F3F4F6'] };
    const [c, bg] = map[v] || ['#9CA3AF', '#F3F4F6'];
    return <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: bg, color: c }}>{v.replace('_', ' ')}</span>;
}

function ScoreBar({ label, score, weight }: { label: string; score: number; weight?: number }) {
    const color = score >= 80 ? '#22C55E' : score >= 60 ? '#3B82F6' : '#F59E0B';
    return (
        <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {weight && <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>weight {Math.round(weight * 100)}%</span>}
                    <span style={{ fontWeight: 800, color, fontSize: 14 }}>{score}/100</span>
                </div>
            </div>
            <div className="progress-bar-track" style={{ height: 8 }}>
                <div className="progress-bar-fill" style={{ width: `${score}%`, background: color }} />
            </div>
        </div>
    );
}

export default function InterviewReport() {
    const { sessionId } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();
    const [tab, setTab] = useState<Tab>('transcript');
    const [report, setReport] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!sessionId) return;
        const load = async () => {
            try {
                const r = await interviewApi.getReport(parseInt(sessionId));
                setReport(r.data);
            } catch { console.error('Report load error'); }
            finally { setLoading(false); }
        };
        load();
        // Poll until interview_evaluation is ready (Gemini runs in background)
        const t = setInterval(async () => {
            try {
                const r = await interviewApi.getReport(parseInt(sessionId));
                setReport(r.data);
                if (r.data.interview_evaluation?.interview_score) clearInterval(t);
            } catch { }
        }, 5000);
        return () => clearInterval(t);
    }, [sessionId]);

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 16 }}>
                <div style={{ width: 48, height: 48, border: '4px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>Loading interview report...</p>
            </div>
        );
    }

    const eval_ = report?.interview_evaluation || {};
    const criterionScores: any[] = eval_?.criterion_scores || [];
    const interviewScore = eval_?.interview_score ? Math.round(eval_.interview_score * 100) : null;
    const transcriptList: any[] = report?.transcript || [];

    return (
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <button onClick={() => navigate('/evaluations')} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 12, padding: 0, fontFamily: 'Inter, sans-serif' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
                    Back to Evaluations
                </button>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h1 style={{ fontWeight: 900, fontSize: 28, color: 'var(--text)', margin: '0 0 4px' }}>Interview Report</h1>
                        <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>
                            {report?.candidate?.name || 'Candidate'} · {report?.job_title}
                            {report?.duration_minutes && <span> · {report.duration_minutes} min session</span>}
                        </p>
                    </div>
                    {interviewScore && (
                        <div className="glass" style={{ padding: '12px 20px', textAlign: 'center' }}>
                            <div style={{ fontSize: 28, fontWeight: 900, color: interviewScore >= 75 ? '#22C55E' : interviewScore >= 55 ? '#F59E0B' : '#EF4444' }}>{interviewScore}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>Interview Score</div>
                        </div>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--surface-2)', borderRadius: 12, padding: 4, border: '1px solid var(--glass-border)', backdropFilter: 'blur(8px)', width: 'fit-content' }}>
                {([['transcript', '📝 Transcript'], ['evaluation', '🧠 AI Evaluation']] as const).map(([t, label]) => (
                    <button key={t} onClick={() => setTab(t)}
                        style={{
                            padding: '9px 22px', borderRadius: 9, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                            background: tab === t ? 'var(--primary)' : 'transparent',
                            color: tab === t ? 'white' : 'var(--text-muted)'
                        }}>
                        {label}
                    </button>
                ))}
            </div>

            {/* Tab 1: Transcript */}
            {tab === 'transcript' && (
                <div className="glass" style={{ padding: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <h3 style={{ fontWeight: 800, fontSize: 17, color: 'var(--text)', margin: 0 }}>Full Interview Transcript</h3>
                        <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>{transcriptList.length} segments</span>
                    </div>
                    {transcriptList.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
                            <p>No transcript available. Transcript is populated during the interview session.</p>
                            <p style={{ fontSize: 12, marginTop: 8 }}>Use the STT feature in the Interview Room to record the conversation.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            {transcriptList.map((t, i) => (
                                <div key={i}>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: t.speaker === 'Interviewer' ? 'var(--primary)' : 'var(--blue)', marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
                                        <span>{t.speaker}</span><span style={{ fontWeight: 400, color: 'var(--text-faint)' }}>{t.timestamp}</span>
                                    </div>
                                    <div style={{ background: t.speaker === 'Interviewer' ? 'var(--surface-2)' : 'var(--primary-light)', border: '1px solid var(--glass-border)', borderRadius: 12, padding: '12px 16px', fontSize: 14, color: 'var(--text)', lineHeight: 1.6 }}>
                                        {t.text}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Tab 2: AI Evaluation */}
            {tab === 'evaluation' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {!eval_.interview_score ? (
                        <div className="glass" style={{ padding: 48, textAlign: 'center' }}>
                            <div style={{ width: 48, height: 48, border: '4px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
                            <p style={{ color: 'var(--text-muted)', fontSize: 15, fontWeight: 600 }}>Gemini Flash is analyzing the interview...</p>
                            <p style={{ color: 'var(--text-faint)', fontSize: 13 }}>This may take 15-30 seconds. The page will auto-refresh.</p>
                        </div>
                    ) : (
                        <>
                            {/* Summary */}
                            <div className="glass" style={{ padding: '24px 28px' }}>
                                <h3 style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44" /><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44" /></svg>
                                    Gemini Flash Analysis
                                </h3>
                                <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.7, fontStyle: 'italic', background: 'var(--surface-2)', padding: '14px 16px', borderRadius: 10 }}>
                                    "{eval_.key_insights}"
                                </p>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 16 }}>
                                    {[
                                        { label: 'Interview Score', value: `${Math.round(eval_.interview_score * 100)}%`, color: 'var(--primary)' },
                                        { label: 'Consistency', value: `${Math.round((eval_.consistency_score || 0.8) * 100)}%`, color: 'var(--blue)' },
                                        { label: 'Communication', value: `${eval_.communication_score || 78}/100`, color: 'var(--success)' },
                                    ].map(s => (
                                        <div key={s.label} style={{ textAlign: 'center', padding: '14px', background: 'var(--surface-2)', borderRadius: 12, border: '1px solid var(--glass-border)' }}>
                                            <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{s.value}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, fontWeight: 500 }}>{s.label}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Criterion scores */}
                            {criterionScores.length > 0 && (
                                <div className="glass" style={{ padding: '24px 28px' }}>
                                    <h3 style={{ fontWeight: 800, fontSize: 16, color: 'var(--text)', margin: '0 0 20px' }}>Per-Criterion Scores</h3>
                                    {criterionScores.map((c: any, i: number) => (
                                        <div key={i} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: i < criterionScores.length - 1 ? '1px solid var(--border)' : 'none' }}>
                                            <ScoreBar label={c.criterion} score={c.score} weight={c.weight} />
                                            {c.evidence && <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 4px', fontStyle: 'italic' }}>"{c.evidence}"</p>}
                                            <VerdictChip v={c.consistency_with_resume || 'consistent'} />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Strengths + Red Flags */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div className="glass" style={{ padding: '20px 24px' }}>
                                    <h4 style={{ fontWeight: 700, fontSize: 15, color: '#22C55E', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                                        Strengths Demonstrated
                                    </h4>
                                    {(eval_.strengths_demonstrated || []).map((s: string, i: number) => (
                                        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                                            <span style={{ color: '#22C55E', flexShrink: 0 }}>●</span>
                                            <span style={{ fontSize: 13, color: 'var(--text)' }}>{s}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="glass" style={{ padding: '20px 24px' }}>
                                    <h4 style={{ fontWeight: 700, fontSize: 15, color: '#EF4444', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                        Red Flags
                                    </h4>
                                    {(eval_.red_flags || ['None identified']).map((s: string, i: number) => (
                                        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                                            <span style={{ color: '#EF4444', flexShrink: 0 }}>●</span>
                                            <span style={{ fontSize: 13, color: 'var(--text)' }}>{s}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* CTA */}
                            <button className="btn-primary" style={{ width: '100%', padding: 14, fontSize: 15 }}
                                onClick={() => navigate(`/evaluate/${report?.application_id}`)}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21" /></svg>
                                Proceed to Final Assessment
                            </button>
                        </>
                    )}
                </div>
            )}

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
