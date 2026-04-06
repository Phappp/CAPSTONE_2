import { IsInt, IsOptional, IsString, Min} from 'class-validator';
import { RequestDto } from '../../../shared/request-dto';
import { ShortAnswerSubmissionItem, SubmitAssignmentRequest } from '../types';

function parseShortAnswersFromBody(body: any): ShortAnswerSubmissionItem[] | undefined {
    const raw = body?.short_answers;
    if (raw == null || raw === '') return undefined;
    let arr: any[] | null = null;
    if (typeof raw === 'string') {
        try {
            const p = JSON.parse(raw);
            arr = Array.isArray(p) ? p : null;
        } catch {
            return undefined;
        }
    } else if (Array.isArray(raw)) {
        arr = raw;
    }
    if (!arr) return undefined;
    return arr.map((x: any) => ({
        question_id: String(x?.question_id ?? ''),
        answer_text: String(x?.answer_text ?? ''),
    }));
}

/**
 * SubmitAssignmentBody:
 * - Ép kiểu từ req.body + req.files + param
 * - Validate với class-validator
 */

export class SubmitAssignmentBody extends RequestDto implements SubmitAssignmentRequest {
    @IsInt({ message: 'Assignment ID phải là một số nguyên' })
    @Min(1, { message: 'Assignment ID không hợp lệ' })
    assignment_id: number;

    @IsInt({ message: 'User ID phải là một số nguyên' })
    @Min(1, { message: 'User ID không hợp lệ' })
    user_id: number;

    @IsOptional()
    @IsString({ message: 'Nội dung nộp bài phải là định dạng văn bản' })
    text_submission?: string;

    short_answers?: ShortAnswerSubmissionItem[];

    files?: Express.Multer.File[];

    constructor(body: any, files?: Express.Multer.File[], userId?: number, assignmentId?: any) {
    super();
    this.assignment_id = assignmentId != null ? Number(assignmentId) : 0;
    this.user_id = userId != null ? Number(userId) : 0;
    this.text_submission = body?.text_submission ? String(body.text_submission) : undefined;
    this.short_answers = parseShortAnswersFromBody(body);
    this.files = Array.isArray(files) ? files : undefined;
  }
}