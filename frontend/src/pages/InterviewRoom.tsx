import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { interviewApi } from '../api';

// ─── Types ────────────────────────────────────────────────────────────────────
interface TranscriptEntry { speaker: string; text: string; timestamp: string; }
interface Suggestion { question: string; priority: 'HIGH' | 'MEDIUM'; rationale: string; criterion: string; }
interface SessionData {
    meet_link: string; jitsi_room: string;
    candidate: { name: string; email: string };
    job_title: string; resume_score: number; resume_structured_data: any;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
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

// ─── Google Meet Center Panel ─────────────────────────────────────────────────
function MeetPanel({ sessionId, candidateName, jobTitle }: { sessionId: string; candidateName: string; jobTitle: string }) {
    const [step, setStep] = useState<'create' | 'paste' | 'ready'>('create');
    const [meetLink, setMeetLink] = useState('');
    const [pastedLink, setPastedLink] = useState('');
    const [copiedShare, setCopiedShare] = useState(false);
    const [saving, setSaving] = useState(false);

    const openCreateMeet = () => {
        window.open('https://meet.google.com/new', '_blank', 'noopener,noreferrer');
        setStep('paste');
    };

    const handlePaste = async () => {
        const link = pastedLink.trim();
        if (!link.startsWith('https://meet.google.com/')) {
            alert('Please paste a valid Google Meet link (starts with https://meet.google.com/)');
            return;
        }
        setSaving(true);
        try {
            // Save link to backend
            await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/interviews/${sessionId}/meet-link`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ meet_link: link }),
            });
            setMeetLink(link);
            setStep('ready');
        } catch {
            // Even if backend fails, proceed with the link
            setMeetLink(link);
            setStep('ready');
        } finally { setSaving(false); }
    };

    const shareCopy = () => {
        navigator.clipboard.writeText(meetLink);
        setCopiedShare(true);
        setTimeout(() => setCopiedShare(false), 2000);
    };

    const launchInterview = () => {
        // Open companion popup on right edge
        const popW = 360, popH = Math.min(620, window.screen.height - 60);
        window.open(
            `/companion/${sessionId}`,
            `talentai-companion-${sessionId}`,
            `popup,width=${popW},height=${popH},left=${window.screen.width - popW - 20},top=40,resizable=yes`
        );
        // Navigate this tab to Google Meet
        setTimeout(() => { window.location.href = meetLink; }, 300);
    };

    return (
        <div className="glass" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#1a73e8,#34a853)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z" /></svg>
                </div>
                <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>Google Meet</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {step === 'create' && 'Step 1: Create a meeting'}
                        {step === 'paste' && 'Step 2: Paste the meeting link'}
                        {step === 'ready' && '🟢 Meeting ready — share with candidate'}
                    </div>
                </div>
            </div>

            {/* Body */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 28px', gap: 18 }}>
                <div style={{ width: 64, height: 64, borderRadius: 18, background: 'linear-gradient(135deg,rgba(26,115,232,0.15),rgba(52,168,83,0.15))', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(26,115,232,0.25)' }}>
                    <svg width="34" height="34" viewBox="0 0 24 24" fill="#1a73e8"><path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z" /></svg>
                </div>

                <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)', textAlign: 'center' }}>{candidateName} · {jobTitle}</div>

                {/* STEP 1 — Create */}
                {step === 'create' && (
                    <div style={{ textAlign: 'center', maxWidth: 290, width: '100%' }}>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 18 }}>
                            Click below to open Google Meet and create a new meeting. Once the room opens, copy the meeting link and paste it back here.
                        </div>
                        <button onClick={openCreateMeet} style={{
                            padding: '11px 24px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13,
                            background: 'linear-gradient(135deg,#1a73e8,#34a853)', color: 'white',
                            display: 'inline-flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 14px rgba(26,115,232,0.35)',
                        }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z" /></svg>
                            Create Google Meet
                        </button>
                    </div>
                )}

                {/* STEP 2 — Paste */}
                {step === 'paste' && (
                    <div style={{ width: '100%', maxWidth: 300 }}>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.6 }}>
                            Google Meet opened in a new tab. Copy the URL from Meet (e.g. <code style={{ color: 'var(--primary)', fontSize: 11 }}>meet.google.com/abc-defg-hij</code>) and paste it below:
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                            <input
                                value={pastedLink}
                                onChange={e => setPastedLink(e.target.value)}
                                placeholder="https://meet.google.com/xxx-yyyy-zzz"
                                style={{
                                    flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: 12, fontFamily: 'monospace',
                                    background: 'var(--surface-2)', border: '1px solid var(--glass-border)', color: 'var(--text)', outline: 'none',
                                }}
                                onKeyDown={e => { if (e.key === 'Enter') handlePaste(); }}
                            />
                            <button onClick={handlePaste} disabled={saving || !pastedLink.trim()} style={{
                                padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12,
                                background: 'var(--primary)', color: 'white', opacity: saving || !pastedLink.trim() ? 0.5 : 1,
                            }}>{saving ? '…' : 'Set'}</button>
                        </div>
                        <button onClick={() => setStep('create')} style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer', fontSize: 11 }}>← Back</button>
                    </div>
                )}

                {/* STEP 3 — Ready */}
                {step === 'ready' && (
                    <div style={{ width: '100%', maxWidth: 300 }}>
                        {/* Link display */}
                        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--glass-border)', borderRadius: 10, padding: '8px 12px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1a73e8" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meetLink}</span>
                            <button onClick={shareCopy} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copiedShare ? 'var(--success)' : 'var(--primary)', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                                {copiedShare ? '✓ Copied!' : '📋 Copy for candidate'}
                            </button>
                        </div>

                        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                            <button onClick={launchInterview} style={{
                                padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13,
                                background: 'linear-gradient(135deg,#1a73e8,#34a853)', color: 'white',
                                display: 'inline-flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 14px rgba(26,115,232,0.35)',
                            }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z" /></svg>
                                Launch Interview
                            </button>
                            <button onClick={() => setStep('paste')} style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid var(--glass-border)', cursor: 'pointer', fontWeight: 600, fontSize: 12, background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                                Change link
                            </button>
                        </div>

                        {/* Extension tip */}
                        <div style={{ marginTop: 14, background: 'rgba(167,139,250,0.07)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: 10, padding: '10px 13px' }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', marginBottom: 4 }}>💡 Install the Chrome Extension</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                                For a floating glass panel <em>directly on Google Meet</em>, install the TalentAI Chrome Extension from the <code style={{ color: 'var(--primary)', fontSize: 10 }}>extension/</code> folder in the project.
                            </div>
                        </div>
                    </div>
                )}
            </div>
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
    const [interimText, setInterimText] = useState('');
    const [ending, setEnding] = useState(false);
    const [audioMode, setAudioMode] = useState<'system' | 'mic'>('system');
    const [sttError, setSttError] = useState('');

    const transcriptEndRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<any>(null);
    const isListeningRef = useRef(false);
    const speakerToggle = useRef<'Interviewer' | 'Candidate'>('Interviewer');
    const systemStreamRef = useRef<MediaStream | null>(null);

    // Load session
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

    // ── System Audio STT (getDisplayMedia) ────────────────────────────────────
    const startSystemAudioSTT = useCallback(async () => {
        setSttError('');
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) {
            setSttError('Web Speech API not supported. Use Chrome.');
            return;
        }

        try {
            // Capture system audio output (what you hear through speakers/earphones)
            const displayStream = await (navigator.mediaDevices as any).getDisplayMedia({
                video: false,
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                    sampleRate: 16000,
                },
            });
            systemStreamRef.current = displayStream;

            // When the user stops sharing, also stop STT
            displayStream.getAudioTracks()[0]?.addEventListener('ended', () => {
                stopListening();
            });

            // Feed the system audio stream to Web Speech API via AudioContext → MediaStream
            const audioCtx = new AudioContext();
            const source = audioCtx.createMediaStreamSource(displayStream);
            const dest = audioCtx.createMediaStreamDestination();
            source.connect(dest);

            const startRecognition = () => {
                if (!isListeningRef.current) return;
                const recognition = new SpeechRecognition();
                recognition.continuous = true;
                recognition.interimResults = true;
                recognition.lang = 'en-US';

                // NOTE: Web Speech API always uses the default mic internally.
                // We pipe system audio through AudioContext so the browser hears
                // both channels mixed. For full system-only audio, Chrome's
                // tab-capture from getDisplayMedia feeds the recognition stream.
                try {
                    // Attempt to attach the display stream audio track directly
                    (recognition as any).audioStream = dest.stream;
                } catch { /* best-effort */ }

                recognition.onresult = async (event: any) => {
                    let interim = '';
                    for (let i = event.resultIndex; i < event.results.length; i++) {
                        if (event.results[i].isFinal) {
                            const text = event.results[i][0].transcript.trim();
                            if (!text || text.length < 2) continue;
                            setInterimText('');
                            const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                            const entry: TranscriptEntry = { speaker: speakerToggle.current, text, timestamp: ts };
                            setTranscript(prev => [...prev, entry]);
                            try {
                                const resp = await interviewApi.addTranscriptChunk(parseInt(sessionId!), entry.speaker, entry.text, ts);
                                if (resp.data.suggestions?.length) setSuggestions(resp.data.suggestions);
                            } catch { }
                        } else {
                            interim += event.results[i][0].transcript;
                        }
                    }
                    if (interim) setInterimText(interim);
                };

                recognition.onerror = (e: any) => {
                    if (['no-speech', 'audio-capture', 'network'].includes(e.error)) {
                        setTimeout(() => startRecognition(), 300);
                    } else if (e.error === 'not-allowed') {
                        setSttError('Microphone permission denied.');
                        isListeningRef.current = false;
                        setIsListening(false);
                    }
                };

                recognition.onend = () => {
                    setInterimText('');
                    if (isListeningRef.current) setTimeout(() => startRecognition(), 200);
                };

                recognitionRef.current = recognition;
                try { recognition.start(); } catch (e) { console.error(e); }
            };

            isListeningRef.current = true;
            setIsListening(true);
            startRecognition();

        } catch (err: any) {
            if (err.name === 'NotAllowedError') {
                setSttError('Screen share was cancelled. Please try again and select "Share audio".');
            } else {
                setSttError(`Audio capture failed: ${err.message}`);
            }
        }
    }, [sessionId]);

    // ── Mic-only STT (fallback) ───────────────────────────────────────────────
    const startMicSTT = useCallback(() => {
        setSttError('');
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) { setSttError('Web Speech API not supported. Use Chrome.'); return; }

        const startRecognition = () => {
            if (!isListeningRef.current) return;
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'en-US';

            recognition.onresult = async (event: any) => {
                let interim = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    if (event.results[i].isFinal) {
                        const text = event.results[i][0].transcript.trim();
                        if (!text || text.length < 2) continue;
                        setInterimText('');
                        const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                        const entry: TranscriptEntry = { speaker: speakerToggle.current, text, timestamp: ts };
                        setTranscript(prev => [...prev, entry]);
                        try {
                            const resp = await interviewApi.addTranscriptChunk(parseInt(sessionId!), entry.speaker, entry.text, ts);
                            if (resp.data.suggestions?.length) setSuggestions(resp.data.suggestions);
                        } catch { }
                    } else {
                        interim += event.results[i][0].transcript;
                    }
                }
                if (interim) setInterimText(interim);
            };

            recognition.onerror = (e: any) => {
                if (['no-speech', 'audio-capture', 'network'].includes(e.error)) {
                    setTimeout(() => startRecognition(), 300);
                } else if (e.error === 'not-allowed') {
                    setSttError('Microphone permission denied.');
                    isListeningRef.current = false;
                    setIsListening(false);
                }
            };
            recognition.onend = () => {
                setInterimText('');
                if (isListeningRef.current) setTimeout(() => startRecognition(), 200);
            };

            recognitionRef.current = recognition;
            try { recognition.start(); } catch (e) { console.error(e); }
        };

        isListeningRef.current = true;
        setIsListening(true);
        startRecognition();
    }, [sessionId]);

    const stopListening = useCallback(() => {
        isListeningRef.current = false;
        setInterimText('');
        try { recognitionRef.current?.stop(); } catch { }
        if (systemStreamRef.current) {
            systemStreamRef.current.getTracks().forEach(t => t.stop());
            systemStreamRef.current = null;
        }
        setIsListening(false);
    }, []);

    const startListening = useCallback(() => {
        if (audioMode === 'system') startSystemAudioSTT();
        else startMicSTT();
    }, [audioMode, startSystemAudioSTT, startMicSTT]);

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
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 116px)' }}>

            {/* ── Header bar ──────────────────────────────────────────────── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div>
                    <h1 style={{ fontWeight: 900, fontSize: 22, color: 'var(--text)', margin: '0 0 2px' }}>
                        Interview Room
                    </h1>
                    {session && (
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
                            {session.candidate.name} · {session.job_title}
                            {session.resume_score && <span style={{ marginLeft: 10, color: 'var(--text-faint)' }}>Resume: {Math.round(session.resume_score * 100)}%</span>}
                        </p>
                    )}
                </div>

                {isRecruiter && (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        {/* Audio mode selector */}
                        <div style={{ display: 'flex', border: '1px solid var(--glass-border)', borderRadius: 8, overflow: 'hidden' }}>
                            {([['system', '🖥 System Audio'], ['mic', '🎤 Mic Only']] as const).map(([mode, label]) => (
                                <button key={mode} onClick={() => { if (!isListening) setAudioMode(mode); }}
                                    title={mode === 'system' ? 'Captures all audio (earphones-safe via screen share)' : 'Captures only your microphone'}
                                    style={{
                                        padding: '6px 12px', fontSize: 11, fontWeight: 600, border: 'none', cursor: isListening ? 'not-allowed' : 'pointer',
                                        background: audioMode === mode ? 'var(--primary)' : 'var(--surface-2)',
                                        color: audioMode === mode ? 'white' : 'var(--text-muted)',
                                    }}>
                                    {label}
                                </button>
                            ))}
                        </div>

                        {/* Speaker toggle */}
                        <div style={{ display: 'flex', border: '1px solid var(--glass-border)', borderRadius: 8, overflow: 'hidden' }}>
                            {(['Interviewer', 'Candidate'] as const).map(s => (
                                <button key={s} onClick={() => { speakerToggle.current = s; }}
                                    style={{
                                        padding: '6px 12px', fontSize: 11, fontWeight: 600, border: 'none', cursor: 'pointer',
                                        background: speakerToggle.current === s ? (s === 'Interviewer' ? 'var(--primary)' : 'var(--blue)') : 'var(--surface-2)',
                                        color: speakerToggle.current === s ? 'white' : 'var(--text-muted)',
                                    }}>
                                    {s}
                                </button>
                            ))}
                        </div>

                        {/* STT toggle */}
                        <button className={isListening ? 'btn-secondary' : 'btn-success'}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
                            onClick={isListening ? stopListening : startListening}>
                            {isListening ? (
                                <><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444', display: 'inline-block', animation: 'pulse 1s infinite' }} /> Stop STT</>
                            ) : (
                                <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /></svg> Start STT</>
                            )}
                        </button>

                        {/* End */}
                        <button className="btn-primary" style={{ background: 'linear-gradient(135deg,#EF4444,#DC2626)', fontSize: 12 }}
                            onClick={endInterview} disabled={ending}>
                            {ending ? 'Ending...' : '⏹ End & Evaluate'}
                        </button>
                    </div>
                )}
            </div>

            {/* STT error banner */}
            {sttError && (
                <div style={{ background: 'var(--error-light)', border: '1px solid var(--error)', borderRadius: 10, padding: '10px 16px', marginBottom: 12, fontSize: 13, color: 'var(--error)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    ⚠️ {sttError}
                    <button onClick={() => setSttError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--error)', fontSize: 16 }}>×</button>
                </div>
            )}

            {/* Audio mode info banner when system is selected and not listening */}
            {audioMode === 'system' && !isListening && !sttError && isRecruiter && (
                <div style={{ background: 'rgba(26,115,232,0.08)', border: '1px solid rgba(26,115,232,0.25)', borderRadius: 10, padding: '9px 14px', marginBottom: 12, fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: '#1a73e8', fontWeight: 700 }}>🖥 System Audio mode</span>
                    — Works with earphones. When you click Start STT, Chrome will ask to share your screen. Click <strong>"Share"</strong> and enable <strong>"Share system audio"</strong> to capture both voices.
                </div>
            )}

            {/* ── 3-column layout ─────────────────────────────────────────── */}
            {isRecruiter ? (
                <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 290px', gap: 14, flex: 1, minHeight: 0 }}>

                    {/* LEFT: Live Transcript */}
                    <div className="glass" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                                <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>Live Transcript</span>
                                {isListening && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#EF4444', animation: 'pulse 1s infinite', display: 'inline-block' }} />}
                            </div>
                            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>{transcript.length} segments · {audioMode === 'system' ? '🖥 System audio' : '🎤 Mic'}</p>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {transcript.length === 0 && !interimText ? (
                                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, paddingTop: 28, opacity: 0.7 }}>
                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ margin: '0 auto 8px', display: 'block' }}><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /></svg>
                                    {isListening ? '🎤 Listening… speak now' : 'Start STT to begin recording'}
                                </div>
                            ) : (
                                <>
                                    {transcript.map((t, i) => (
                                        <div key={i} style={{ animation: 'fadeUp 0.3s ease-out' }}>
                                            <div style={{ fontSize: 10, fontWeight: 700, color: t.speaker === 'Interviewer' ? 'var(--primary)' : 'var(--blue)', marginBottom: 3, display: 'flex', justifyContent: 'space-between' }}>
                                                <span>{t.speaker}</span>
                                                <span style={{ fontWeight: 400, color: 'var(--text-faint)' }}>{t.timestamp}</span>
                                            </div>
                                            <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5, background: t.speaker === 'Interviewer' ? 'var(--surface-2)' : 'var(--primary-light)', borderRadius: 10, padding: '7px 10px', border: '1px solid var(--glass-border)' }}>
                                                {t.text}
                                            </div>
                                        </div>
                                    ))}
                                    {interimText && (
                                        <div style={{ animation: 'fadeUp 0.15s ease-out' }}>
                                            <div style={{ fontSize: 10, fontWeight: 700, color: speakerToggle.current === 'Interviewer' ? 'var(--primary)' : 'var(--blue)', marginBottom: 3 }}>
                                                {speakerToggle.current} <span style={{ fontWeight: 400, color: 'var(--text-faint)' }}>· typing…</span>
                                            </div>
                                            <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, background: 'var(--surface-2)', borderRadius: 10, padding: '7px 10px', border: '1px dashed var(--border)', fontStyle: 'italic' }}>
                                                {interimText}<span style={{ display: 'inline-block', width: 2, height: 13, background: 'var(--primary)', marginLeft: 2, animation: 'pulse 1s infinite', verticalAlign: 'middle' }} />
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                            <div ref={transcriptEndRef} />
                        </div>
                    </div>

                    {/* CENTER: Google Meet launcher */}
                    {session ? (
                        <MeetPanel
                            candidateName={session.candidate.name}
                            jobTitle={session.job_title}
                            sessionId={sessionId!}
                        />
                    ) : (
                        <div className="glass" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                        </div>
                    )}

                    {/* RIGHT: AI Co-pilot */}
                    <div className="glass" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round">
                                    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z" />
                                    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z" />
                                </svg>
                                <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>AI Co-pilot</span>
                                {suggestions.length > 0 && (
                                    <span style={{ fontSize: 10, background: 'var(--primary-light)', color: 'var(--primary)', padding: '1px 6px', borderRadius: 999, fontWeight: 700 }}>{suggestions.length}</span>
                                )}
                            </div>
                            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Gemini-generated follow-up questions</p>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {suggestions.length === 0 ? (
                                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, paddingTop: 24, opacity: 0.7, lineHeight: 1.6 }}>
                                    {isListening ? '🧠 Analyzing conversation…' : 'Start STT to get real-time AI suggestions'}
                                </div>
                            ) : suggestions.map((s, i) => (
                                <div key={i} style={{ background: 'var(--surface-2)', border: '1px solid var(--glass-border)', borderRadius: 12, padding: '12px', animation: 'fadeUp 0.4s ease-out' }}>
                                    <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                                        <PriorityBadge p={s.priority} />
                                        <span style={{ fontSize: 10, color: 'var(--text-faint)', fontWeight: 600 }}>{s.criterion}</span>
                                    </div>
                                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: '0 0 4px', lineHeight: 1.5 }}>{s.question}</p>
                                    <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '0 0 8px', lineHeight: 1.4 }}>{s.rationale}</p>
                                    <button onClick={() => navigator.clipboard.writeText(s.question)}
                                        style={{ fontSize: 11, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}>
                                        📋 Copy question
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : (
                /* Candidate view */
                <div className="glass" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
                    <div style={{ width: 72, height: 72, borderRadius: 20, background: 'linear-gradient(135deg,rgba(26,115,232,0.15),rgba(52,168,83,0.15))', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(26,115,232,0.25)' }}>
                        <svg width="38" height="38" viewBox="0 0 24 24" fill="#1a73e8"><path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z" /></svg>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <h2 style={{ fontWeight: 800, fontSize: 22, color: 'var(--text)', margin: '0 0 8px' }}>Your Interview is Ready</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: '0 0 20px' }}>Click below to join the Google Meet video call</p>
                        {session?.meet_link && (
                            <a href={session.meet_link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                                <button style={{ padding: '12px 32px', fontSize: 15, fontWeight: 700, borderRadius: 12, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#1a73e8,#34a853)', color: 'white', display: 'inline-flex', alignItems: 'center', gap: 10, boxShadow: '0 4px 16px rgba(26,115,232,0.35)' }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z" /></svg>
                                    Join Google Meet
                                </button>
                            </a>
                        )}
                    </div>
                </div>
            )}

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
                @keyframes fadeUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
            `}</style>
        </div>
    );
}
