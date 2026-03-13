export type AssignmentFormat = 'pdf' | 'docx' | 'doc' | 'jpg' | 'jpeg' | 'png' | 'zip' | 'rar' | '7z';

export type AssignmentAtachment = {
    file_name: string;
    file_path: string;
};

export type CreateAssignmentRequest = {
    title: string;
    description: string | null;
    attachments?: AssignmentAtachment[] | null;
    max_score: number;
    passing_score?: number | null;
    due_date: string;
    allow_late_submission: boolean;
    late_submission_days?: number | null;
    late_penalty_percent?: number | null;
    allow_resubmission: boolean;
    max_resubmissions?: number | null;
    allowed_formats: AssignmentFormat[];
};

export interface AssignmentService {
    createAssignment(subjectUserId: number, lessonId: number, request: CreateAssignmentRequest): Promise<any>;
}