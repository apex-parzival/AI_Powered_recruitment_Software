export default function Evaluations() {
    return (
        <div>
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontWeight: 800, fontSize: 28, color: 'var(--text)', margin: '0 0 4px' }}>Evaluations</h1>
                <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>Review final candidate evaluation results and hiring decisions</p>
            </div>
            <div className="card" style={{ padding: 60, textAlign: 'center' }}>
                <div style={{ width: 64, height: 64, background: 'var(--primary-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'var(--primary)' }}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', margin: '0 0 8px' }}>No completed evaluations yet</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Complete an interview session and submit your scorecard to see final evaluations here.</p>
            </div>
        </div>
    );
}
