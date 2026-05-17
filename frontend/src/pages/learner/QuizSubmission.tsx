import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ChevronRight,
  FileText,
  CheckCircle2,
  FolderArchive,
  FileDown,
  Package,
  Download,
  CalendarClock,
  History,
  CheckCheck,
  Mail,
  TrendingUp,
  Users,
  Send,
  X,
  Loader2,
  Clock,
  Target,
  Award,
  RotateCcw,
} from 'lucide-react';
import { url } from '../../baseUrl';
import { COURSES_API } from '../../api/courses';
import { getAccessToken } from '../../utils/authStorage';
import LearnerFab from '../../components/LearnerFab';
import './QuizSubmission.css';

interface QuizSubmissionProps {
  inlineMode?: boolean;
  onClose?: () => void;
  inlineLessonId?: number;
  inlineCourseId?: number;
}

interface QuizQuestion {
  quiz_question_id: number;
  question_text: string;
  question_type: string;
  points: number;
  options: { id: number; option_text: string }[];
}

interface QuizAttempt {
  attempt_id: number;
  attempt_number: number;
  submitted_at: string | null;
  score_percent: number | null;
  is_passed: boolean | null;
  status: string;
  answers: {
    quiz_question_id: number;
    question_text: string;
    selected_option_id: number | null;
    selected_option_text: string | null;
    correct_option_ids: number[];
  }[];
}

interface QuizPayload {
  quiz_id: number;
  lesson_id: number;
  title: string;
  description: string | null;
  time_limit_minutes: number | null;
  passing_score: number | null;
  max_attempts: number;
  attempts_used: number;
  show_results_immediately: boolean;
  show_correct_answers: boolean;
  recent_attempts: QuizAttempt[];
  questions: QuizQuestion[];
  instructor_name?: string;
  course_title?: string;
  lesson_title?: string;
  instructor_avatar?: string;
}

interface SubmitResult {
  score_percent: number;
  earned_points: number;
  max_points: number;
  is_passed: boolean;
  show_correct_answers: boolean;
  details: {
    quiz_question_id: number;
    is_correct: boolean;
    correct_option_ids: number[];
    selected_option_id: number | null;
  }[];
}

interface HistoryItem {
  key: string;
  title: string;
  score?: string;
  status: 'passed' | 'pending';
  meta: string;
  badge?: string;
}

const formatTimeRemaining = (seconds: number | null): string => {
  if (seconds === null) return '';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const QuizSubmission: React.FC<QuizSubmissionProps> = ({ inlineMode = false, onClose, inlineLessonId, inlineCourseId }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryLessonId = Number(searchParams.get('lessonId') ?? '');
  const lessonTitleFromQuery = searchParams.get('title') || '';

  // Use inline props if provided, otherwise use URL params
  const effectiveLessonId = inlineLessonId ?? queryLessonId;
  const effectiveCourseId = inlineMode ? (inlineCourseId ?? 0) : Number(searchParams.get('courseId') || '0');

  const [quiz, setQuiz] = useState<QuizPayload | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [selections, setSelections] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitOk, setSubmitOk] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [timerStarted, setTimerStarted] = useState(false);

  // Reset state when quiz changes
  useEffect(() => {
    setResult(null);
    setSelections({});
    setSubmitOk(null);
    setSubmitError(null);
    setTimeRemaining(null);
    setTimerStarted(false);
  }, [effectiveLessonId]);

  useEffect(() => {
    if (!effectiveLessonId || Number.isNaN(effectiveLessonId)) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const token = getAccessToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const load = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await fetch(
          `${url}${COURSES_API.learnerQuizTake(effectiveCourseId, effectiveLessonId)}`,
          { headers }
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok)
          throw new Error((data as any)?.message || 'Could not load quiz.');
        if (cancelled) return;
        setQuiz((data as any)?.quiz as QuizPayload);
      } catch (err: any) {
        if (!cancelled) setLoadError(err?.message || 'Failed to load quiz.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [effectiveLessonId, effectiveCourseId]);

  // Timer effect
  useEffect(() => {
    if (!quiz?.time_limit_minutes || !timerStarted) return;

    const totalSeconds = quiz.time_limit_minutes * 60;
    setTimeRemaining(totalSeconds);

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          if (!submitting) {
            handleSubmit();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [quiz?.time_limit_minutes, timerStarted]);

  const sortedQuestions = useMemo(() => {
    if (!quiz?.questions) return [];
    return [...quiz.questions];
  }, [quiz]);

  const attemptsLeft = quiz ? Math.max(0, quiz.max_attempts - quiz.attempts_used) : 0;
  const allAnswered =
    quiz &&
    quiz.questions.length > 0 &&
    quiz.questions.every((q) => typeof selections[q.quiz_question_id] === 'number');

  const submissionHistory: HistoryItem[] = useMemo(() => {
    const items: HistoryItem[] = [];
    if (quiz?.recent_attempts?.length) {
      quiz.recent_attempts.forEach((att) => {
        const isGraded = att.status === 'graded' || att.score_percent != null;
        items.push({
          key: `att-${att.attempt_id}`,
          title: `Attempt ${att.attempt_number}`,
          score: att.score_percent != null ? `${att.score_percent}%` : undefined,
          status: isGraded && att.is_passed ? 'passed' : 'pending',
          meta: att.submitted_at
            ? new Date(att.submitted_at).toLocaleString('en-US', {
                month: 'short',
                day: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'Awaiting review',
          badge: isGraded ? (att.is_passed ? 'Passed' : 'Failed') : 'Pending',
        });
      });
    }
    if (items.length === 0) {
      items.push({
        key: 'g-draft',
        title: 'Not started',
        status: 'pending',
        meta: 'Select answers to begin your quiz.',
      });
    }
    return items;
  }, [quiz]);

  const detailByQq = useMemo(() => {
    if (!result?.details) return new Map<number, SubmitResult['details'][0]>();
    return new Map(result.details.map((d) => [d.quiz_question_id, d]));
  }, [result]);

  const handleOptionChange = (questionId: number, optionId: number) => {
    setSelections((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitError(null);
    setSubmitOk(null);

    if (!quiz) {
      setSubmitError(
        'Open this page from a lesson (?lessonId=...) to load the quiz.'
      );
      return;
    }

    if (!allAnswered) {
      setSubmitError('Please answer all questions before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      const token = getAccessToken();
      const courseId = Number(searchParams.get('courseId') || '0');
      const answers = quiz.questions.map((q) => ({
        quiz_question_id: q.quiz_question_id,
        selected_option_id: selections[q.quiz_question_id],
      }));

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const res = await fetch(
        `${url}${COURSES_API.learnerQuizSubmit(courseId, queryLessonId)}`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ answers }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as any)?.message || 'Failed to submit quiz.');
      }
      setResult(data as SubmitResult);
      setSubmitOk(String((data as any)?.message || 'Quiz submitted successfully.'));
      setSelections({});
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to submit quiz.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDiscard = () => {
    setSelections({});
    setSubmitOk(null);
    setSubmitError(null);
    setResult(null);
  };

  return (
    <div className={`qs-page${inlineMode ? ' qs-page--inline' : ''}`}>
      <main className="qs-main">
        <header className="qs-page-head">
          {/* <nav className="qs-crumbs">
            <span className="qs-crumb">My Courses</span>
            <ChevronRight size={14} strokeWidth={2.2} className="qs-crumb-sep" />
            <span className="qs-crumb">{quiz?.course_title || lessonTitleFromQuery || 'Course'}</span>
            <ChevronRight size={14} strokeWidth={2.2} className="qs-crumb-sep" />
            <span className="qs-crumb">{quiz?.lesson_title || 'Lesson'}</span>
            <ChevronRight size={14} strokeWidth={2.2} className="qs-crumb-sep" />
            <span className="qs-crumb qs-crumb--active">Quiz</span>
          </nav> */}
          <h1 className="qs-page-title">
            {quiz?.title || lessonTitleFromQuery || 'Quiz'}
          </h1>
        </header>

        {!queryLessonId && !inlineMode && (
          <div className="qs-hint-banner">
            Add <code>?lessonId=&lt;id&gt;</code> and <code>?courseId=&lt;id&gt;</code> to the URL to load a specific quiz.
          </div>
        )}
        {loadError && <div className="qs-error-banner">{loadError}</div>}

        <div className="qs-grid">
          <div className="qs-col-main">
            {/* Quiz Overview */}
            <section className="qs-card qs-overview">
              <h2 className="qs-section-title">
                <span className="qs-section-icon qs-section-icon--pink">
                  <Target size={18} strokeWidth={2.2} />
                </span>
                Quiz Overview
              </h2>
              <p className="qs-overview-body">
                {quiz?.description || 'Answer all questions and submit before the time runs out.'}
              </p>

              <div className="qs-quiz-stats">
                <div className="qs-quiz-stat">
                  <span className="qs-quiz-stat-value">{quiz?.questions?.length || 0}</span>
                  <span className="qs-quiz-stat-label">Questions</span>
                </div>
                <div className="qs-quiz-stat">
                  <span className="qs-quiz-stat-value">
                    {quiz?.questions?.reduce((sum, q) => sum + q.points, 0) || 0}
                  </span>
                  <span className="qs-quiz-stat-label">Total Points</span>
                </div>
                <div className="qs-quiz-stat">
                  <span className="qs-quiz-stat-value">{quiz?.passing_score ?? 70}%</span>
                  <span className="qs-quiz-stat-label">Passing Score</span>
                </div>
                <div className="qs-quiz-stat">
                  <span className="qs-quiz-stat-value">{quiz?.max_attempts || 1}</span>
                  <span className="qs-quiz-stat-label">Max Attempts</span>
                </div>
              </div>
            </section>

            {/* Quiz Questions */}
            <section className="qs-card qs-submission">
              <div className="qs-timer-bar">
                {(quiz?.time_limit_minutes || attemptsLeft > 0 || result) && (
                  <div className="qs-timer">
                    <Clock size={18} strokeWidth={2.2} />
                    <div className="qs-timer-info">
                      {quiz?.time_limit_minutes ? (
                        <>
                          <span className="qs-timer-meta">
                            {sortedQuestions.length} question{sortedQuestions.length !== 1 ? 's' : ''} • {quiz.time_limit_minutes} min{quiz.time_limit_minutes !== 1 ? 's' : ''}
                          </span>
                          {timerStarted ? (
                            <>
                              <span className="qs-timer-label">Time Remaining:</span>
                              <span className={`qs-timer-value ${timeRemaining !== null && timeRemaining <= 300 ? 'qs-timer-warning' : ''}`}>
                                {formatTimeRemaining(timeRemaining)}
                              </span>
                            </>
                          ) : (
                            <span className="qs-timer-label">Time limit quiz — begin when ready</span>
                          )}
                        </>
                      ) : (
                        <span className="qs-timer-meta">
                          {sortedQuestions.length} question{sortedQuestions.length !== 1 ? 's' : ''} • No time limit
                        </span>
                      )}
                    </div>
                    {!timerStarted && quiz && (
                      <button
                        type="button"
                        className="qs-timer-start-btn"
                        onClick={() => {
                          if (attemptsLeft <= 0) {
                            const lastAttempt = quiz.recent_attempts?.[0];
                            if (lastAttempt?.score_percent != null) {
                              const totalPoints = quiz.questions.reduce((sum, q) => sum + q.points, 0);
                              setResult({
                                score_percent: lastAttempt.score_percent,
                                earned_points: Math.round((lastAttempt.score_percent / 100) * totalPoints),
                                max_points: totalPoints,
                                is_passed: lastAttempt.is_passed ?? false,
                                show_correct_answers: quiz.show_correct_answers,
                                details: (lastAttempt.answers ?? []).map((a) => ({
                                  quiz_question_id: a.quiz_question_id,
                                  is_correct: false,
                                  correct_option_ids: [],
                                  selected_option_id: a.selected_option_id,
                                })),
                              });
                            }
                          } else {
                            setTimerStarted(true);
                          }
                        }}
                        disabled={attemptsLeft <= 0 && (!quiz?.recent_attempts?.length)}
                      >
                        {attemptsLeft <= 0 ? 'View Result' : 'Start Quiz'}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {timerStarted && (
                <h2 className="qs-section-title">Answer the Questions</h2>
              )}

              {/* Quiz Questions */}
              {timerStarted && (
                <div className="qs-questions-section">
                  {sortedQuestions.length > 0 ? (
                    sortedQuestions.map((q, idx) => (
                      <div key={q.quiz_question_id} className="qs-question-card">
                        <div className="qs-question-header">
                          <span className="qs-question-badge">
                            Question {idx + 1} • {q.points} point{q.points !== 1 ? 's' : ''}
                          </span>
                          {quiz?.show_results_immediately && result && (
                            <span className={`qs-question-result ${detailByQq.get(q.quiz_question_id)?.is_correct ? 'correct' : 'incorrect'}`}>
                              {detailByQq.get(q.quiz_question_id)?.is_correct ? 'Correct' : 'Incorrect'}
                            </span>
                          )}
                        </div>
                        <p className="qs-question-text">{q.question_text}</p>
                        <div className="qs-options">
                          {q.options.map((o) => {
                            const sel = selections[q.quiz_question_id] === o.id;
                            const isCorrectChoice = result?.show_correct_answers &&
                              (detailByQq.get(q.quiz_question_id)?.correct_option_ids || []).includes(o.id);
                            const isWrongChoice = sel && result?.show_correct_answers &&
                              !(detailByQq.get(q.quiz_question_id)?.correct_option_ids || []).includes(o.id);

                            return (
                              <label
                                key={o.id}
                                className={`qs-option ${sel ? 'qs-option--selected' : ''} ${isCorrectChoice ? 'qs-option--correct' : ''} ${isWrongChoice ? 'qs-option--wrong' : ''}`}
                              >
                                <input
                                  type="radio"
                                  name={`qq-${q.quiz_question_id}`}
                                  checked={sel}
                                  onChange={() => handleOptionChange(q.quiz_question_id, o.id)}
                                  disabled={!!result}
                                />
                                <span className="qs-option-indicator" />
                                <span className="qs-option-text">{o.option_text}</span>
                                {isCorrectChoice && <CheckCircle2 size={18} className="qs-option-icon qs-option-icon--correct" />}
                                {isWrongChoice && <X size={18} className="qs-option-icon qs-option-icon--wrong" />}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="qs-empty-state">
                      <FileText size={48} strokeWidth={1.5} />
                      <p>No questions available for this quiz.</p>
                    </div>
                  )}
                </div>
              )}

              {submitError && <div className="qs-error-banner">{submitError}</div>}
              {submitOk && <div className="qs-success-banner">{submitOk}</div>}

              {/* Result Display */}
              {result && (
                <div className={`qs-result-card ${result.is_passed ? 'qs-result-card--pass' : 'qs-result-card--fail'}`}>
                  <div className="qs-result-icon">
                    {result.is_passed ? (
                      <Award size={48} strokeWidth={1.5} />
                    ) : (
                      <RotateCcw size={48} strokeWidth={1.5} />
                    )}
                  </div>
                  <h3 className="qs-result-title">
                    {result.is_passed ? 'Congratulations!' : 'Keep Trying!'}
                  </h3>
                  <div className="qs-result-score">
                    {result.score_percent}%
                  </div>
                  <p className="qs-result-detail">
                    {result.earned_points} / {result.max_points} points — <strong>{result.is_passed ? 'Passed' : 'Not Passed'}</strong>
                  </p>
                </div>
              )}

              {timerStarted && !result && (
                <div className="qs-submit-row">
                  <button
                    type="button"
                    className="qs-cancel-btn-inline"
                    onClick={handleDiscard}
                    disabled={submitting}
                  >
                    Clear Answers
                  </button>
                  <button
                    type="button"
                    className="qs-submit-btn"
                    onClick={handleSubmit}
                    disabled={!allAnswered || submitting}
                  >
                    {submitting ? (
                      <Loader2 size={16} className="qs-spin" />
                    ) : (
                      <Send size={16} strokeWidth={2.4} />
                    )}
                    {submitting ? 'Submitting...' : 'Submit Quiz'}
                  </button>
                </div>
              )}
            </section>
          </div>

          <aside className="qs-col-side">
            <div className="qs-card qs-info">
              <div className="qs-info-row">
                <div className="qs-info-block">
                  <div className="qs-info-head">
                    <span className="qs-info-label">Attempts</span>
                    <span className={`qs-info-pill ${attemptsLeft <= 0 ? 'qs-info-pill--warning' : ''}`}>
                      {attemptsLeft} left
                    </span>
                  </div>
                  <div className="qs-score">
                    <span className="qs-score-value">
                      {quiz?.attempts_used ?? 0}
                    </span>
                    <span className="qs-score-unit">
                      / {quiz?.max_attempts ?? 1} used
                    </span>
                  </div>
                </div>
              </div>

              <div className="qs-info-divider" />

              <div className="qs-info-row">
                <div className="qs-info-block">
                  <div className="qs-info-label">Passing Score</div>
                  <div className="qs-score">
                    <span className="qs-score-value">
                      {quiz?.passing_score ?? '—'}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="qs-card qs-history">
              <h3 className="qs-side-title">
                <History size={16} strokeWidth={2.2} />
                Quiz History
              </h3>

              <div className="qs-timeline">
                {submissionHistory.map((h, idx) => (
                  <div key={h.key} className="qs-history-item">
                    <div
                      className={`qs-history-dot ${
                        h.status === 'passed'
                          ? 'qs-history-dot--passed'
                          : 'qs-history-dot--pending'
                      }`}
                    >
                      {h.status === 'passed' ? (
                        <CheckCheck size={14} strokeWidth={2.4} />
                      ) : (
                        <History size={14} strokeWidth={2.2} />
                      )}
                    </div>
                    {idx < submissionHistory.length - 1 && (
                      <span className="qs-history-line" />
                    )}
                    <div className="qs-history-content">
                      <div className="qs-history-row">
                        <span className="qs-history-title">{h.title}</span>
                        {h.score ? (
                          <span className="qs-history-score">{h.score}</span>
                        ) : (
                          <span className="qs-history-pending">—</span>
                        )}
                      </div>
                      <div className="qs-history-meta">{h.meta}</div>
                      {h.badge && (
                        <span className={`qs-history-badge ${h.status === 'passed' ? 'qs-history-badge--pass' : 'qs-history-badge--fail'}`}>
                          {h.badge}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="qs-instructor">
              <span className="qs-instructor-glow" />
              <h3 className="qs-instructor-eyebrow">Instructor Support</h3>
              <div className="qs-instructor-row">
                <div className="qs-instructor-avatar">
                  <img
                    alt={quiz?.instructor_name || 'Instructor'}
                    src={quiz?.instructor_avatar || 'https://ui-avatars.com/api/?name=Instructor&background=ec4899&color=fff'}
                  />
                </div>
                <div className="qs-instructor-info">
                  <div className="qs-instructor-name">{quiz?.instructor_name || 'Course Instructor'}</div>
                  <div className="qs-instructor-role">Instructor</div>
                </div>
              </div>
              <button type="button" className="qs-ask-btn">
                <Mail size={16} strokeWidth={2.2} />
                Ask a Question
              </button>
              <p className="qs-instructor-note">
                Typical response time: <strong>under 2 hours</strong>
              </p>
            </div>

            <div className="qs-stats">
              <div className="qs-stat qs-stat--pink">
                <span className="qs-stat-icon">
                  <Target size={16} strokeWidth={2.4} />
                </span>
                <div className="qs-stat-label">Total Points</div>
                <div className="qs-stat-value">
                  {quiz?.questions?.reduce((sum, q) => sum + q.points, 0) || 0}
                </div>
              </div>
              <div className="qs-stat qs-stat--sky">
                <span className="qs-stat-icon">
                  <Users size={16} strokeWidth={2.4} />
                </span>
                <div className="qs-stat-label">Attempts Left</div>
                <div className="qs-stat-value">{attemptsLeft}</div>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {loading && (
        <div className="qs-loading-overlay">
          <Loader2 size={20} className="qs-spin" />
          <span>Loading quiz...</span>
        </div>
      )}

      {inlineMode && onClose ? (
        <button
          type="button"
          className="qs-close-btn"
          onClick={onClose}
          aria-label="Close quiz"
        >
          <X size={20} />
        </button>
      ) : (
        <LearnerFab onClick={() => navigate('/courses')} />
      )}
    </div>
  );
};

export default QuizSubmission;
