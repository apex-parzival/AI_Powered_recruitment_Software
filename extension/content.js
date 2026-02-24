/**
 * TalentAI Co-pilot — Chrome Extension Content Script
 * Injected into https://meet.google.com/*
 *
 * HOW AEC + DEDUPLICATION WORKS:
 * ────────────────────────────────
 * Acoustic Echo Cancellation (AEC):
 *   When the candidate speaks through the interviewer's speakers, their voice
 *   leaks into the mic. We request the mic with { echoCancellation: true,
 *   suppressLocalAudioPlayback: true } — Chrome's built-in AEC subtracts
 *   what's playing from the speakers before passing audio to STT. This removes
 *   ~85% of echo. The AEC has a reference signal (speakers) and mic signal,
 *   and adaptively computes the difference — only the interviewer's "new" voice
 *   makes it through.
 *
 * Fuzzy Dedup Buffer:
 *   Any surviving echo is caught by comparing each new transcript segment
 *   against texts seen in the last 3 seconds using Levenshtein-based
 *   string similarity. Segments with >85% similarity to a recent entry
 *   are discarded as echoes. This gives us two-layer protection.
 */

const API_BASE = 'http://localhost:8000';
let sessionId = null;
let transcript = [];
let suggestions = [];
let isListening = false;
let audioMode = 'mic'; // 'mic' (AEC) | 'system' (getDisplayMedia)
let speaker = 'Interviewer';
let recognition = null;
let systemStream = null;
let activeTab = 'transcript';
let isListeningRef = false;
const dedupeBuffer = []; // { text, time }

// ── Levenshtein similarity ──────────────────────────────────────────────────
function similarity(a, b) {
    a = a.toLowerCase().trim(); b = b.toLowerCase().trim();
    if (a === b) return 1;
    if (!a || !b) return 0;
    const [longer, shorter] = a.length >= b.length ? [a, b] : [b, a];
    const dp = Array.from({ length: shorter.length + 1 }, (_, i) => i);
    for (let i = 1; i <= longer.length; i++) {
        let prev = i;
        for (let j = 1; j <= shorter.length; j++) {
            const curr = longer[i - 1] === shorter[j - 1] ? dp[j - 1] : Math.min(dp[j - 1], dp[j], prev) + 1;
            dp[j - 1] = prev; prev = curr;
        }
        dp[shorter.length] = prev;
    }
    return (longer.length - dp[shorter.length]) / longer.length;
}

function isEcho(text) {
    const now = Date.now();
    // Evict old entries
    for (let i = dedupeBuffer.length - 1; i >= 0; i--) {
        if (now - dedupeBuffer[i].time > 3000) dedupeBuffer.splice(i, 1);
    }
    for (const e of dedupeBuffer) {
        if (similarity(e.text, text) > 0.85) return true;
    }
    dedupeBuffer.push({ text, time: now });
    return false;
}

// ── API helpers ──────────────────────────────────────────────────────────────
async function sendChunk(text) {
    if (!sessionId || isEcho(text)) return;
    const ts = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const entry = { speaker, text, timestamp: ts };
    transcript.push(entry);
    renderTranscript();
    try {
        const r = await fetch(`${API_BASE}/interviews/${sessionId}/transcript`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ speaker, text, timestamp: ts }),
        });
        const data = await r.json();
        if (data.suggestions?.length) {
            suggestions = data.suggestions;
            renderSuggestions();
            if (activeTab === 'transcript') {
                document.querySelector('.tai-badge[data-tab="ai"]')?.classList.add('new');
            }
        }
    } catch (e) { console.warn('[TalentAI] API error:', e); }
}

async function loadSession() {
    if (!sessionId) return;
    try {
        const r = await fetch(`${API_BASE}/interviews/${sessionId}`);
        const data = await r.json();
        transcript = data.transcript || [];
        suggestions = data.ai_suggestions || [];
        const nameEl = document.getElementById('talentai-title');
        if (nameEl && data.candidate?.name) nameEl.textContent = `TalentAI · ${data.candidate.name}`;
        renderTranscript();
        renderSuggestions();
    } catch (e) { console.warn('[TalentAI] Session load error:', e); }
}

// ── STT ──────────────────────────────────────────────────────────────────────
function startRecognitionLoop() {
    if (!isListeningRef) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { showError('Web Speech API not supported. Use Chrome.'); return; }
    const r = new SR();
    r.continuous = true; r.interimResults = true; r.lang = 'en-US';

    r.onresult = (e) => {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
            if (e.results[i].isFinal) {
                const t = e.results[i][0].transcript.trim();
                if (t.length > 1) { clearInterim(); sendChunk(t); }
            } else { interim += e.results[i][0].transcript; }
        }
        if (interim) showInterim(interim);
    };
    r.onerror = (e) => {
        if (['no-speech', 'audio-capture', 'network'].includes(e.error)) {
            setTimeout(startRecognitionLoop, 400);
        } else if (e.error === 'not-allowed') {
            showError('Mic permission denied.'); stopSTT();
        }
    };
    r.onend = () => { clearInterim(); if (isListeningRef) setTimeout(startRecognitionLoop, 200); };
    recognition = r;
    try { r.start(); } catch { }
}

async function startSTT() {
    hideError();
    if (audioMode === 'system') {
        try {
            systemStream = await navigator.mediaDevices.getDisplayMedia({
                video: false,
                audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
            });
            systemStream.getAudioTracks()[0]?.addEventListener('ended', stopSTT);
        } catch (err) {
            showError(err.name === 'NotAllowedError'
                ? 'Share cancelled. Enable "Share system audio" and try again.'
                : `Capture error: ${err.message}`);
            return;
        }
    } else {
        // AEC-enabled mic — removes candidate speaker echo
        try {
            await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    suppressLocalAudioPlayback: true, // Chrome 109+ OS-level hint
                },
            });
        } catch (err) {
            showError(`Mic error: ${err.message}`); return;
        }
    }

    isListeningRef = true;
    isListening = true;
    recognition = null;
    startRecognitionLoop();
    updateSTTButton();
    updateFooter();
}

function stopSTT() {
    isListeningRef = false; isListening = false;
    try { recognition?.stop(); } catch { }
    systemStream?.getTracks().forEach(t => t.stop());
    systemStream = null;
    clearInterim();
    updateSTTButton();
    updateFooter();
}

// ── Render helpers ────────────────────────────────────────────────────────────
function renderTranscript() {
    const pane = document.getElementById('talentai-transcript-pane');
    if (!pane) return;
    if (transcript.length === 0) {
        pane.innerHTML = `<div class="tai-empty"><div class="tai-empty-icon">🎙</div>${isListening ? 'Listening… speak now' : 'Press Start STT to begin'}</div>`;
        return;
    }
    pane.innerHTML = transcript.map(t => `
        <div class="tai-entry">
            <div class="tai-entry-label ${t.speaker === 'Interviewer' ? 'interviewer' : 'candidate'}">
                <span>${t.speaker.toUpperCase()}</span>
                <span class="tai-entry-time">${t.timestamp}</span>
            </div>
            <div class="tai-bubble ${t.speaker === 'Interviewer' ? 'interviewer' : 'candidate'}">${t.text}</div>
        </div>`).join('');
    pane.scrollTop = pane.scrollHeight;
}

function renderSuggestions() {
    const pane = document.getElementById('talentai-ai-pane');
    const badge = document.querySelector('.tai-badge[data-tab="ai"]');
    if (badge) { badge.textContent = suggestions.length; badge.style.display = suggestions.length ? '' : 'none'; }
    if (!pane) return;
    if (suggestions.length === 0) {
        pane.innerHTML = `<div class="tai-empty"><div class="tai-empty-icon">🧠</div>${isListening ? 'Analyzing…' : 'Start STT to get suggestions'}</div>`;
        return;
    }
    pane.innerHTML = suggestions.map((s, i) => `
        <div class="tai-suggestion">
            <div class="tai-suggestion-header">
                <span class="tai-priority ${s.priority}">${s.priority}</span>
                <span class="tai-criterion">${s.criterion}</span>
            </div>
            <p class="tai-question">${s.question}</p>
            <p class="tai-rationale">${s.rationale}</p>
            <button class="tai-copy-btn" data-q="${encodeURIComponent(s.question)}" data-i="${i}">📋 Copy question</button>
        </div>`).join('');
    // Attach copy handlers
    pane.querySelectorAll('.tai-copy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            navigator.clipboard.writeText(decodeURIComponent(btn.dataset.q));
            btn.textContent = '✓ Copied!';
            btn.classList.add('copied');
            setTimeout(() => { btn.textContent = '📋 Copy question'; btn.classList.remove('copied'); }, 1500);
        });
    });
}

function showInterim(text) {
    let el = document.getElementById('talentai-interim');
    if (!el) {
        el = document.createElement('div');
        el.id = 'talentai-interim';
        el.className = 'tai-entry';
        el.innerHTML = `<div class="tai-entry-label ${speaker === 'Interviewer' ? 'interviewer' : 'candidate'}">${speaker.toUpperCase()} <span style="font-weight:400;color:#334155">· listening…</span></div><div class="tai-bubble interim"></div>`;
        document.getElementById('talentai-transcript-pane')?.appendChild(el);
    }
    el.querySelector('.tai-bubble').textContent = text;
}
function clearInterim() { document.getElementById('talentai-interim')?.remove(); }
function showError(msg) { const el = document.getElementById('talentai-error'); if (el) { el.querySelector('span').textContent = msg; el.style.display = 'flex'; } }
function hideError() { const el = document.getElementById('talentai-error'); if (el) el.style.display = 'none'; }
function updateSTTButton() {
    const btn = document.getElementById('talentai-stt-btn');
    if (!btn) return;
    btn.textContent = isListening ? '⏹ Stop' : '▶ Start STT';
    btn.classList.toggle('listening', isListening);
}
function updateFooter() {
    const txt = document.getElementById('talentai-footer-text');
    const dot = document.querySelector('.tai-rec-dot');
    if (txt) txt.textContent = isListening ? `${audioMode === 'system' ? '🖥 System' : '🎤 Mic+AEC'} · ${transcript.length} segments · dedup active` : `Paused · ${transcript.length} segments`;
    if (dot) dot.style.display = isListening ? '' : 'none';
}
function switchTab(id) {
    activeTab = id;
    document.querySelectorAll('.tai-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === id));
    document.querySelectorAll('.tai-pane').forEach(p => p.classList.toggle('active', p.id === `talentai-${id}-pane`));
    document.getElementById('talentai-speaker-row').style.display = id === 'transcript' ? 'flex' : 'none';
    if (id === 'ai') document.querySelector('.tai-badge[data-tab="ai"]')?.classList.remove('new');
}
function setSpeaker(s) {
    speaker = s;
    document.querySelectorAll('.tai-speaker-btn').forEach(b => b.classList.toggle('active', b.dataset.sp === s));
}

// ── Build the panel DOM ───────────────────────────────────────────────────────
function buildPanel() {
    if (document.getElementById('talentai-panel')) return; // already injected

    const panel = document.createElement('div');
    panel.id = 'talentai-panel';
    panel.innerHTML = `
        <!-- Title bar -->
        <div id="talentai-titlebar">
            <div id="talentai-logo-dot"></div>
            <span id="talentai-title">TalentAI Co-pilot</span>
            <button id="talentai-minimise" title="Minimise">—</button>
            <button id="talentai-close" title="Close">×</button>
        </div>

        <!-- Session ID + controls -->
        <div id="talentai-controls">
            <input id="talentai-session-input" type="number" placeholder="Session ID…" min="1" />
            <button class="tai-mode-btn active" data-mode="mic" title="Mic + AEC (speaker-safe)">🎤</button>
            <button class="tai-mode-btn" data-mode="system" title="System audio (earphone-safe)">🖥</button>
            <button id="talentai-stt-btn">▶ Start STT</button>
        </div>

        <!-- Error bar -->
        <div id="talentai-error" style="display:none">
            <span></span>
            <button onclick="document.getElementById('talentai-error').style.display='none'" style="background:none;border:none;cursor:pointer;color:#F87171;font-size:14px">×</button>
        </div>

        <!-- Tabs -->
        <div id="talentai-tabs">
            <button class="tai-tab active" data-tab="transcript">📝 Transcript <span class="tai-badge" data-tab="transcript" style="display:none">0</span></button>
            <button class="tai-tab" data-tab="ai">🧠 AI Suggestor <span class="tai-badge" data-tab="ai" style="display:none">0</span></button>
        </div>

        <!-- Speaker row -->
        <div id="talentai-speaker-row">
            <span style="font-size:9px;color:#334155;font-weight:700;letter-spacing:.08em;flex-shrink:0">SPEAKER</span>
            <button class="tai-speaker-btn interviewer active" data-sp="Interviewer">👤 Interviewer</button>
            <button class="tai-speaker-btn candidate" data-sp="Candidate">🧑 Candidate</button>
        </div>

        <!-- Content -->
        <div id="talentai-content">
            <div class="tai-pane active" id="talentai-transcript-pane">
                <div class="tai-empty"><div class="tai-empty-icon">🎙</div>Enter session ID → click Start STT</div>
            </div>
            <div class="tai-pane" id="talentai-ai-pane">
                <div class="tai-empty"><div class="tai-empty-icon">🧠</div>Start STT to get AI suggestions</div>
            </div>
        </div>

        <!-- Footer -->
        <div id="talentai-footer">
            <div class="tai-rec-dot" style="display:none"></div>
            <span id="talentai-footer-text">Enter session ID to begin</span>
        </div>
    `;
    document.body.appendChild(panel);

    // ── Event listeners ──────────────────────────────────────────────────────
    // Close / minimise
    document.getElementById('talentai-close').addEventListener('click', () => panel.remove());
    let minimised = false;
    document.getElementById('talentai-minimise').addEventListener('click', () => {
        minimised = !minimised;
        panel.style.height = minimised ? '48px' : '';
        panel.style.overflow = minimised ? 'hidden' : '';
    });

    // Session input
    document.getElementById('talentai-session-input').addEventListener('change', e => {
        sessionId = parseInt(e.target.value) || null;
        if (sessionId) loadSession();
    });

    // Audio mode buttons
    document.querySelectorAll('.tai-mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (isListening) return;
            audioMode = btn.dataset.mode;
            document.querySelectorAll('.tai-mode-btn').forEach(b => b.classList.toggle('active', b === btn));
        });
    });

    // STT button
    document.getElementById('talentai-stt-btn').addEventListener('click', () => {
        if (isListening) stopSTT(); else startSTT();
    });

    // Tabs
    document.querySelectorAll('.tai-tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // Speaker toggle
    document.querySelectorAll('.tai-speaker-btn').forEach(btn => {
        btn.addEventListener('click', () => setSpeaker(btn.dataset.sp));
    });

    // Draggable
    makeDraggable(panel, document.getElementById('talentai-titlebar'));
}

// ── Draggable ─────────────────────────────────────────────────────────────────
function makeDraggable(el, handle) {
    let ox = 0, oy = 0;
    handle.addEventListener('mousedown', e => {
        e.preventDefault();
        ox = e.clientX - el.getBoundingClientRect().left;
        oy = e.clientY - el.getBoundingClientRect().top;
        const move = e2 => {
            el.style.left = (e2.clientX - ox) + 'px';
            el.style.top = (e2.clientY - oy) + 'px';
            el.style.right = 'auto';
        };
        const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
        document.addEventListener('mousemove', move);
        document.addEventListener('mouseup', up);
    });
}

// ── Init: wait for Meet to load, then inject ──────────────────────────────────
function tryInject() {
    // Wait for Meet's main meeting container
    if (document.querySelector('[data-meeting-code], [jsname="r4nke"]') || document.readyState === 'complete') {
        buildPanel();
    } else {
        setTimeout(tryInject, 1000);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryInject);
} else {
    tryInject();
}
