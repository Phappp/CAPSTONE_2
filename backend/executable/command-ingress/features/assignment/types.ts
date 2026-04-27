export type AssignmentKind = 'file_prompt' | 'short_answer';

export type ShortAnswerQuestionDef = {
  id: string;
  question_text: string;
  order_index: number;
};

export type AssignmentFormat =
  | 'pdf'
  | 'docx'
  | 'doc'
  | 'xls'
  | 'xlsx'
  | 'jpg'
  | 'jpeg'
  | 'png'
  | 'zip'
  | 'rar'
  | '7z';

export type AssignmentAttachment = {
    file_name: string;
    file_path: string;
};

export type AssignmentAttachmentPreview = AssignmentAttachment & {
  signed_url: string;
};

export type CreateAssignmentRequest = {
    title: string;
    description: string | null;
    attachments?: AssignmentAttachment[] | null;
    max_score: number;
    passing_score?: number | null;
    due_date: string;
    allow_late_submission: boolean;
    late_submission_days?: number | null;
    late_penalty_percent?: number | null;
    allow_resubmission: boolean;
    max_resubmissions?: number | null;
    allowed_formats: AssignmentFormat[];
    assignment_kind?: AssignmentKind;
    short_answer_questions?: ShortAnswerQuestionDef[] | null;
    time_limit_minutes?: number | null;
};

export type UploadedAssignmentFile = {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
};
export type GradeSubmissionRequest = {
  submissionId: number;
  score: number;
  feedbackText: string;
  graderId: number; // ID giảng viên
};

export type AssignmentSubmissionListRow = {
  submission_id: number;
  user_id: number;
  user_email: string;
  user_full_name: string;
  status: string;
  submitted_at: string | null;
  is_late: boolean;
  resubmission_count: number;
  grade_item_id: number | null;
  graded_score: number | null;
  feedback_text: string | null;
  feedback_graded_at: string | null;
  content_preview: string;
  attachment_count: number;
  attachment_files: {
    file_name: string;
    file_path: string;
  }[];
  submission_short_answers: {
    question_id: string;
    answer_text: string;
  }[];
};

export type AssignmentLearnerRosterRow = {
  user_id: number;
  email: string;
  full_name: string;
  has_submitted: boolean;
  submission: AssignmentSubmissionListRow | null;
};

export type AssignmentLearnerRosterResult = {
  assignment: { id: number; title: string; max_score: number } | null;
  learners: AssignmentLearnerRosterRow[];
};

export type UpdateAssignmentRequest = Partial<{
  title: string;
  description: string | null;
  attachments?: AssignmentAttachment[] | null;
  max_score: number;
  passing_score?: number | null;
  due_date: string;
  allow_late_submission: boolean;
  late_submission_days?: number | null;
  late_penalty_percent?: number | null;
  allow_resubmission: boolean;
  max_resubmissions?: number | null;
  allowed_formats: AssignmentFormat[];
  assignment_kind: AssignmentKind;
  short_answer_questions: ShortAnswerQuestionDef[] | null;
  time_limit_minutes: number | null;
}>;

export interface AssignmentService {
    createAssignment(subjectUserId: number, lessonId: number, request: CreateAssignmentRequest): Promise<any>;

    uploadAssignmentAttachments(
      subjectUserId: number,
      lessonId: number,
      assignmentId: number,
      files: UploadedAssignmentFile[]
    ): Promise<AssignmentAttachmentPreview[]>;

    getAssignmentPreview(
      subjectUserId: number,
      lessonId: number,
      assignmentId: number
    ): Promise<{
      assignment_id: number;
      lesson_id: number;
      title: string;
      description: string;
      due_date: string | null;
      max_score: number;
      passing_score: number | null;
      allow_late_submission: boolean;
      late_submission_days: number;
      late_penalty_percent: number;
      allow_resubmission: boolean;
      max_resubmissions: number;
      allowed_formats: AssignmentFormat[];
      attachments: AssignmentAttachmentPreview[];
      created_at: string;
      assignment_kind: AssignmentKind;
      short_answer_questions: ShortAnswerQuestionDef[];
      time_limit_minutes: number | null;
    }>;

    getLearnerAssignmentForLesson(
      subjectUserId: number,
      lessonId: number
    ): Promise<{
      assignment_id: number;
      lesson_id: number;
      title: string;
      description: string;
      due_date: string | null;
      max_score: number;
      passing_score: number | null;
      allow_late_submission: boolean;
      late_submission_days: number;
      late_penalty_percent: number;
      allow_resubmission: boolean;
      max_resubmissions: number;
      allowed_formats: AssignmentFormat[];
      attachments: AssignmentAttachmentPreview[];
      assignment_kind: AssignmentKind;
      short_answer_questions: ShortAnswerQuestionDef[];
      time_limit_minutes: number | null;
    }>;

    updateAssignment(
      subjectUserId: number,
      lessonId: number,
      assignmentId: number,
      request: UpdateAssignmentRequest
    ): Promise<void>;
    gradeSubmission(data: GradeSubmissionRequest): Promise<void>;
    listAssignmentSubmissions(
      subjectUserId: number,
      lessonId: number,
      assignmentId: number
    ): Promise<AssignmentSubmissionListRow[]>;
    getAssignmentLearnerRosterByLesson(
      subjectUserId: number,
      lessonId: number
    ): Promise<AssignmentLearnerRosterResult>;
    getMyGradesSummary(studentId: number): Promise<CourseGradeSummary[]>;

    getMyAssignmentGradeDetail(studentId: number, assignmentId: number): Promise<any>;
    createGradeAppeal(studentId: number, submissionId: number, content: string): Promise<void>;
}

export type CourseGradeSummary = {
  course_id: number;
  course_title: string;
  average_score: number;
  items: GradeItemDetail[];
};

export type GradeItemDetail = {
  item_id: number;
  title: string;
  type: 'assignment' | 'quiz';
  score: number | null;
  max_score: number;
  graded_at: string | null;
};

export interface GradeService {
  getMyGradesSummary(studentId: number): Promise<CourseGradeSummary[]>;
  getAssignmentGradeDetail(studentId: number, assignmentId: number): Promise<any>;
}
