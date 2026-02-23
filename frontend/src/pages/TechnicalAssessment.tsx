import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { assessmentApi } from '../api';
import { BrainCircuit, CheckCircle, Clock } from 'lucide-react';

export default function TechnicalAssessment() {
    const { token } = useParams<{ token: string }>();
    const [assessment, setAssessment] = useState<any>(null);
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 mins

    useEffect(() => {
        loadAssessment();
    }, [token]);

    useEffect(() => {
        if (!assessment || assessment.status !== 'pending' || submitted) return;
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    handleSubmit();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [assessment, submitted]);

    const loadAssessment = async () => {
        try {
            const res = await assessmentApi.getTechnical(token!);
            setAssessment(res.data);
            if (res.data.status !== 'pending') setSubmitted(true);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to load assessment');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!assessment || assessment.status !== 'pending' || submitted) return;
        setSubmitting(true);
        try {
            const formattedAnswers = assessment.questions.map((_: any, i: number) => ({
                question_id: i,
                answer_text: answers[i] || ''
            }));
            await assessmentApi.submitTechnical(token!, formattedAnswers);
            setSubmitted(true);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to submit');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center dark:bg-gray-900">Loading...</div>;
    if (error) return <div className="min-h-screen flex items-center justify-center text-red-500 font-medium dark:bg-gray-900">{error}</div>;
    if (!assessment) return null;

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    if (submitted) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-6">
                <div className="max-w-md w-full glass-panel p-8 text-center space-y-4">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Assessment Submitted</h2>
                    <p className="text-gray-600 dark:text-gray-300">
                        Thank you for completing the technical assessment. Your responses have been saved and will be evaluated. You may now close this window.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
            {/* Header */}
            <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <BrainCircuit className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                        <span className="font-bold text-xl text-gray-900 dark:text-white">TalentAI Assessment</span>
                    </div>
                    <div className="flex items-center space-x-2 text-rose-600 dark:text-rose-400 font-medium bg-rose-50 dark:bg-rose-900/30 px-4 py-1.5 rounded-full">
                        <Clock className="w-4 h-4" />
                        <span>{formatTime(timeLeft)} remaining</span>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
                <div className="glass-panel p-6">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Technical Questionnaire</h1>
                    <p className="text-gray-600 dark:text-gray-300">
                        Please provide detailed answers to the following questions. Your responses will be evaluated by our AI system against the job criteria.
                    </p>
                </div>

                <div className="space-y-6">
                    {assessment.questions.map((q: any, i: number) => (
                        <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-4 transition-all focus-within:ring-2 focus-within:ring-indigo-500">
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-bold">
                                    {i + 1}
                                </div>
                                <div className="space-y-1 w-full">
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">{q.question}</h3>
                                    <div className="flex gap-2 text-xs font-medium pb-2">
                                        <span className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                            {q.criterion}
                                        </span>
                                        <span className={`px-2 py-1 rounded ${q.difficulty === 'Hard' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                                            {q.difficulty}
                                        </span>
                                    </div>
                                    <textarea
                                        value={answers[i] || ''}
                                        onChange={(e) => setAnswers(prev => ({ ...prev, [i]: e.target.value }))}
                                        placeholder="Type your detailed answer here..."
                                        className="w-full h-32 p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white text-sm leading-relaxed resize-y"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none transition-all disabled:opacity-50"
                    >
                        {submitting ? 'Submitting...' : 'Submit Assessment'}
                    </button>
                </div>
            </main>
        </div>
    );
}
