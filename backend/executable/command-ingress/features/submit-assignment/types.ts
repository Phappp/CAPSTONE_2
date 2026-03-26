export interface SubmittedFile {
    file_name: string;
    file_path: string;
    file_size: number;
}

export interface SubmitAssignmentRequest {
    assignment_id: number;
    user_id: number;
    text_submission?: string;
    files?: Express.Multer.File[];
}

export interface SubmitAssignmentResponse {
    submission_id: number;
    assignment_id: number;
    submitted_at: Date;
    is_late: boolean;
    resubmission_count: number;
    files: SubmittedFile[];
    status: string;
}

export interface SubmissionService {
    submitAssignment(body: SubmitAssignmentRequest): Promise<any>;
}