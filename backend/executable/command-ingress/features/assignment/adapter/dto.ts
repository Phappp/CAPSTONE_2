import { Length } from 'class-validator';
import { CreateAssignmentRequest, AssignmentAttachment, AssignmentFormat, AssignmentKind } from '../types';
import { RequestDto } from '../../../shared/request-dto';

export class CreateAssignmentBody extends RequestDto implements CreateAssignmentRequest {
    @Length(1, 255)
    title: string;

    @Length(1)
    description: string;

    attachments?: AssignmentAttachment[];
    max_score: number;
    passing_score?: number | null;
    due_date: string;
    allow_late_submission: boolean;
    late_submission_days?: number | null;
    late_penalty_percent?: number | null;
    allow_resubmission: boolean;
    max_resubmissions?: number;
    allowed_formats: AssignmentFormat[];

    assignment_kind: AssignmentKind;

    short_answer_questions?: { id: string; question_text: string; order_index: number }[] | null;
    time_limit_minutes?: number | null;

    constructor(body: any) {
        super();
        this.title = String(body?.title || '');
        this.description = String(body?.description || '');
        this.attachments = Array.isArray(body?.attachments) ? body.attachments: null;
        this.max_score = body?.max_score != null ? Number(body.max_score) : 10;
        this.passing_score = body?.passing_score != null ? Number(body.passing_score) : null;
        this.due_date = String(body?.due_date || '');
        this.allow_late_submission = Boolean(body?.allow_late_submission);
        this.late_submission_days = body?.late_submission_days != null ? Number(body.late_submission_days) : 0;
        this.late_penalty_percent = body?.late_penalty_percent != null ? Number(body.late_penalty_percent) : 0;
        this.allow_resubmission = Boolean(body?.allow_resubmission);
        this.max_resubmissions = body?.max_resubmissions != null ? Number(body.max_resubmissions) : 1;
        this.allowed_formats = Array.isArray(body?.allowed_formats)
        ? body.allowed_formats
        : ['pdf', 'docx', 'doc', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'zip', 'rar', '7z'];
        this.assignment_kind = body?.assignment_kind === 'short_answer' ? 'short_answer' : 'file_prompt';
        this.short_answer_questions = Array.isArray(body?.short_answer_questions) ? body.short_answer_questions : null;
        this.time_limit_minutes = body?.time_limit_minutes != null ? Number(body.time_limit_minutes) : null;
        }
}