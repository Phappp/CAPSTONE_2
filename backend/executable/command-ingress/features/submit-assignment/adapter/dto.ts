import { IsInt, IsOptional, IsString, Min} from 'class-validator';
import { RequestDto } from '../../../shared/request-dto';
import { SubmitAssignmentRequest } from '../types';

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

    files?: Express.Multer.File[];

    constructor(body: any, files?: any, userId?: number, assignmentId?: any) {
        super();
        this.assignment_id = assignmentId != null ? Number(assignmentId) : 0;
        this.user_id = userId != null ? Number(userId) : 0;

        this.text_submission = body?.text_submission ? String(body.text_submission) : undefined;

        this.files = Array.isArray(files) ? files : undefined;
    }
}