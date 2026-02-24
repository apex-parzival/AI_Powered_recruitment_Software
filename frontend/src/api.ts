import axios from 'axios';

// ── Base URL ──────────────────────────────────────────────────────
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
});

// ── Global error interceptor ──────────────────────────────────────
api.interceptors.response.use(
    res => res,
    err => {
        // Network / timeout
        if (!err.response) {
            console.error('[API] Network error or timeout:', err.message);
        }
        return Promise.reject(err);
    }
);

// ── Jobs ─────────────────────────────────────────────────────────
export const jobsApi = {
    getAll: () => api.get('/jobs'),
    create: (data: any) => api.post('/jobs', data),
    generateCriteria: (id: number) => api.post(`/jobs/${id}/criteria/generate`),
    updateCriteria: (id: number, config: any) => api.put(`/jobs/${id}/criteria`, { criteria_config: config }),
    uploadJD: (formData: FormData) => api.post('/jobs/parse-jd', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

// ── Resumes / Applications ───────────────────────────────────────
export const resumesApi = {
    uploadBulk: (jobId: number, formData: FormData) =>
        api.post(`/jobs/${jobId}/resumes/upload`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 300000, // 5 min for large batches
        }),
    getApplications: (jobId: number) => api.get(`/jobs/${jobId}/applications`),
    getDetails: (appId: number) => api.get(`/applications/${appId}/details`),
};

// ── Candidates ───────────────────────────────────────────────────
export const candidatesApi = {
    getAll: (search = '', limit = 200) => api.get('/candidates', { params: { search, limit } }),
};

// ── Stats ────────────────────────────────────────────────────────
export const statsApi = {
    get: () => api.get('/stats'),
};

// ── Interviews ───────────────────────────────────────────────────
export const interviewApi = {
    startSession: (applicationId: number) =>
        api.post('/interviews/start', { application_id: applicationId }),
    getSession: (sessionId: number) => api.get(`/interviews/${sessionId}`),
    addTranscriptChunk: (sessionId: number, speaker: string, text: string, timestamp?: string) =>
        api.post(`/interviews/${sessionId}/transcript`, { speaker, text, timestamp }),
    getSuggestions: (sessionId: number) => api.get(`/interviews/${sessionId}/suggestions`),
    endSession: (sessionId: number) => api.post(`/interviews/${sessionId}/end`),
    getReport: (sessionId: number) => api.get(`/interviews/${sessionId}/report`),
    uploadAudioFallback: (sessionId: number, formData: FormData) =>
        api.post(`/interviews/${sessionId}/audio-upload`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    generateScorecard: (sessionId: number) => api.post(`/interviews/${sessionId}/scorecard`),
};

// ── Assessments ──────────────────────────────────────────────────
export const assessmentApi = {
    generateTechnical: (appId: number) => api.post('/assessments/technical/generate', { application_id: appId }),
    getTechnical: (token: string) => api.get(`/assessments/technical/${token}`),
    submitTechnical: (token: string, answers: any[]) => api.post(`/assessments/technical/${token}/submit`, { answers }),
};

// ── Evaluations ──────────────────────────────────────────────────
export const evaluationApi = {
    submitFinal: (applicationId: number, interviewerRating: number, weights: any) =>
        api.post('/assessments/final', {
            application_id: applicationId,
            interviewer_rating: interviewerRating,
            ...weights,
        }),
};
