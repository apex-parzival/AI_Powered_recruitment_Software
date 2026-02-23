import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

export const api = axios.create({ baseURL: API_BASE_URL });

export const jobsApi = {
    getAll: () => api.get('/jobs'),
    create: (data: any) => api.post('/jobs', data),
    generateCriteria: (id: number) => api.post(`/jobs/${id}/criteria/generate`),
    uploadJD: (formData: FormData) => api.post(`/jobs/parse-jd`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

export const resumesApi = {
    uploadBulk: (jobId: number, formData: FormData) =>
        api.post(`/jobs/${jobId}/resumes/upload`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 300000, // 5 min for large batches
        }),
    getApplications: (jobId: number) => api.get(`/jobs/${jobId}/applications`),
    getDetails: (appId: number) => api.get(`/applications/${appId}/details`),
};

export const interviewApi = {
    startSession: (applicationId: number) =>
        api.post('/interviews/start', { application_id: applicationId }),
    getSession: (sessionId: number) => api.get(`/interviews/${sessionId}`),
    addTranscriptChunk: (sessionId: number, speaker: string, text: string, timestamp?: string) =>
        api.post(`/interviews/${sessionId}/transcript`, { speaker, text, timestamp }),
    getSuggestions: (sessionId: number) => api.get(`/interviews/${sessionId}/suggestions`),
    endSession: (sessionId: number) => api.post(`/interviews/${sessionId}/end`),
    getReport: (sessionId: number) => api.get(`/interviews/${sessionId}/report`),
    // legacy
    sendAudioChunk: (sessionId: number, chunkIndex: number, base64: string) =>
        api.post(`/interviews/${sessionId}/audio-chunk`, { audio_data_base64: base64, chunk_index: chunkIndex }),
    generateScorecard: (sessionId: number) => api.post(`/interviews/${sessionId}/scorecard`),
    uploadAudioFallback: (sessionId: number, formData: FormData) =>
        api.post(`/interviews/${sessionId}/audio-upload`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

export const evaluationApi = {
    submitFinal: (applicationId: number, interviewerRating: number, weights: any) =>
        api.post('/assessments/final', {
            application_id: applicationId,
            interviewer_rating: interviewerRating,
            ...weights
        }),
    // legacy
    submitFinalLegacy: (data: any) => api.post('/evaluations/final', data),
};

export const assessmentApi = {
    generateTechnical: (appId: number) => api.post('/assessments/technical/generate', { application_id: appId }),
    getTechnical: (token: string) => api.get(`/assessments/technical/${token}`),
    submitTechnical: (token: string, answers: any[]) => api.post(`/assessments/technical/${token}/submit`, { answers }),
};
