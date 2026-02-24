import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import Layout from './components/Layout';

// ─── Lazy-loaded pages ────────────────────────────────────────────
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Jobs = lazy(() => import('./pages/Jobs'));
const JobPipeline = lazy(() => import('./pages/JobPipeline'));
const InterviewRoom = lazy(() => import('./pages/InterviewRoom'));
const InterviewReport = lazy(() => import('./pages/InterviewReport'));
const FinalEvaluation = lazy(() => import('./pages/FinalEvaluation'));
const Candidates = lazy(() => import('./pages/Candidates'));
const Evaluations = lazy(() => import('./pages/Evaluations'));
const Interviews = lazy(() => import('./pages/Interviews'));
const Profile = lazy(() => import('./pages/Profile'));
const TechnicalAssessment = lazy(() => import('./pages/TechnicalAssessment'));

// ─── Page loader spinner ──────────────────────────────────────────
function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-gradient)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 44, height: 44, border: '4px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.75s linear infinite' }} />
        <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>Loading…</div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Auth Guard ───────────────────────────────────────────────────
function AuthGuard({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isAuthenticated = Boolean(localStorage.getItem('user_role'));
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}

// ─── Google Client ID ─────────────────────────────────────────────
// Replace this with your actual Google OAuth Client ID from:
// https://console.cloud.google.com/apis/credentials
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '467762898847-o8sdqj8rnmknef7r8b3n1c7oo069rkr0.apps.googleusercontent.com';

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <Router>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/assessment/:token" element={<TechnicalAssessment />} />

            {/* Protected routes */}
            <Route path="/" element={<AuthGuard><Layout /></AuthGuard>}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="jobs" element={<Jobs />} />
              <Route path="jobs/:jobId/pipeline" element={<JobPipeline />} />
              <Route path="candidates" element={<Candidates />} />
              <Route path="interviews" element={<Interviews />} />
              <Route path="evaluations" element={<Evaluations />} />
              <Route path="profile" element={<Profile />} />
              <Route path="interview/:sessionId" element={<InterviewRoom />} />
              <Route path="interview-room/:sessionId" element={<InterviewRoom />} />
              <Route path="interview-report/:sessionId" element={<InterviewReport />} />
              <Route path="evaluate/:applicationId" element={<FinalEvaluation />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;
