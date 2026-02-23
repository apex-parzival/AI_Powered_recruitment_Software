import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { interviewApi } from '../api';

// ─── Types ────────────────────────────────────────────────────────────────────
interface TranscriptEntry { speaker: string; text: string; timestamp: string; }
interface Suggestion { question: string; priority: 'HIGH' | 'MEDIUM'; rationale: string; criterion: string; }
interface SessionData { meet_link: string; jitsi_room: string; candidate: { name: string; email: string }; job_title: string; resume_score: number; resume_structured_data: any; }

// ─── Helpers ──────────────────────────────────────────────────────────────────
function PriorityBadge({ p }: { p: string }) {
    return (
        <span style={{
            fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 4, letterSpacing: '0.06em',
            background: p === 'HIGH' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
            color: p === 'HIGH' ? '#EF4444' : '#F59E0B'
        }}>
            {p}
        </span>
    );
}

function SkillTag({ label, pct }: { label: string; pct?: number }) {
    return (
        <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                <span style={{ fontWeight: 500, color: 'var(--text)' }}>{label}</span>
                {pct !== undefined && <span style={{ fontWeight: 700, color: 'var(--blue)' }}>{pct}%</span>}
            </div>
            {pct !== undefined && (
                <div className="progress-bar-track">
                    <div className="progress-bar-fill" style={{ width: `${pct}%`, background: pct >= 80 ? 'var(--success)' : 'var(--blue)' }} />
                </div>
            )}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function InterviewRoom() {
    const { sessionId } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();
    const userRole = localStorage.getItem('user_role') || 'Recruiter';

    const [session, setSession] = useState<SessionData | null>(null);
    const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [isListening, setIsListening] = useState(false);
    const [ending, setEnding] = useState(false);
    const [jitsiReady, setJitsiReady] = useState(false);

    const transcriptEndRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<any>(null);
    const speakerToggle = useRef<'Interviewer' | 'Candidate'>('Interviewer');

    // Load session data
    useEffect(() => {
        if (!sessionId) return;
        interviewApi.getSession(parseInt(sessionId)).then(r => {
            setSession(r.data);
            setTranscript(r.data.transcript || []);
            setSuggestions(r.data.ai_suggestions || []);
        }).catch(console.error);
    }, [sessionId]);

    // Auto-scroll transcript
    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcript]);

    // Jitsi embed
    useEffect(() => {
        if (!session?.jitsi_room || !jitsiReady) return;
        const script = document.createElement('script');
        script.src = 'https://meet.jit.si/external_api.js';
        script.onload = () => {
            // @ts-ignore
            if (window.JitsiMeetExternalAPI) {
                // @ts-ignore
                new window.JitsiMeetExternalAPI('meet.jit.si', {
                    roomName: session.jitsi_room,
                    parentNode: document.getElementById('jitsi-container'),
                    width: '100%', height: '100%',
                    configOverwrite: { startWithAudioMuted: false, startWithVideoMuted: false },
                    interfaceConfigOverwrite: { TOOLBAR_BUTTONS: ['microphone', 'camera', 'hangup', 'chat', 'settings'] },
                });
            }
        };
        document.head.appendChild(script);
        return () => { document.head.removeChild(script); };
    }, [session, jitsiReady]);

    // Web Speech API
    const startListening = useCallback(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) { alert('Your browser does not support Web Speech API. Please use Chrome.'); return; }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = async (event: any) => {
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    const text = event.results[i][0].transcript.trim();
                    if (!text || text.length < 3) continue;
                    const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                    const entry: TranscriptEntry = { speaker: speakerToggle.current, text, timestamp: ts };
                    setTranscript(prev => [...prev, entry]);

                    // Send to backend
                    try {
                        const resp = await interviewApi.addTranscriptChunk(parseInt(sessionId!), entry.speaker, entry.text, ts);
                        if (resp.data.suggestions?.length) setSuggestions(resp.data.suggestions);
                    } catch { }
                }
            }
        };
        recognition.onerror = (e: any) => console.error('STT error:', e.error);
        recognitionRef.current = recognition;
        recognition.start();
        setIsListening(true);
    }, [sessionId]);

    const stopListening = useCallback(() => {
        recognitionRef.current?.stop();
        setIsListening(false);
    }, []);

    const endInterview = async () => {
        setEnding(true);
        stopListening();
        try {
            await interviewApi.endSession(parseInt(sessionId!));
            navigate(`/interview-report/${sessionId}`);
        } catch { alert('Error ending session'); setEnding(false); }
    };

    const isRecruiter = ['Recruiter', 'HiringManager', 'Admin'].includes(userRole);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 116px)', gap: 0 }}>
            {/* Header bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                    <h1 style={{ fontWeight: 900, fontSize: 24, color: 'var(--text)', margin: '0 0 2px' }}>
                        Interview Room
                    </h1>
                    {session && (
                        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
                            {session.candidate.name} · {session.job_title}
                            {session.meet_link && (
                                <a href={session.meet_link} target="_blank" rel="noopener noreferrer"
                                    style={{ marginLeft: 10, color: 'var(--blue)', fontWeight: 600, textDecoration: 'none' }}>
                                    🔗 Open in Jitsi
                                </a>
                            )}
                        </p>
                    )}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    {isRecruiter && (
                        <>
                            {/* Speaker toggle */}
                            <div style={{ display: 'flex', border: '1px solid var(--glass-border)', borderRadius: 10, overflow: 'hidden', backdropFilter: 'blur(8px)' }}>
                                {(['Interviewer', 'Candidate'] as const).map(s => (
                                    <button key={s} onClick={() => { speakerToggle.current = s; }}
                                        style={{
                                            padding: '8px 14px', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
                                            background: speakerToggle.current === s ? 'var(--primary)' : 'var(--surface-2)',
                                            color: speakerToggle.current === s ? 'white' : 'var(--text-muted)'
                                        }}>
                                        {s}
                                    </button>
                                ))}
                            </div>
                            <button className={isListening ? 'btn-secondary' : 'btn-success'} onClick={isListening ? stopListening : startListening}>
                                {isListening ? (
                                    <><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444', display: 'inline-block', animation: 'pulse 1s infinite' }} /> Stop STT</>
                                ) : (
                                    <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /></svg> Start STT</>
                                )}
                            </button>
                            <button className="btn-primary" style={{ background: 'linear-gradient(135deg,#EF4444,#DC2626)' }} onClick={endInterview} disabled={ending}>
                                {ending ? 'Ending...' : '⏹ End & Evaluate'}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Three-column layout (interviewer) / Single col (candidate) */}
            {isRecruiter ? (
                <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 300px', gap: 14, flex: 1, minHeight: 0 }}>
                    {/* LEFT: Transcript */}
                    <div className="glass" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                                <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>Live Transcript</span>
                                {isListening && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#EF4444', animation: 'pulse 1s infinite', display: 'inline-block' }} />}
                            </div>
                            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>{transcript.length} segments recorded</p>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {transcript.length === 0 ? (
                                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, paddingTop: 32, opacity: 0.7 }}>
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ margin: '0 auto 8px', display: 'block' }}><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /></svg>
                                    Press Start STT to begin recording
                                </div>
                            ) : transcript.map((t, i) => (
                                <div key={i} style={{ animation: 'fadeUp 0.3s ease-out' }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: t.speaker === 'Interviewer' ? 'var(--primary)' : 'var(--blue)', marginBottom: 3, display: 'flex', justifyContent: 'space-between' }}>
                                        <span>{t.speaker}</span><span style={{ fontWeight: 400, color: 'var(--text-faint)' }}>{t.timestamp}</span>
                                    </div>
                                    <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5, background: t.speaker === 'Interviewer' ? 'var(--surface-2)' : 'var(--primary-light)', borderRadius: 10, padding: '8px 10px', border: '1px solid var(--glass-border)' }}>
                                        {t.text}
                                    </div>
                                </div>
                            ))}
                            <div ref={transcriptEndRef} />
                        </div>
                    </div>

                    {/* CENTER: Jitsi Meet */}
                    <div className="glass" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        {!jitsiReady ? (
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
                                <div style={{ width: 64, height: 64, background: 'var(--primary-light)', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round"><rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <h3 style={{ fontWeight: 800, fontSize: 18, color: 'var(--text)', margin: '0 0 8px' }}>Meeting Room</h3>
                                    <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '0 0 20px', maxWidth: 300 }}>
                                        Click to launch the Jitsi Meet room.<br />Share the link with your candidate.
                                    </p>
                                    {session?.meet_link && (
                                        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--glass-border)', borderRadius: 10, padding: '8px 14px', marginBottom: 16, fontSize: 12, color: 'var(--text-muted)', wordBreak: 'break-all' }}>
                                            {session.meet_link}
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                                        <button className="btn-primary" onClick={() => setJitsiReady(true)}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                                            Launch Meeting
                                        </button>
                                        {session?.meet_link && (
                                            <button className="btn-secondary" onClick={() => { navigator.clipboard.writeText(session.meet_link); }}>
                                                📋 Copy Link
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div id="jitsi-container" style={{ flex: 1, minHeight: 400 }} />
                        )}
                    </div>

                    {/* RIGHT: AI Suggestions */}
                    <div className="glass" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round">
                                    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z" />
                                    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z" />
                                </svg>
                                <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>AI Co-pilot</span>
                            </div>
                            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Suggested follow-up questions</p>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {suggestions.length === 0 ? (
                                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, paddingTop: 24, opacity: 0.7 }}>
                                    {isListening ? '🧠 Analyzing conversation...' : 'Start STT to get AI suggestions'}
                                </div>
                            ) : suggestions.map((s, i) => (
                                <div key={i} style={{ background: 'var(--surface-2)', border: '1px solid var(--glass-border)', borderRadius: 12, padding: '12px', animation: 'fadeUp 0.4s ease-out' }}>
                                    <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                                        <PriorityBadge p={s.priority} />
                                        <span style={{ fontSize: 10, color: 'var(--text-faint)', fontWeight: 600 }}>{s.criterion}</span>
                                    </div>
                                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: '0 0 5px', lineHeight: 1.5 }}>{s.question}</p>
                                    <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>{s.rationale}</p>
                                    <button onClick={() => { navigator.clipboard.writeText(s.question); }}
                                        style={{ marginTop: 8, fontSize: 11, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}>
                                        📋 Copy question
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                /* Candidate view — just the Jitsi link */
                <div className="glass" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
                    <h2 style={{ fontWeight: 800, fontSize: 24, color: 'var(--text)' }}>Your Interview is Ready</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>Click below to join the video call</p>
                    {session?.meet_link && (
                        <a href={session.meet_link} target="_blank" rel="noopener noreferrer">
                            <button className="btn-primary" style={{ padding: '14px 32px', fontSize: 16 }}>
                                🎥 Join Meeting
                            </button>
                        </a>
                    )}
                </div>
            )}
        </div>
    );
}
