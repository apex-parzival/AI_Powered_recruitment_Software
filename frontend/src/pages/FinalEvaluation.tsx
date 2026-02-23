import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { evaluationApi } from '../api';

const ratingOptions = [
    { label: 'Strong Hire', value: 1.0, color: '#22C55E', bg: '#DCFCE7', desc: 'Outstanding candidate, proceed immediately' },
    { label: 'Hire', value: 0.75, color: '#3B82F6', bg: '#DBEAFE', desc: 'Solid fit, recommend offer' },
    { label: 'Neutral', value: 0.5, color: '#F59E0B', bg: '#FEF3C7', desc: 'Borderline – consider alternatives' },
    { label: 'No Hire', value: 0.25, color: '#F97316', bg: '#FFEDD5', desc: 'Significant concerns noted' },
    { label: 'Strong No', value: 0.0, color: '#EF4444', bg: '#FEE2E2', desc: 'Clear mismatch for this role' },
];

export default function FinalEvaluation() {
    const { applicationId } = useParams<{ applicationId: string }>();
    const navigate = useNavigate();
    const [rating, setRating] = useState(0.75);

    // Dynamic weights
    const [wResume, setWResume] = useState(20);
    const [wInterview, setWInterview] = useState(40);
    const [wTech, setWTech] = useState(20);
    const [wRating, setWRating] = useState(20);

    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);

    const totalWeight = wResume + wInterview + wTech + wRating;

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (totalWeight !== 100) {
            alert('Custom weights must sum exactly to 100%');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                weight_resume: wResume / 100,
                weight_interview: wInterview / 100,
                weight_tech: wTech / 100,
                weight_rating: wRating / 100
            };
            const r = await evaluationApi.submitFinal(parseInt(applicationId || '1'), rating, payload);
            setResult(r.data);
        } catch (err: any) {
            alert(err?.response?.data?.detail || 'Error generating assessment. Ensure interview was completed first.');
        } finally { setLoading(false); }
    };

    const verdict = result?.verdict;
    const verdictStyles: Record<string, { gradient: string; glow: string }> = {
        ACCEPT: { gradient: 'linear-gradient(135deg, #14532D, #22C55E)', glow: 'rgba(34,197,94,0.3)' },
        HOLD: { gradient: 'linear-gradient(135deg, #78350F, #F59E0B)', glow: 'rgba(245,158,11,0.3)' },
        REJECT: { gradient: 'linear-gradient(135deg, #7F1D1D, #EF4444)', glow: 'rgba(239,68,68,0.3)' },
    };

    return (
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
            <div style={{ marginBottom: 28 }}>
                <h1 style={{ fontWeight: 900, fontSize: 28, color: 'var(--text)', margin: '0 0 4px' }}>Final Assessment</h1>
                <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>Candidate #{applicationId} · AI-powered ACCEPT / HOLD / REJECT decision</p>
            </div>

            {!result ? (
                <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* Weight Adjustment */}
                    <div className="glass" style={{ padding: '28px 32px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                            <div>
                                <h3 style={{ fontWeight: 800, fontSize: 17, color: 'var(--text)', margin: '0 0 6px' }}>Evaluation Weights</h3>
                                <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>
                                    Adjust how much each component influences the final decision.
                                </p>
                            </div>
                            <div style={{ padding: '8px 16px', borderRadius: 999, background: totalWeight === 100 ? 'var(--success-light)' : 'var(--error-light)', color: totalWeight === 100 ? 'var(--success)' : 'var(--error)', fontWeight: 800, fontSize: 14, border: `1px solid ${totalWeight === 100 ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
                                Total: {totalWeight}%
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            {[
                                { label: 'Resume Analysis', val: wResume, setter: setWResume, color: 'var(--primary)' },
                                { label: 'Interview Score', val: wInterview, setter: setWInterview, color: 'var(--blue)' },
                                { label: 'Technical Assessment', val: wTech, setter: setWTech, color: '#F59E0B' },
                                { label: 'Your Recruiter Rating', val: wRating, setter: setWRating, color: 'var(--success)' }
                            ].map((w, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                    <div style={{ width: 160, fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>{w.label}</div>
                                    <input
                                        type="range" min="0" max="100" step="5"
                                        value={w.val}
                                        onChange={e => w.setter(parseInt(e.target.value))}
                                        style={{ flex: 1, accentColor: w.color, cursor: 'pointer' }}
                                    />
                                    <div style={{ width: 44, textAlign: 'right', fontWeight: 800, fontSize: 15, color: w.color }}>{w.val}%</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Interviewer rating */}
                    <div className="glass" style={{ padding: '28px 32px' }}>
                        <h3 style={{ fontWeight: 800, fontSize: 17, color: 'var(--text)', margin: '0 0 6px' }}>Your Hiring Recommendation</h3>
                        <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: '0 0 24px' }}>
                            Select your personal verdict for this candidate.
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {ratingOptions.map(opt => (
                                <label key={opt.value} onClick={() => setRating(opt.value)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderRadius: 14, cursor: 'pointer', transition: 'all 0.15s',
                                        border: `2px solid ${rating === opt.value ? opt.color : 'var(--glass-border)'}`,
                                        background: rating === opt.value ? opt.bg : 'var(--surface-2)',
                                        backdropFilter: 'blur(8px)',
                                    }}>
                                    <div style={{ width: 20, height: 20, borderRadius: '50%', border: `3px solid ${opt.color}`, background: rating === opt.value ? opt.color : 'transparent', flexShrink: 0, transition: 'all 0.15s' }} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{opt.label}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{opt.desc}</div>
                                    </div>
                                    <div style={{ fontWeight: 800, fontSize: 18, color: opt.color }}>{(opt.value * 10).toFixed(1)}/10.0</div>
                                </label>
                            ))}
                        </div>
                    </div>

                    <button type="submit" className="btn-primary" style={{ width: '100%', padding: '16px', fontSize: 16 }} disabled={loading}>
                        {loading ? (
                            <><span style={{ display: 'inline-block', width: 18, height: 18, border: '3px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> Gemini is generating final decision...</>
                        ) : (
                            <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" /></svg> Generate Final Decision</>
                        )}
                    </button>
                </form>
            ) : (
                /* RESULT */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeUp 0.5s ease-out' }}>
                    {/* Verdict hero card */}
                    <div className="glass" style={{ overflow: 'hidden' }}>
                        <div style={{ padding: '36px 36px 28px', background: verdictStyles[verdict]?.gradient || 'linear-gradient(135deg,#1a1a2e,#7C3AED)', boxShadow: `0 8px 40px ${verdictStyles[verdict]?.glow || 'rgba(0,0,0,0.3)'}` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>AI Final Decision</div>
                                    <h2 style={{ fontSize: 48, fontWeight: 900, color: 'white', margin: '0 0 10px', letterSpacing: '-1px' }}>{verdict}</h2>
                                    <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 15, margin: 0 }}>{result.action}</p>
                                </div>
                                <div style={{ textAlign: 'center', background: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: '16px 24px', backdropFilter: 'blur(12px)' }}>
                                    <div style={{ fontSize: 44, fontWeight: 900, color: 'white', lineHeight: 1 }}>{result.final_score_pct}</div>
                                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>% composite</div>
                                </div>
                            </div>
                        </div>

                        {/* Score breakdown */}
                        <div style={{ padding: '24px 36px' }}>
                            <h3 style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', margin: '0 0 16px' }}>Score Composition</h3>
                            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                                {[
                                    { label: 'Resume Analysis', val: result.component_scores?.resume || 0, weight: `${wResume}%`, color: 'var(--primary)' },
                                    { label: 'Interview Score', val: result.component_scores?.interview || 0, weight: `${wInterview}%`, color: 'var(--blue)' },
                                    ...(result.technical_score !== undefined ? [{ label: 'Tech Assessment', val: result.technical_score, weight: `${wTech}%`, color: '#F59E0B' }] : []),
                                    { label: 'Your Rating', val: rating, weight: `${wRating}% overlay`, color: 'var(--success)' },
                                ].map(s => (
                                    <div key={s.label} style={{ flex: 1, minWidth: 100, textAlign: 'center', padding: '14px', background: 'var(--surface-2)', borderRadius: 12, border: '1px solid var(--glass-border)' }}>
                                        <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{Math.round(s.val * 100)}%</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginTop: 2 }}>{s.label}</div>
                                        <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 2 }}>weight {s.weight}</div>
                                    </div>
                                ))}
                            </div>

                            {/* AI Narrative */}
                            {result.narrative && (
                                <div style={{ background: 'var(--surface-2)', borderRadius: 12, padding: '16px 18px', borderLeft: `4px solid ${verdictStyles[verdict]?.glow ? 'var(--primary)' : 'var(--border)'}`, marginBottom: 20 }}>
                                    <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.7, margin: 0, fontStyle: 'italic' }}>{result.narrative}</p>
                                </div>
                            )}

                            {/* Strengths / Red flags */}
                            {(result.strengths?.length > 0 || result.red_flags?.length > 0) && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
                                    {result.strengths?.length > 0 && (
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: 13, color: '#22C55E', marginBottom: 8 }}>✓ Key Strengths</div>
                                            {result.strengths.map((s: string, i: number) => <div key={i} style={{ fontSize: 13, color: 'var(--text)', marginBottom: 4 }}>• {s}</div>)}
                                        </div>
                                    )}
                                    {result.red_flags?.length > 0 && (
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: 13, color: '#EF4444', marginBottom: 8 }}>⚠ Concerns</div>
                                            {result.red_flags.map((s: string, i: number) => <div key={i} style={{ fontSize: 13, color: 'var(--text)', marginBottom: 4 }}>• {s}</div>)}
                                        </div>
                                    )}
                                </div>
                            )}

                            <button className="btn-secondary" style={{ width: '100%' }} onClick={() => navigate('/candidates')}>
                                Back to Candidates
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }`}</style>
        </div>
    );
}
