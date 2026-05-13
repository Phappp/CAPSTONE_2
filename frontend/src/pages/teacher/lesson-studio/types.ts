export type LessonResource = {
  id: number;
  lesson_id: number;
  resource_type: "file" | "video";
  resource_kind?: "pdf" | "word" | "video" | "youtube" | "other";
  url: string;
  filename: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  preview_url?: string | null;
  review_status?: "pending" | "approved" | "rejected";
  review_decision?: "add" | "update" | "delete";
  review_reason?: string | null;
  reviewed_by?: number | null;
  reviewed_at?: string | null;
  is_resubmitted?: boolean;
  last_review_decision?: "submit" | "approve" | "reject" | "resubmit" | null;
  last_review_note?: string | null;
  last_reviewed_at?: string | null;
  previous_rejected_reason?: string | null;
  created_at: string;
};

export type LessonItem = {
  id: number;
  module_id: number;
  title: string;
  description: string | null;
  lesson_type: "video" | "text" | "quiz" | "assignment";
  order_index: number;
};

export type ModuleItem = {
  id: number;
  title: string;
  lessons: LessonItem[];
};

export type ContentTree = {
  modules: ModuleItem[];
};

export type SavedQuizQuestion = {
  question_text: string;
  options: Array<{ option_text: string; is_correct: boolean }>;
  explanation: string;
  points: number;
  difficulty: "easy" | "medium" | "hard";
  question_type: "multiple_choice" | "true_false";
};

export type QuizPreviewConfig = {
  time_limit_minutes: number | null;
  passing_score: number | null;
};

export type AssignmentShortAnswerQuestion = {
  id: string;
  question_text: string;
  order_index: number;
};

export type AssignmentStudioPreview = {
  assignment_id?: number;
  description: string;
  due_date: string | null;
  max_score: number;
  passing_score: number | null;
  allow_late_submission: boolean;
  late_submission_days: number;
  late_penalty_percent: number;
  allow_resubmission: boolean;
  max_resubmissions: number;
  attachments: Array<{ file_name: string; file_path: string; signed_url: string }>;
  assignment_kind?: "file_prompt" | "short_answer";
  time_limit_minutes?: number | null;
};

export type AssignmentKind = "file_prompt" | "short_answer";
