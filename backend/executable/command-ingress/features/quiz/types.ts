// Quiz types/interfaces

export interface QuestionOptionInput {
  option_text: string;
  is_correct: boolean;
  order_index: number;
  explanation?: string;
}

export interface QuestionInput {
  question_type: 'multiple_choice' | 'true_false';
  question_text: string;
  points: number;
  options: QuestionOptionInput[];
  explanation?: string;
}

export interface CreateQuizRequest {
  title: string;
  description?: string;
  time_limit_minutes: number;
  max_attempts: number;
  passing_score: number;
  passing_score_type: 'points' | 'percentage';
  show_results_immediately: boolean;
  show_correct_answers: boolean;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  questions: QuestionInput[];
  allow_review?: boolean;
}

export interface CreateQuizResponse {
  quiz_id: number;
  lesson_id: number;
  title: string;
  questions_count: number;
  total_points: number;
  created_at: Date;
}

export type QuizQuestionOption = {
  id: number;
  option_text: string;
  order_index: number;
};

export type QuizQuestionDetail = {
  id: number;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer' | 'essay' | 'fill_blank';
  points: number;
  options: QuizQuestionOption[];
};

export type GetQuizResponse = {
  quiz_id: number;
  lesson_id: number;
  title: string;
  description?: string | null;
  time_limit_minutes: number | null;
  max_attempts: number;
  passing_score: number | null;
  show_results_immediately: boolean;
  show_correct_answers: boolean;
  questions_count: number;
  total_points: number;
  attempts_done: number;
  attempts_remaining: number;
  questions: QuizQuestionDetail[];
};

export type CreateQuizAttemptResponse = {
  attempt_id: number;
  quiz_id: number;
  started_at: string;
  time_limit_minutes: number;
  attempt_number: number;
};

export type QuizResponseInput = {
  quiz_question_id: number;
  selected_options?: number[];
  text_answer?: string | null;
};

export type QuizAttemptSubmitResult = {
  attempt_id: number;
  quiz_id: number;
  score: number;
  is_passed: boolean | null;
  submitted_at: string;
  unanswered_count: number;
};

export type QuizAutoGradeQuestionSummary = {
  question_id: number;
  question_text: string;
  points_earned: number | null;
  is_correct: boolean | null;
};

export type QuizAutoGradeResult = {
  attempt_id: number;
  total_points: number;
  score: number;
  percentage: number;
  is_passed: boolean;
  questions_summary: QuizAutoGradeQuestionSummary[];
};

export interface QuizService {
  createQuiz(
    instructorId: number,
    lessonId: number,
    request: CreateQuizRequest
  ): Promise<CreateQuizResponse>;

  getQuizByLesson(lessonId: number, userId: number): Promise<GetQuizResponse>;
  getQuizById(quizId: number, userId: number): Promise<GetQuizResponse>;
  createQuizAttempt(quizId: number, userId: number): Promise<CreateQuizAttemptResponse>;
  getLatestInProgressAttempt(quizId: number, userId: number): Promise<CreateQuizAttemptResponse | null>;
  getAttemptResponses(attemptId: number, userId: number): Promise<QuizResponseInput[]>;
  saveAttemptResponses(
    attemptId: number,
    userId: number,
    responses: QuizResponseInput[]
  ): Promise<void>;
  submitAttempt(attemptId: number, userId: number): Promise<QuizAttemptSubmitResult>;
  autoGradeAttempt(attemptId: number, userId: number): Promise<QuizAutoGradeResult>;
}
