import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { interviewApi } from '../api';

function PriorityBadge({ level }: { level: 'HIGH' | 'MEDIUM' }) {
    return <span className={level === 'HIGH' ? 'badge-high' : 'badge-medium'}>{level}</span>;
}

function SkillBar({ name, pct }: { name: string; pct: number }) {
    return (
        <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{name}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--blue)' }}>{pct}%</span>
            </div>
            <div className="progress-bar-track">
                <div className="progress-bar-fill" style={{ width: `${pct}%`, background: Number(pct) >= 80 ? 'var(--success)' : 'var(--blue)' }} />
            </div>
        </div>
    );
}

type TranscriptEntry = { speaker: string; text: string; timestamp: string };

export default function InterviewDashboard() {
    const { sessionId } = useParams();
    const navigate = useNavigate();
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
    const [suggestions, setSuggestions] = useState<{ text: string; priority: 'HIGH' | 'MEDIUM'; detail: string }[]>([]);
    const [chunkIndex, setChunkIndex] = useState(0);
    const [endLoading, setEndLoading] = useState(false);
    const transcriptRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: 'smooth' });
    }, [transcript]);

    useEffect(() => {
        let timer: ReturnType<typeof setInterval>;
        if (isRecording && sessionId) {
            timer = setInterval(async () => {
                try {
                    const res = await interviewApi.addTranscriptChunk(
                        parseInt(sessionId), 'Candidate',
                        '[Mock STT] Responding to interviewer question...'
                    );
                    if (res.data.added) {
                        setTranscript(prev => [...prev, { speaker: res.data.added.speaker, text: res.data.added.text, timestamp: res.data.added.timestamp }]);
                    }
                    if (res.data.suggestions?.length) {
                        const mapped = res.data.suggestions.map((s: string, i: number) => ({
                            text: s,
                            priority: i % 2 === 0 ? 'HIGH' : 'MEDIUM' as 'HIGH' | 'MEDIUM',
                            detail: 'Dive deeper into implementation details and real-world experience.'
                        }));
                        setSuggestions(mapped);
                    }
                    setChunkIndex(i => i + 1);
                } catch (e) { console.error(e); }
            }, 4000);
        }
        return () => clearInterval(timer);
    }, [isRecording, sessionId, chunkIndex]);

    const endSession = async () => {
        setIsRecording(false);
        setEndLoading(true);
        try {
            if (sessionId) await interviewApi.generateScorecard(parseInt(sessionId));
            navigate(`/evaluate/${sessionId}`);
        } catch (e) { console.error(e); } finally { setEndLoading(false); }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 116px)', gap: 0 }}>
            {/* Page header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                    <h1 style={{ fontWeight: 800, fontSize: 26, color: 'var(--text)', margin: '0 0 2px' }}>Interview Assistant</h1>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>AI-Powered Recruitment Platform</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ padding: '6px 14px', background: 'var(--success-light)', color: 'var(--success)', borderRadius: 999, fontWeight: 600, fontSize: 13, border: '1px solid rgba(34,197,94,0.3)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--success)', animation: isRecording ? 'pulse 1.5s infinite' : 'none', display: 'inline-block' }} />
                        Live Session
                    </div>
                </div>
            </div>

            {/* Three-column layout */}
            <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 280px', gap: 16, flex: 1, minHeight: 0 }}>

                {/* LEFT: Candidate profile + Resume Score + Skills */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
                    {/* Profile */}
                    <div className="card" style={{ padding: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, #3B82F6, #7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 18, flexShrink: 0 }}>
                                S
                            </div>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>Session #{sessionId}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Senior Frontend Engineer</div>
                                <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, color: 'var(--success)', background: 'var(--success-light)', padding: '2px 8px', borderRadius: 999, marginTop: 4 }}>Available</span>
                            </div>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 12 }}>
                            <span>📍 San Francisco, CA</span>
                        </div>
                    </div>

                    {/* Resume Score */}
                    <div className="card" style={{ padding: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Resume Score</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                            <span style={{ fontSize: 34, fontWeight: 800, color: 'var(--success)' }}>87</span>
                            <div>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>
                            </div>
                            <span style={{ fontSize: 16, color: 'var(--text-muted)' }}>/100</span>
                        </div>
                        <div className="progress-bar-track" style={{ marginBottom: 14 }}>
                            <div className="progress-bar-fill" style={{ width: '87%', background: 'linear-gradient(90deg, var(--primary), var(--success))' }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                                <span>Experience:</span><span style={{ fontWeight: 600, color: 'var(--text)' }}>7 years</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                                <span>Education:</span><span style={{ fontWeight: 600, color: 'var(--text)' }}>MS Computer Science</span>
                            </div>
                        </div>
                    </div>

                    {/* Key Skills */}
                    <div className="card" style={{ padding: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="6" /><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" /></svg>
                            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Key Skills</span>
                        </div>
                        <SkillBar name="React" pct={92} />
                        <SkillBar name="TypeScript" pct={88} />
                        <SkillBar name="Node.js" pct={75} />
                        <SkillBar name="System Design" pct={70} />
                    </div>
                </div>

                {/* CENTER: Transcript + controls */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {/* Transcript header */}
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                                <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>Live Interview Transcript</span>
                            </div>
                            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0' }}>Real-time conversation tracking</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>

                    {/* Transcript area */}
                    <div ref={transcriptRef} style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 16, background: 'var(--bg)' }}>
                        {transcript.length === 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', textAlign: 'center', opacity: 0.6 }}>
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ marginBottom: 12 }}><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="22" /></svg>
                                <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 4px' }}>Ready to record</p>
                                <p style={{ fontSize: 13 }}>Press Start below to begin the interview session</p>
                            </div>
                        ) : transcript.map((t, i) => (
                            <div key={i} style={{ animation: 'fadeIn 0.3s ease-out' }}>
                                <div style={{ fontSize: 11, color: t.speaker === 'Interviewer' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span>{t.speaker}</span>
                                    <span style={{ fontWeight: 400 }}>· {t.timestamp}</span>
                                </div>
                                <div style={{ background: t.speaker === 'Interviewer' ? 'var(--surface)' : 'var(--primary-light)', border: `1px solid ${t.speaker === 'Interviewer' ? 'var(--border)' : 'rgba(124,58,237,0.2)'}`, borderRadius: 12, padding: '12px 16px', fontSize: 14, color: 'var(--text)', lineHeight: 1.6 }}>
                                    {t.text}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Controls */}
                    <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 12, flexShrink: 0, background: 'var(--surface)' }}>
                        <button className={isRecording ? 'btn-secondary' : 'btn-success'} style={{ flex: 1 }}
                            onClick={() => setIsRecording(r => !r)}>
                            {isRecording ? (
                                <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><rect width="4" height="14" x="6" y="5" /><rect width="4" height="14" x="14" y="5" /></svg> Stop Recording</>
                            ) : (
                                <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /></svg> Start Interview</>
                            )}
                        </button>
                        <button className="btn-primary" onClick={endSession} disabled={endLoading}>
                            {endLoading ? 'Ending...' : 'End & Evaluate'}
                        </button>
                    </div>
                </div>

                {/* RIGHT: AI Assistant + Suggestions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
                    {/* AI Assistant header */}
                    <div className="card" style={{ padding: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                            <div style={{ width: 36, height: 36, background: 'var(--primary-light)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round">
                                    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z" />
                                    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z" />
                                </svg>
                            </div>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>AI Assistant</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Real-time guidance & insights</div>
                            </div>
                        </div>
                    </div>

                    {/* Suggested follow-ups */}
                    <div className="card" style={{ padding: 20, flex: 1, overflowY: 'auto' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                            <span style={{ fontSize: 18 }}>💡</span>
                            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>Suggested Follow-up Questions</span>
                        </div>

                        {suggestions.length === 0 ? (
                            <div style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', paddingTop: 16, opacity: 0.7 }}>
                                {isRecording ? 'Analyzing conversation...' : 'Start the interview to receive AI suggestions'}
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {suggestions.map((s, i) => (
                                    <div key={i} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px', animation: 'fadeIn 0.4s ease-out' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                            <PriorityBadge level={s.priority} />
                                        </div>
                                        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: '0 0 6px', lineHeight: 1.5 }}>{s.text}</p>
                                        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>{s.detail}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.3;} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
        </div>
    );
}
