import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { jobsApi } from '../api';

function BrainIcon() {
    return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z" />
        <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z" />
    </svg>;
}

function PlusIcon() {
    return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
}

function SkillTag({ name, weight }: { name: string; weight: number }) {
    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--primary-light)', color: 'var(--primary)', fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999, border: '1px solid rgba(124,58,237,0.2)' }}>
            {name} <span style={{ opacity: 0.7 }}>· {Math.round(weight * 100)}%</span>
        </span>
    );
}

function JobCard({ job, onExtract, extracting, onView }: any) {
    const dept = job.department || 'General';
    const has = !!job.active_criteria;
    // criteria_config is a list [{name, weight}] from seed — support both shapes
    const rawCriteria = job.active_criteria?.criteria_config || [];
    const criteria: any[] = Array.isArray(rawCriteria)
        ? rawCriteria
        : (rawCriteria.skills || Object.keys(rawCriteria).map((k: string) => ({ name: k, weight: 0.2 })));

    return (
        <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, cursor: 'pointer', transition: 'box-shadow 0.2s' }}
            onMouseOver={e => (e.currentTarget.style.boxShadow = '0 8px 24px rgba(124,58,237,0.12)')}
            onMouseOut={e => (e.currentTarget.style.boxShadow = '')}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div>
                    <span style={{ display: 'inline-block', background: 'var(--primary-light)', color: 'var(--primary)', fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 999, marginBottom: 8 }}>
                        {dept}
                    </span>
                    <h3 style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)', margin: 0, lineHeight: 1.3 }}>{job.title}</h3>
                </div>
                {has && (
                    <div className="badge-recommended">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                        AI Ready
                    </div>
                )}
            </div>

            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0, lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {job.description}
            </p>

            {/* Criteria */}
            {has ? (
                <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <BrainIcon />
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)' }}>AI Criteria v{job.active_criteria.version}</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {criteria.slice(0, 4).map((s: any, i: number) => <SkillTag key={i} name={s.name} weight={s.weight || s.weight_pct || 0.2} />)}
                        {criteria.length > 4 && <span style={{ fontSize: 11, color: 'var(--text-faint)', padding: '3px 8px' }}>+{criteria.length - 4} more</span>}
                    </div>
                </div>
            ) : (
                <div style={{ background: 'var(--bg)', borderRadius: 10, padding: 14, textAlign: 'center' }}>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 10px' }}>No evaluation criteria yet</p>
                    <button className="btn-secondary" style={{ width: '100%', fontSize: 13 }} onClick={e => { e.stopPropagation(); onExtract(job.id); }} disabled={extracting === job.id}>
                        {extracting === job.id ? (
                            <><span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }}></span> Extracting...</>
                        ) : (
                            <><BrainIcon /> Auto-Extract Criteria</>
                        )}
                    </button>
                </div>
            )}

            <div style={{ display: 'flex', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 16, alignItems: 'center' }}>
                {job.application_count > 0 && (
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginRight: 'auto' }}>
                        👥 {job.application_count} applicant{job.application_count !== 1 ? 's' : ''}
                    </span>
                )}
                <button className="btn-primary" style={{ flex: 1, fontSize: 13 }} onClick={e => { e.stopPropagation(); onView(job.id); }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                    View Pipeline
                </button>
                {!has && <button className="btn-secondary" style={{ fontSize: 13 }} onClick={e => { e.stopPropagation(); onExtract(job.id); }} disabled={extracting === job.id}>
                    <BrainIcon /> Criteria
                </button>}
            </div>
        </div>
    );
}

export default function Jobs() {
    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [extracting, setExtracting] = useState<number | null>(null);
    const [form, setForm] = useState({ title: '', department: '', description: '' });
    const [submitting, setSubmitting] = useState(false);
    const [uploadingJd, setUploadingJd] = useState(false);
    const navigate = useNavigate();

    const fetchJobs = useCallback(async () => {
        try { const r = await jobsApi.getAll(); setJobs(r.data); }
        catch (e) { console.error(e); } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchJobs(); }, [fetchJobs]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault(); setSubmitting(true);
        try { await jobsApi.create({ ...form, created_by: 1 }); await fetchJobs(); setShowModal(false); setForm({ title: '', department: '', description: '' }); }
        catch (e) { console.error(e); } finally { setSubmitting(false); }
    };

    const extractCriteria = async (id: number) => {
        setExtracting(id);
        try { await jobsApi.generateCriteria(id); await fetchJobs(); }
        catch (e) { console.error(e); } finally { setExtracting(null); }
    };

    const handleUploadJD = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0]) return;
        setUploadingJd(true);
        const fb = new FormData();
        fb.append('file', e.target.files[0]);
        try {
            const res = await jobsApi.uploadJD(fb);
            setForm(prev => ({ ...prev, description: res.data.description }));
        } catch (err: any) {
            console.error(err);
            alert(err.response?.data?.detail || "Failed to extract text from file");
        } finally {
            setUploadingJd(false);
            e.target.value = ''; // reset
        }
    };

    const depts = ['Engineering', 'Product', 'Design', 'Marketing', 'Operations', 'HR', 'Finance', 'Sales'];

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
                <div>
                    <h1 style={{ fontWeight: 800, fontSize: 28, color: 'var(--text)', margin: '0 0 4px' }}>Jobs Board</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>Create and manage job requisitions with AI-powered screening</p>
                </div>
                <button className="btn-primary" onClick={() => setShowModal(true)}>
                    <PlusIcon /> Create New Job
                </button>
            </div>

            {/* Stats strip */}
            {jobs.length > 0 && (
                <div style={{ display: 'flex', gap: 16, marginBottom: 28 }}>
                    {[
                        { label: 'Total Jobs', value: jobs.length, color: 'var(--primary)' },
                        { label: 'AI-Ready', value: jobs.filter(j => j.active_criteria).length, color: 'var(--success)' },
                        { label: 'Pending Criteria', value: jobs.filter(j => !j.active_criteria).length, color: 'var(--warning)' },
                    ].map(stat => (
                        <div key={stat.label} className="card" style={{ padding: '16px 22px', display: 'flex', alignItems: 'center', gap: 16, minWidth: 160 }}>
                            <div style={{ fontSize: 28, fontWeight: 800, color: stat.color }}>{stat.value}</div>
                            <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>{stat.label}</div>
                        </div>
                    ))}
                </div>
            )}

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200, color: 'var(--text-muted)' }}>
                    <span style={{ display: 'inline-block', width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}></span>
                </div>
            ) : jobs.length === 0 ? (
                <div className="card" style={{ padding: 60, textAlign: 'center' }}>
                    <div style={{ width: 64, height: 64, background: 'var(--primary-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'var(--primary)' }}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
                    </div>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: '0 0 8px' }}>No jobs yet</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>Create your first job requisition to get started</p>
                    <button className="btn-primary" onClick={() => setShowModal(true)}><PlusIcon /> Create New Job</button>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
                    {jobs.map(job => (
                        <JobCard key={job.id} job={job} onExtract={extractCriteria} extracting={extracting} onView={(id: number) => navigate(`/jobs/${id}/pipeline`)} />
                    ))}
                </div>
            )}

            {/* Create Job Modal */}
            {showModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                    <div className="card" style={{ width: '100%', maxWidth: 560, padding: 32 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                            <div>
                                <h2 style={{ fontWeight: 800, fontSize: 22, color: 'var(--text)', margin: '0 0 4px' }}>Create New Job</h2>
                                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Define job details and configure AI-powered evaluation criteria</p>
                            </div>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 8, display: 'flex', alignItems: 'center', fontSize: 20, fontWeight: 300 }}>✕</button>
                        </div>

                        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
                            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: '0 0 16px', borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>Job Details</p>
                            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>Job Title <span style={{ color: 'var(--error)' }}>*</span></label>
                                    <input className="input" required placeholder="e.g., Senior Frontend Developer" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>Department <span style={{ color: 'var(--error)' }}>*</span></label>
                                    <select className="input" required value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} style={{ cursor: 'pointer', appearance: 'none' }}>
                                        <option value="">Select department</option>
                                        {depts.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                        <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>Job Description <span style={{ color: 'var(--error)' }}>*</span></label>
                                        <label style={{ cursor: 'pointer', fontSize: 12, color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                                            {uploadingJd ? 'Extracting...' : 'Upload PDF/Docx'}
                                            <input type="file" style={{ display: 'none' }} accept=".pdf,.docx" onChange={handleUploadJD} disabled={uploadingJd} />
                                        </label>
                                    </div>
                                    <textarea className="input" required rows={5} placeholder="Enter detailed job description, responsibilities, and requirements... Alternatively, use the upload button above to extract text from a file." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ resize: 'vertical' }} />
                                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>Provide a comprehensive description to generate accurate evaluation criteria</p>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 4 }}>
                                    <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Back to Jobs</button>
                                    <button type="submit" className="btn-primary" disabled={submitting}>
                                        {submitting ? 'Creating...' : 'Create Job'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
