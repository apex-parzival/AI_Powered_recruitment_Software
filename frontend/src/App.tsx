import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Jobs from './pages/Jobs';
import JobPipeline from './pages/JobPipeline';
import InterviewDashboard from './pages/InterviewDashboard';
import InterviewRoom from './pages/InterviewRoom';
import InterviewReport from './pages/InterviewReport';
import FinalEvaluation from './pages/FinalEvaluation';
import Candidates from './pages/Candidates';
import Evaluations from './pages/Evaluations';
import Interviews from './pages/Interviews';
import Profile from './pages/Profile';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="jobs" element={<Jobs />} />
          <Route path="jobs/:jobId/pipeline" element={<JobPipeline />} />
          <Route path="candidates" element={<Candidates />} />
          <Route path="interviews" element={<Interviews />} />
          <Route path="evaluations" element={<Evaluations />} />
          <Route path="profile" element={<Profile />} />
          <Route path="interview/:sessionId" element={<InterviewDashboard />} />
          <Route path="interview-room/:sessionId" element={<InterviewRoom />} />
          <Route path="interview-report/:sessionId" element={<InterviewReport />} />
          <Route path="evaluate/:applicationId" element={<FinalEvaluation />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
