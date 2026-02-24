/**
 * Companion.tsx — Floating glass panel for live interviews.
 *
 * Opens as a small popup window alongside Google Meet:
 *   window.open('/companion/123', '_blank', 'popup,width=360,height=600,top=50,left=50')
 *
 * Features:
 *  - Tabs: Live Transcript | AI Co-pilot
 *  - System audio STT (getDisplayMedia — earphone-safe) or Mic fallback
 *  - Speaker toggle (Interviewer / Candidate)
 *  - Glassmorphism translucent UI — no sidebar, no layout chrome
 *  - Draggable by the header handle
 */
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { interviewApi } from '../api';

interface TranscriptEntry { speaker: string; text: string; timestamp: string; }
interface Suggestion { question: string; priority: 'HIGH' | 'MEDIUM'; rationale: string; criterion: string; }

export default function Companion() {
    const { sessionId } = useParams<{ sessionId: string }>();

    const [tab, setTab] = useState<'transcript' | 'ai'>('transcript');
    const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [interimText, setInterimText] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [audioMode, setAudioMode] = useState<'system' | 'mic'>('system');
    const [sttError, setSttError] = useState('');
    const [candidateName, setCandidateName] = useState('');
    const [copied, setCopied] = useState<number | null>(null);

    const transcriptEndRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<any>(null);
    const isListeningRef = useRef(false);
    const speakerRef = useRef<'Interviewer' | 'Candidate'>('Interviewer');
    const [speaker, setSpeaker] = useState<'Interviewer' | 'Candidate'>('Interviewer');
    const systemStreamRef = useRef<MediaStream | null>(null);

    // Sync speaker ref with state
    useEffect(() => { speakerRef.current = speaker; }, [speaker]);

    // Load session data
    useEffect(() => {
        if (!sessionId) return;
        interviewApi.getSession(parseInt(sessionId)).then(r => {
            setCandidateName(r.data.candidate?.name || '');
            setTranscript(r.data.transcript || []);
            setSuggestions(r.data.ai_suggestions || []);
        }).catch(console.error);
    }, [sessionId]);

    // Auto-scroll transcript
    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcript, interimText]);

    // ── STT Helpers ───────────────────────────────────────────────────────────
    const sendChunk = async (text: string) => {
        const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const entry: TranscriptEntry = { speaker: speakerRef.current, text, timestamp: ts };
        setTranscript(prev => [...prev, entry]);
        try {
            const resp = await interviewApi.addTranscriptChunk(parseInt(sessionId!), entry.speaker, entry.text, ts);
            if (resp.data.suggestions?.length) {
                setSuggestions(resp.data.suggestions);
                if (tab === 'transcript') {
                    // Badge on AI tab will hint the user
                }
            }
        } catch { }
    };

    const buildRecognition = useCallback(() => {
        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SR) return null;
        const r = new SR();
        r.continuous = true;
        r.interimResults = true;
        r.lang = 'en-US';
        r.onresult = async (e: any) => {
            let interim = '';
            for (let i = e.resultIndex; i < e.results.length; i++) {
                if (e.results[i].isFinal) {
                    const t = e.results[i][0].transcript.trim();
                    if (t.length > 1) { setInterimText(''); await sendChunk(t); }
                } else { interim += e.results[i][0].transcript; }
            }
            if (interim) setInterimText(interim);
        };
        r.onerror = (e: any) => {
            if (['no-speech', 'audio-capture', 'network'].includes(e.error)) {
                setTimeout(() => { if (isListeningRef.current) startRecognitionLoop(); }, 300);
            } else if (e.error === 'not-allowed') {
                setSttError('Mic permission denied.'); isListeningRef.current = false; setIsListening(false);
            }
        };
        r.onend = () => { setInterimText(''); if (isListeningRef.current) setTimeout(startRecognitionLoop, 200); };
        return r;
    }, [sessionId, tab]);

    const startRecognitionLoop = useCallback(() => {
        const r = buildRecognition(); if (!r) return;
        recognitionRef.current = r;
        try { r.start(); } catch { }
    }, [buildRecognition]);

    const startSystemAudio = useCallback(async () => {
        setSttError('');
        try {
            const stream = await (navigator.mediaDevices as any).getDisplayMedia({
                video: false,
                audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
            });
            systemStreamRef.current = stream;
            stream.getAudioTracks()[0]?.addEventListener('ended', stopListening);
            isListeningRef.current = true; setIsListening(true);
            startRecognitionLoop();
        } catch (err: any) {
            setSttError(err.name === 'NotAllowedError'
                ? 'Share was cancelled. Try again and check "Share system audio".'
                : `Capture failed: ${err.message}`);
        }
    }, [startRecognitionLoop]);

    const startMic = useCallback(() => {
        setSttError('');
        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SR) { setSttError('Web Speech API not supported. Use Chrome.'); return; }
        isListeningRef.current = true; setIsListening(true);
        startRecognitionLoop();
    }, [startRecognitionLoop]);

    const stopListening = useCallback(() => {
        isListeningRef.current = false; setInterimText('');
        try { recognitionRef.current?.stop(); } catch { }
        systemStreamRef.current?.getTracks().forEach(t => t.stop());
        systemStreamRef.current = null; setIsListening(false);
    }, []);

    const handleSTT = () => {
        if (isListening) { stopListening(); return; }
        if (audioMode === 'system') startSystemAudio(); else startMic();
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div style={{
            width: '100vw', height: '100vh', margin: 0, padding: 0,
            fontFamily: "'Inter', -apple-system, sans-serif",
            background: 'transparent',
            display: 'flex', flexDirection: 'column',
        }}>
            {/* Glass shell */}
            <div style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                background: 'rgba(13, 11, 30, 0.82)',
                backdropFilter: 'blur(24px) saturate(180%)',
                WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                border: '1px solid rgba(255,255,255,0.10)',
                borderRadius: 16,
                overflow: 'hidden',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}>

                {/* ── Drag handle / title bar ────────────────────────────── */}
                <div style={{
                    padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
                    background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.08)',
                    cursor: 'move', userSelect: 'none', flexShrink: 0,
                }}>
                    {/* TalentAI dot */}
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#A78BFA', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#F1F5F9', flex: 1 }}>
                        TalentAI Co-pilot  {candidateName && <span style={{ fontWeight: 400, color: '#94A3B8', fontSize: 11 }}>· {candidateName}</span>}
                    </span>
                    {/* Audio mode mini-toggle */}
                    <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: 6, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
                        {(['system', 'mic'] as const).map(m => (
                            <button key={m} title={m === 'system' ? 'System audio — earphone safe' : 'Microphone only'}
                                onClick={() => { if (!isListening) setAudioMode(m); }}
                                style={{
                                    padding: '3px 8px', border: 'none', cursor: isListening ? 'not-allowed' : 'pointer', fontSize: 11,
                                    background: audioMode === m ? '#A78BFA' : 'transparent',
                                    color: audioMode === m ? 'white' : '#94A3B8', fontWeight: 600,
                                }}>
                                {m === 'system' ? '🖥' : '🎤'}
                            </button>
                        ))}
                    </div>
                    {/* STT button */}
                    <button onClick={handleSTT} style={{
                        padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                        background: isListening ? 'rgba(239,68,68,0.25)' : 'rgba(167,139,250,0.25)',
                        color: isListening ? '#F87171' : '#A78BFA',
                        display: 'flex', alignItems: 'center', gap: 5,
                    }}>
                        {isListening && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F87171', display: 'inline-block', animation: 'blink 1s infinite' }} />}
                        {isListening ? 'Stop' : 'Start STT'}
                    </button>
                </div>

                {/* ── STT error ─────────────────────────────────────────── */}
                {sttError && (
                    <div style={{ background: 'rgba(248,113,113,0.12)', padding: '7px 14px', fontSize: 11, color: '#F87171', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                        ⚠️ {sttError}
                        <button onClick={() => setSttError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#F87171', fontSize: 14 }}>×</button>
                    </div>
                )}

                {/* ── Tabs ──────────────────────────────────────────────── */}
                <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
                    {([['transcript', '📝 Transcript', transcript.length], ['ai', '🧠 AI Co-pilot', suggestions.length]] as const).map(([id, label, count]) => (
                        <button key={id} onClick={() => setTab(id)}
                            style={{
                                flex: 1, padding: '8px 4px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                                background: 'transparent',
                                color: tab === id ? '#A78BFA' : '#64748B',
                                borderBottom: tab === id ? '2px solid #A78BFA' : '2px solid transparent',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            }}>
                            {label}
                            {count > 0 && (
                                <span style={{ fontSize: 9, background: tab === id ? '#A78BFA' : 'rgba(167,139,250,0.3)', color: tab === id ? 'white' : '#A78BFA', padding: '1px 5px', borderRadius: 999, fontWeight: 800 }}>
                                    {count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* ── Speaker toggle (shown when transcript tab active) ── */}
                {tab === 'transcript' && (
                    <div style={{ display: 'flex', padding: '7px 12px', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
                        <span style={{ fontSize: 10, color: '#64748B', alignSelf: 'center', fontWeight: 600 }}>SPEAKER</span>
                        {(['Interviewer', 'Candidate'] as const).map(s => (
                            <button key={s} onClick={() => setSpeaker(s)} style={{
                                padding: '3px 10px', borderRadius: 999, border: `1px solid ${speaker === s ? (s === 'Interviewer' ? '#A78BFA' : '#60A5FA') : 'rgba(255,255,255,0.1)'}`,
                                background: speaker === s ? (s === 'Interviewer' ? 'rgba(167,139,250,0.2)' : 'rgba(96,165,250,0.2)') : 'transparent',
                                color: speaker === s ? (s === 'Interviewer' ? '#A78BFA' : '#60A5FA') : '#64748B',
                                fontSize: 11, fontWeight: 600, cursor: 'pointer',
                            }}>{s}</button>
                        ))}
                    </div>
                )}

                {/* ── Content area ──────────────────────────────────────── */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>

                    {/* TRANSCRIPT TAB */}
                    {tab === 'transcript' && (
                        <>
                            {transcript.length === 0 && !interimText ? (
                                <div style={{ textAlign: 'center', color: '#475569', paddingTop: 32, fontSize: 12 }}>
                                    <div style={{ fontSize: 28, marginBottom: 8 }}>🎙</div>
                                    {isListening ? 'Listening… speak now' : 'Press Start STT to begin'}
                                    {audioMode === 'system' && !isListening && (
                                        <div style={{ marginTop: 12, fontSize: 11, color: '#334155', lineHeight: 1.6, background: 'rgba(167,139,250,0.08)', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(167,139,250,0.15)' }}>
                                            🖥 <strong style={{ color: '#A78BFA' }}>System Audio mode</strong><br />
                                            When prompted, select <em>"Share system audio"</em> to capture both voices through earphones.
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <>
                                    {transcript.map((t, i) => (
                                        <div key={i} style={{ animation: 'fadeUp 0.25s ease-out' }}>
                                            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.05em', color: t.speaker === 'Interviewer' ? '#A78BFA' : '#60A5FA', marginBottom: 3, display: 'flex', justifyContent: 'space-between' }}>
                                                <span>{t.speaker.toUpperCase()}</span>
                                                <span style={{ fontWeight: 400, color: '#475569' }}>{t.timestamp}</span>
                                            </div>
                                            <div style={{ fontSize: 12, color: '#E2E8F0', lineHeight: 1.55, background: t.speaker === 'Interviewer' ? 'rgba(167,139,250,0.1)' : 'rgba(96,165,250,0.1)', borderRadius: 8, padding: '7px 10px', border: `1px solid ${t.speaker === 'Interviewer' ? 'rgba(167,139,250,0.2)' : 'rgba(96,165,250,0.2)'}` }}>
                                                {t.text}
                                            </div>
                                        </div>
                                    ))}
                                    {interimText && (
                                        <div style={{ animation: 'fadeUp 0.15s ease-out' }}>
                                            <div style={{ fontSize: 9, fontWeight: 700, color: speaker === 'Interviewer' ? '#A78BFA' : '#60A5FA', marginBottom: 3 }}>
                                                {speaker.toUpperCase()} <span style={{ fontWeight: 400, color: '#475569' }}>· listening…</span>
                                            </div>
                                            <div style={{ fontSize: 12, color: '#94A3B8', lineHeight: 1.55, background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '7px 10px', border: '1px dashed rgba(255,255,255,0.1)', fontStyle: 'italic' }}>
                                                {interimText}<span style={{ display: 'inline-block', width: 1.5, height: 12, background: '#A78BFA', marginLeft: 2, animation: 'blink 1s infinite', verticalAlign: 'middle' }} />
                                            </div>
                                        </div>
                                    )}
                                    <div ref={transcriptEndRef} />
                                </>
                            )}
                        </>
                    )}

                    {/* AI CO-PILOT TAB */}
                    {tab === 'ai' && (
                        <>
                            {suggestions.length === 0 ? (
                                <div style={{ textAlign: 'center', color: '#475569', paddingTop: 32, fontSize: 12 }}>
                                    <div style={{ fontSize: 28, marginBottom: 8 }}>🧠</div>
                                    {isListening ? 'Analyzing conversation…' : 'Start STT to get AI suggestions'}
                                </div>
                            ) : suggestions.map((s, i) => (
                                <div key={i} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '11px 12px', animation: 'fadeUp 0.3s ease-out' }}>
                                    <div style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                                        <span style={{
                                            fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 4, letterSpacing: '0.05em',
                                            background: s.priority === 'HIGH' ? 'rgba(239,68,68,0.18)' : 'rgba(245,158,11,0.18)',
                                            color: s.priority === 'HIGH' ? '#F87171' : '#FBBF24'
                                        }}>{s.priority}</span>
                                        <span style={{ fontSize: 9, color: '#475569', fontWeight: 600 }}>{s.criterion}</span>
                                    </div>
                                    <p style={{ fontSize: 12, fontWeight: 600, color: '#E2E8F0', margin: '0 0 4px', lineHeight: 1.5 }}>{s.question}</p>
                                    <p style={{ fontSize: 11, color: '#64748B', margin: '0 0 8px', lineHeight: 1.4 }}>{s.rationale}</p>
                                    <button onClick={() => { navigator.clipboard.writeText(s.question); setCopied(i); setTimeout(() => setCopied(null), 1500); }}
                                        style={{ fontSize: 10, color: copied === i ? '#34D399' : '#A78BFA', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, padding: 0 }}>
                                        {copied === i ? '✓ Copied!' : '📋 Copy question'}
                                    </button>
                                </div>
                            ))}
                        </>
                    )}
                </div>

                {/* ── Footer status ─────────────────────────────────────── */}
                <div style={{ padding: '6px 14px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    {isListening ? (
                        <><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F87171', animation: 'blink 1s infinite', display: 'inline-block', flexShrink: 0 }} />
                            <span style={{ fontSize: 10, color: '#94A3B8' }}>{audioMode === 'system' ? 'System audio' : 'Mic'} · {transcript.length} segments</span></>
                    ) : (
                        <span style={{ fontSize: 10, color: '#334155' }}>STT paused · {transcript.length} segments</span>
                    )}
                </div>
            </div>

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                * { box-sizing: border-box; margin: 0; padding: 0; }
                html, body, #root { height: 100%; background: transparent; }
                body { font-family: 'Inter', sans-serif; -webkit-font-smoothing: antialiased; }
                ::-webkit-scrollbar { width: 4px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 4px; }
                @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
                @keyframes fadeUp { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
            `}</style>
        </div>
    );
}
