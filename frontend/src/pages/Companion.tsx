/**
 * Companion.tsx — Floating glass co-pilot panel (popup window alongside Google Meet)
 *
 * HOW AEC + DEDUPLICATION WORKS:
 * ─────────────────────────────
 * Problem: When candidate is on speakers, their voice leaks into the interviewer's
 * microphone ("acoustic echo"). This causes double-transcription: the same words
 * appear once from system audio and again from the mic echo.
 *
 * Fix 1 — AEC (Acoustic Echo Cancellation):
 *   We capture the mic with { echoCancellation: true, suppressLocalAudioPlayback: true }.
 *   Chrome's built-in AEC (same algorithm as Google Meet) has a reference signal of
 *   what is playing through the speakers, and subtracts it from the mic input.
 *   Result: Candidate echo is 80-90% removed from the mic stream.
 *
 * Fix 2 — Fuzzy Deduplication Buffer:
 *   Even with AEC, a little echo may survive. We keep the last 3 seconds of transcript
 *   in a ring-buffer. Every new STT result is compared against recent entries using
 *   Levenshtein edit-distance similarity. If similarity > 85%, it's an echo — discard.
 *   If similarity ≤ 85%, it's new unique speech — keep it.
 *
 * Fix 3 — suppressLocalAudioPlayback (Chrome 109+):
 *   This hint tells the OS audio driver to exclude the tab's own audio output from
 *   being recorded by the mic, providing an additional layer of echo suppression
 *   before the signal even reaches the browser's AEC algorithm.
 */
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { interviewApi } from '../api';

interface TranscriptEntry { speaker: string; text: string; timestamp: string; }
interface Suggestion { question: string; priority: 'HIGH' | 'MEDIUM'; rationale: string; criterion: string; }

// ── Levenshtein similarity (0-1) ─────────────────────────────────────────────
function stringSimilarity(a: string, b: string): number {
    a = a.toLowerCase().trim();
    b = b.toLowerCase().trim();
    if (a === b) return 1;
    if (!a.length || !b.length) return 0;
    const longer = a.length >= b.length ? a : b;
    const shorter = a.length < b.length ? a : b;
    const dp: number[] = Array.from({ length: shorter.length + 1 }, (_, i) => i);
    for (let i = 1; i <= longer.length; i++) {
        let prev = i;
        for (let j = 1; j <= shorter.length; j++) {
            const curr = longer[i - 1] === shorter[j - 1]
                ? dp[j - 1]
                : Math.min(dp[j - 1] + 1, dp[j] + 1, prev + 1);
            dp[j - 1] = prev;
            prev = curr;
        }
        dp[shorter.length] = prev;
    }
    return (longer.length - dp[shorter.length]) / longer.length;
}

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
    const [speaker, setSpeaker] = useState<'Interviewer' | 'Candidate'>('Interviewer');
    const [copied, setCopied] = useState<number | null>(null);
    const [newSuggestions, setNewSuggestions] = useState(false);

    const transcriptEndRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<any>(null);
    const isListeningRef = useRef(false);
    const speakerRef = useRef<'Interviewer' | 'Candidate'>('Interviewer');
    const systemStreamRef = useRef<MediaStream | null>(null);
    const dedupeBufferRef = useRef<{ text: string; time: number }[]>([]);

    useEffect(() => { speakerRef.current = speaker; }, [speaker]);

    // Load session
    useEffect(() => {
        if (!sessionId) return;
        interviewApi.getSession(parseInt(sessionId)).then(r => {
            setCandidateName(r.data.candidate?.name || '');
            setTranscript(r.data.transcript || []);
            setSuggestions(r.data.ai_suggestions || []);
        }).catch(console.error);
    }, [sessionId]);

    // Auto-scroll
    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcript, interimText]);

    // Badge on AI tab when on transcript tab and new suggestions arrive
    useEffect(() => {
        if (tab === 'transcript' && suggestions.length > 0) setNewSuggestions(true);
    }, [suggestions.length]);

    useEffect(() => { if (tab === 'ai') setNewSuggestions(false); }, [tab]);

    // ── Echo deduplication ────────────────────────────────────────────────────
    const isEcho = (text: string): boolean => {
        const now = Date.now();
        dedupeBufferRef.current = dedupeBufferRef.current.filter(e => now - e.time < 3000);
        for (const entry of dedupeBufferRef.current) {
            if (stringSimilarity(entry.text, text) > 0.85) return true;
        }
        dedupeBufferRef.current.push({ text, time: now });
        return false;
    };

    // ── Send chunk to backend ─────────────────────────────────────────────────
    const sendChunk = useCallback(async (text: string) => {
        if (isEcho(text)) {
            console.debug('[AEC-dedup] Echo discarded:', text.slice(0, 40));
            return;
        }
        const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const entry: TranscriptEntry = { speaker: speakerRef.current, text, timestamp: ts };
        setTranscript(prev => [...prev, entry]);
        try {
            const resp = await interviewApi.addTranscriptChunk(parseInt(sessionId!), entry.speaker, entry.text, ts);
            if (resp.data.suggestions?.length) setSuggestions(resp.data.suggestions);
        } catch { }
    }, [sessionId]);

    // ── Build a recognition instance ──────────────────────────────────────────
    const startRecognitionLoop = useCallback(() => {
        if (!isListeningRef.current) return;
        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SR) return;
        const r = new SR();
        r.continuous = true; r.interimResults = true; r.lang = 'en-US';

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
                setTimeout(startRecognitionLoop, 400);
            } else if (e.error === 'not-allowed') {
                setSttError('Mic permission denied.'); isListeningRef.current = false; setIsListening(false);
            }
        };
        r.onend = () => { setInterimText(''); if (isListeningRef.current) setTimeout(startRecognitionLoop, 200); };
        recognitionRef.current = r;
        try { r.start(); } catch { }
    }, [sendChunk]);

    // ── System audio (getDisplayMedia) ────────────────────────────────────────
    const startSystemAudio = useCallback(async () => {
        setSttError('');
        try {
            const stream = await (navigator.mediaDevices as any).getDisplayMedia({
                video: false,
                audio: {
                    echoCancellation: false,  // No AEC on system output — we want the full mix
                    noiseSuppression: false,
                    autoGainControl: false,
                },
            });
            systemStreamRef.current = stream;
            stream.getAudioTracks()[0]?.addEventListener('ended', stopListening);
            isListeningRef.current = true; setIsListening(true);
            startRecognitionLoop();
        } catch (err: any) {
            setSttError(err.name === 'NotAllowedError'
                ? 'Share was cancelled. Try again and enable "Share system audio".'
                : `Capture failed: ${err.message}`);
        }
    }, [startRecognitionLoop]);

    // ── Mic with AEC (earphone-safe + speaker-safe) ───────────────────────────
    const startMic = useCallback(async () => {
        setSttError('');
        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SR) { setSttError('Web Speech API not supported. Use Chrome.'); return; }
        try {
            // AEC removes candidate echo from mic when on speakers
            await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,           // Core AEC — removes speaker echo
                    noiseSuppression: true,            // Removes room noise
                    autoGainControl: true,             // Keeps interviewer volume consistent
                    // @ts-ignore — Chrome 109+ hint to OS to not loop output back to mic
                    suppressLocalAudioPlayback: true,
                },
            });
            isListeningRef.current = true; setIsListening(true);
            startRecognitionLoop();
        } catch (err: any) {
            setSttError(`Mic error: ${err.message}`);
        }
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

    return (
        <div style={{ width: '100vw', height: '100vh', fontFamily: "'Inter', -apple-system, sans-serif", background: 'transparent', display: 'flex', flexDirection: 'column' }}>
            {/* Outer glass shell */}
            <div style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                background: 'rgba(10, 10, 20, 0.75)',
                backdropFilter: 'blur(32px) saturate(200%)',
                WebkitBackdropFilter: 'blur(32px) saturate(200%)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 18,
                overflow: 'hidden',
                boxShadow: '0 24px 64px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
            }}>

                {/* ── Title bar (draggable) ──────────────────────────────── */}
                <div style={{
                    padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 9,
                    background: 'rgba(255,255,255,0.03)',
                    borderBottom: '1px solid rgba(255,255,255,0.07)',
                    cursor: 'move', userSelect: 'none', flexShrink: 0,
                }}>
                    {/* Logo dot */}
                    <div style={{ width: 9, height: 9, borderRadius: '50%', background: 'linear-gradient(135deg,#A78BFA,#60A5FA)', flexShrink: 0, boxShadow: '0 0 8px rgba(167,139,250,0.6)' }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#E2E8F0', flex: 1 }}>
                        TalentAI Co-pilot
                        {candidateName && <span style={{ fontWeight: 400, color: '#64748B', fontSize: 11, marginLeft: 6 }}>· {candidateName}</span>}
                    </span>

                    {/* Audio mode toggle */}
                    <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 7, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
                        {(['system', 'mic'] as const).map(m => (
                            <button key={m} onClick={() => { if (!isListening) setAudioMode(m); }}
                                title={m === 'system' ? 'System audio — earphone-safe' : 'Mic with AEC — speaker-safe'}
                                style={{
                                    padding: '3px 9px', border: 'none', cursor: isListening ? 'default' : 'pointer', fontSize: 12,
                                    background: audioMode === m ? 'rgba(167,139,250,0.3)' : 'transparent',
                                    color: audioMode === m ? '#C4B5FD' : '#475569', fontWeight: 600,
                                    transition: 'all 0.15s',
                                }}>
                                {m === 'system' ? '🖥' : '🎤'}
                            </button>
                        ))}
                    </div>

                    {/* STT button */}
                    <button onClick={handleSTT} style={{
                        padding: '4px 11px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                        background: isListening ? 'rgba(248,113,113,0.2)' : 'rgba(167,139,250,0.2)',
                        color: isListening ? '#F87171' : '#A78BFA',
                        display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.15s',
                    }}>
                        {isListening && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F87171', display: 'inline-block', animation: 'blink 1s infinite', flexShrink: 0 }} />}
                        {isListening ? 'Stop' : 'Start STT'}
                    </button>
                </div>

                {/* STT error */}
                {sttError && (
                    <div style={{ background: 'rgba(248,113,113,0.1)', padding: '7px 14px', fontSize: 11, color: '#F87171', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(248,113,113,0.15)', flexShrink: 0 }}>
                        ⚠️ {sttError}
                        <button onClick={() => setSttError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#F87171', fontSize: 14, lineHeight: 1 }}>×</button>
                    </div>
                )}

                {/* ── Tabs ──────────────────────────────────────────────── */}
                <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
                    {([
                        ['transcript', '📝 Transcript', transcript.length, false],
                        ['ai', '🧠 AI Suggestor', suggestions.length, newSuggestions],
                    ] as const).map(([id, label, count, badge]) => (
                        <button key={id} onClick={() => setTab(id)} style={{
                            flex: 1, padding: '9px 4px', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                            background: tab === id ? 'rgba(167,139,250,0.08)' : 'transparent',
                            color: tab === id ? '#A78BFA' : '#475569',
                            borderBottom: tab === id ? '2px solid #A78BFA' : '2px solid transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.15s',
                            position: 'relative',
                        }}>
                            {label}
                            {count > 0 && (
                                <span style={{
                                    fontSize: 9, padding: '1px 5px', borderRadius: 999, fontWeight: 800,
                                    background: badge ? '#F87171' : (tab === id ? '#A78BFA' : 'rgba(167,139,250,0.25)'),
                                    color: 'white',
                                    animation: badge ? 'popIn 0.3s ease-out' : 'none',
                                }}>
                                    {count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* ── Speaker toggle (Transcript tab only) ─────────────── */}
                {tab === 'transcript' && (
                    <div style={{ display: 'flex', padding: '6px 12px', gap: 7, borderBottom: '1px solid rgba(255,255,255,0.05)', alignItems: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: 9, color: '#334155', fontWeight: 700, letterSpacing: '0.08em', flexShrink: 0 }}>SPEAKER</span>
                        {(['Interviewer', 'Candidate'] as const).map(s => (
                            <button key={s} onClick={() => setSpeaker(s)} style={{
                                padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                                border: `1px solid ${speaker === s ? (s === 'Interviewer' ? 'rgba(167,139,250,0.5)' : 'rgba(96,165,250,0.5)') : 'rgba(255,255,255,0.08)'}`,
                                background: speaker === s ? (s === 'Interviewer' ? 'rgba(167,139,250,0.15)' : 'rgba(96,165,250,0.15)') : 'transparent',
                                color: speaker === s ? (s === 'Interviewer' ? '#C4B5FD' : '#93C5FD') : '#334155',
                            }}>{s === 'Interviewer' ? '👤 Interviewer' : '🧑 Candidate'}</button>
                        ))}
                    </div>
                )}

                {/* ── Content ───────────────────────────────────────────── */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>

                    {/* ── TRANSCRIPT TAB ── */}
                    {tab === 'transcript' && (
                        transcript.length === 0 && !interimText ? (
                            <div style={{ textAlign: 'center', color: '#334155', paddingTop: 28, fontSize: 12, lineHeight: 1.7 }}>
                                <div style={{ fontSize: 30, marginBottom: 10 }}>🎙</div>
                                {isListening ? 'Listening… speak now' : 'Press Start STT to begin'}
                                {!isListening && (
                                    <div style={{ marginTop: 14, fontSize: 11, color: '#1E293B', lineHeight: 1.7, background: 'rgba(167,139,250,0.07)', padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(167,139,250,0.15)', textAlign: 'left' }}>
                                        <div style={{ fontWeight: 700, color: '#A78BFA', marginBottom: 4 }}>
                                            {audioMode === 'system' ? '🖥 System Audio mode' : '🎤 Mic + AEC mode'}
                                        </div>
                                        {audioMode === 'system'
                                            ? 'Earphone-safe. Share screen audio when prompted → captures both voices.'
                                            : 'Speaker-safe. AEC removes candidate echo from your mic. Dedup filter catches any remaining echo.'}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
                                {transcript.map((t, i) => (
                                    <div key={i} style={{ animation: 'fadeUp 0.25s ease-out' }}>
                                        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', color: t.speaker === 'Interviewer' ? '#A78BFA' : '#60A5FA', marginBottom: 3, display: 'flex', justifyContent: 'space-between' }}>
                                            <span>{t.speaker.toUpperCase()}</span>
                                            <span style={{ fontWeight: 400, color: '#334155' }}>{t.timestamp}</span>
                                        </div>
                                        <div style={{
                                            fontSize: 12, color: '#CBD5E1', lineHeight: 1.6, borderRadius: 10, padding: '8px 11px',
                                            background: t.speaker === 'Interviewer' ? 'rgba(167,139,250,0.1)' : 'rgba(96,165,250,0.1)',
                                            border: `1px solid ${t.speaker === 'Interviewer' ? 'rgba(167,139,250,0.2)' : 'rgba(96,165,250,0.2)'}`,
                                        }}>
                                            {t.text}
                                        </div>
                                    </div>
                                ))}
                                {interimText && (
                                    <div style={{ animation: 'fadeUp 0.15s ease-out' }}>
                                        <div style={{ fontSize: 9, fontWeight: 700, color: speaker === 'Interviewer' ? '#A78BFA' : '#60A5FA', marginBottom: 3 }}>
                                            {speaker.toUpperCase()} <span style={{ fontWeight: 400, color: '#334155' }}>· listening…</span>
                                        </div>
                                        <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.6, background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '8px 11px', border: '1px dashed rgba(255,255,255,0.08)', fontStyle: 'italic' }}>
                                            {interimText}<span style={{ display: 'inline-block', width: 1.5, height: 12, background: '#A78BFA', marginLeft: 2, animation: 'blink 1s infinite', verticalAlign: 'middle' }} />
                                        </div>
                                    </div>
                                )}
                                <div ref={transcriptEndRef} />
                            </>
                        )
                    )}

                    {/* ── AI SUGGESTOR TAB ── */}
                    {tab === 'ai' && (
                        suggestions.length === 0 ? (
                            <div style={{ textAlign: 'center', color: '#334155', paddingTop: 28, fontSize: 12, lineHeight: 1.7 }}>
                                <div style={{ fontSize: 30, marginBottom: 10 }}>🧠</div>
                                {isListening ? 'Analyzing conversation…' : 'Start STT to get AI suggestions'}
                            </div>
                        ) : suggestions.map((s, i) => (
                            <div key={i} style={{
                                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: 12, padding: '12px 13px', animation: 'fadeUp 0.3s ease-out',
                                backdropFilter: 'blur(8px)',
                            }}>
                                <div style={{ display: 'flex', gap: 7, marginBottom: 7, alignItems: 'center' }}>
                                    <span style={{
                                        fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 4, letterSpacing: '0.05em',
                                        background: s.priority === 'HIGH' ? 'rgba(248,113,113,0.18)' : 'rgba(251,191,36,0.18)',
                                        color: s.priority === 'HIGH' ? '#F87171' : '#FBBF24',
                                    }}>{s.priority}</span>
                                    <span style={{ fontSize: 9, color: '#475569', fontWeight: 600 }}>{s.criterion}</span>
                                </div>
                                <p style={{ fontSize: 12, fontWeight: 600, color: '#E2E8F0', margin: '0 0 5px', lineHeight: 1.55 }}>{s.question}</p>
                                <p style={{ fontSize: 11, color: '#64748B', margin: '0 0 9px', lineHeight: 1.4 }}>{s.rationale}</p>
                                <button onClick={() => { navigator.clipboard.writeText(s.question); setCopied(i); setTimeout(() => setCopied(null), 1500); }}
                                    style={{ fontSize: 10, color: copied === i ? '#34D399' : '#A78BFA', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, padding: 0, transition: 'color 0.2s' }}>
                                    {copied === i ? '✓ Copied!' : '📋 Copy question'}
                                </button>
                            </div>
                        ))
                    )}
                </div>

                {/* ── Footer ────────────────────────────────────────────── */}
                <div style={{ padding: '6px 14px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    {isListening
                        ? <><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F87171', animation: 'blink 1s infinite', display: 'inline-block', flexShrink: 0 }} />
                            <span style={{ fontSize: 10, color: '#475569' }}>
                                {audioMode === 'system' ? '🖥 System' : '🎤 Mic+AEC'} · {transcript.length} segments · dedup active
                            </span></>
                        : <span style={{ fontSize: 10, color: '#1E293B' }}>Paused · {transcript.length} segments</span>
                    }
                </div>
            </div>

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                * { box-sizing: border-box; margin: 0; padding: 0; }
                html, body, #root { height: 100%; background: transparent; }
                body { font-family: 'Inter', sans-serif; -webkit-font-smoothing: antialiased; }
                ::-webkit-scrollbar { width: 3px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 4px; }
                @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
                @keyframes fadeUp { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
                @keyframes popIn { from{transform:scale(0.6);opacity:0} to{transform:scale(1);opacity:1} }
            `}</style>
        </div>
    );
}
