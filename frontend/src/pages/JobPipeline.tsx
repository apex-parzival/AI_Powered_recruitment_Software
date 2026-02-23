import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { resumesApi, interviewApi } from '../api';

function StatusBadge({ status }: { status: string }) {
    const cfg: Record<string, { label: string, color: string, bg: string }> = {
        queued: { label: 'Queued', color: '#3B82F6', bg: '#DBEAFE' },
        processing: { label: 'Analyzing', color: '#F59E0B', bg: '#FEF3C7' },
        completed: { label: 'Complete', color: '#22C55E', bg: '#DCFCE7' },
        failed: { label: 'Failed', color: '#EF4444', bg: '#FEE2E2' },
    };
    const c = cfg[status] || cfg.queued;
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 999, background: c.bg, color: c.color }}>
            {status === 'processing' && <span style={{ display: 'inline-block', width: 10, height: 10, border: `2px solid ${c.color}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />}
            {c.label}
        </span>
    );
}

function ScoreRing({ score }: { score: number }) {
    const pct = Math.round(score * 100);
    const size = 48; const r = 20; const c = 2 * Math.PI * r;
    const fill = (pct / 100) * c;
    const color = pct >= 80 ? '#22C55E' : pct >= 60 ? '#3B82F6' : '#F59E0B';
    return (
        <div style={{ position: 'relative', width: size, height: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth="4" />
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${fill} ${c}`} />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color }}>
                {pct}
            </div>
        </div>
    );
}

export default function JobPipeline() {
    const { jobId } = useParams();
    const navigate = useNavigate();
    const [apps, setApps] = useState<any[]>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 });
    const [dragOver, setDragOver] = useState(false);
    const [search, setSearch] = useState('');

    const fetchApps = useCallback(async () => {
        if (!jobId) return;
        try { const r = await resumesApi.getApplications(parseInt(jobId)); setApps(r.data); }
        catch (e) { console.error(e); }
    }, [jobId]);

    useEffect(() => {
        fetchApps();
        const t = setInterval(fetchApps, 4000);
        return () => clearInterval(t);
    }, [fetchApps]);

    // Chunked upload supporting 1000+ files - sends in batches of 50
    const upload = async (files: FileList) => {
        if (!jobId || !files.length) return;
        setUploading(true);
        const BATCH_SIZE = 50;
        const allFiles = Array.from(files).filter(f => f.name.toLowerCase().endsWith('.pdf'));
        setUploadProgress({ done: 0, total: allFiles.length });

        try {
            for (let i = 0; i < allFiles.length; i += BATCH_SIZE) {
                const batch = allFiles.slice(i, i + BATCH_SIZE);
                const fd = new FormData();
                batch.forEach(f => fd.append('files', f));
                await resumesApi.uploadBulk(parseInt(jobId), fd);
                setUploadProgress({ done: Math.min(i + BATCH_SIZE, allFiles.length), total: allFiles.length });
            }
            await fetchApps();
        } catch (e) { console.error(e); }
        finally { setUploading(false); setUploadProgress({ done: 0, total: 0 }); }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); setDragOver(false);
        if (e.dataTransfer.files) upload(e.dataTransfer.files);
    };

    const startInterview = async (appId: number) => {
        try { const r = await interviewApi.startSession(appId); navigate(`/interview/${r.data.id}`); }
        catch (e) { console.error(e); }
    };

    const filtered = apps.filter(a =>
        search === '' || `${a.id} ${a.candidate_id}`.toLowerCase().includes(search.toLowerCase())
    );

    const stats = {
        total: apps.length,
        completed: apps.filter(a => a.status === 'completed').length,
        recommended: apps.filter(a => a.recommendation_flag).length,
    };

    return (
        <div>
            {/* Header */}
            <div style={{ marginBottom: 24 }}>
                <button onClick={() => navigate('/jobs')} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 12, padding: 0, fontFamily: 'Inter, sans-serif' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
                    Back to Jobs
                </button>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h1 style={{ fontWeight: 900, fontSize: 28, color: 'var(--text)', margin: '0 0 4px' }}>Evaluate Applications</h1>
                        <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>Upload and AI-screen candidates for Job #{jobId} · supports 1000+ resumes</p>
                    </div>
                    <div style={{ display: 'flex', gap: 16 }}>
                        {[
                            { label: 'Total', value: stats.total, color: 'var(--text)' },
                            { label: 'Screened', value: stats.completed, color: 'var(--primary)' },
                            { label: 'Recommended', value: stats.recommended, color: 'var(--success)' },
                        ].map(s => (
                            <div key={s.label} className="card" style={{ padding: '12px 18px', textAlign: 'center', minWidth: 90 }}>
                                <div style={{ fontSize: 22, fontWeight: 800, color: s.color, marginBottom: 2 }}>{s.value}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>{s.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 20 }}>
                {/* Upload Panel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div className="card" style={{ padding: 20 }}>
                        <h3 style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                            Bulk Upload
                        </h3>
                        <div
                            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={handleDrop}
                            style={{ border: `2px dashed ${dragOver ? 'var(--primary)' : 'var(--border-2)'}`, borderRadius: 12, padding: 32, textAlign: 'center', background: dragOver ? 'var(--primary-light)' : 'var(--bg)', transition: 'all 0.2s', position: 'relative', cursor: 'pointer' }}>
                            <input type="file" multiple accept=".pdf" onChange={e => e.target.files && upload(e.target.files)} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} disabled={uploading} />
                            {uploading ? (
                                <div style={{ padding: '24px 0' }}>
                                    <div style={{ width: 40, height: 40, border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
                                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)', margin: '0 0 8px', textAlign: 'center' }}>Uploading in batches...</p>
                                    {uploadProgress.total > 0 && (
                                        <>
                                            <div className="progress-bar-track" style={{ margin: '0 8px', height: 8 }}>
                                                <div className="progress-bar-fill" style={{ width: `${(uploadProgress.done / uploadProgress.total) * 100}%`, background: 'linear-gradient(90deg, var(--primary), var(--success))' }} />
                                            </div>
                                            <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', marginTop: 6 }}>
                                                {uploadProgress.done} / {uploadProgress.total} files
                                            </p>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <>
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" style={{ margin: '0 auto 12px', display: 'block' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
                                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: '0 0 4px' }}>Drag & drop resumes</p>
                                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>or click to browse · PDF only</p>
                                </>
                            )}
                        </div>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10, textAlign: 'center' }}>Supports bulk upload of 100–1000+ PDFs</p>
                    </div>

                    {/* Live indicator */}
                    {apps.some(a => a.status === 'processing' || a.status === 'queued') && (
                        <div className="card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 10, borderColor: 'rgba(124,58,237,0.3)' }}>
                            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', animation: 'pulse 1.5s infinite' }} />
                            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>AI screening in progress...</span>
                        </div>
                    )}
                </div>

                {/* Results table */}
                <div className="card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="2" strokeLinecap="round" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                            <input className="input" placeholder="Search candidates by name or skills..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 38, maxWidth: 340 }} />
                        </div>
                        <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>{apps.length} of {apps.length} candidates</span>
                    </div>

                    <div style={{ overflowY: 'auto', flex: 1, maxHeight: '60vh' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                                    {['Candidate', 'Position', 'Resume Score', 'Status', 'Action'].map(h => (
                                        <th key={h} style={{ textAlign: 'left', padding: '10px 20px', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.length === 0 ? (
                                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)', fontSize: 14 }}>
                                        {apps.length === 0 ? 'No candidates yet. Upload resumes to begin screening.' : 'No matches found.'}
                                    </td></tr>
                                ) : filtered.map(app => (
                                    <tr key={app.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                                        onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg)'; }}
                                        onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = ''; }}>
                                        <td style={{ padding: '14px 20px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>
                                                    {String.fromCharCode(65 + (app.candidate_id % 26))}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>Candidate {app.candidate_id}</div>
                                                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>candidate-{app.candidate_id}@example.com</div>
                                                    {app.recommendation_flag && <span className="badge-recommended" style={{ marginTop: 4 }}>
                                                        <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                                                        Recommended
                                                    </span>}
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '14px 20px', fontSize: 13, color: 'var(--text-2)' }}>Job #{app.job_id}</td>
                                        <td style={{ padding: '14px 20px' }}>
                                            {app.status === 'completed' ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <ScoreRing score={app.resume_score || 0} />
                                                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>/100</span>
                                                </div>
                                            ) : <span style={{ fontSize: 13, color: 'var(--text-faint)' }}>—</span>}
                                        </td>
                                        <td style={{ padding: '14px 20px' }}><StatusBadge status={app.status} /></td>
                                        <td style={{ padding: '14px 20px' }}>
                                            <button className="btn-primary" style={{ fontSize: 12, padding: '7px 14px' }} onClick={() => startInterview(app.id)} disabled={app.status !== 'completed'}>
                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                                                Interview
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.3;} }`}</style>
        </div>
    );
}
