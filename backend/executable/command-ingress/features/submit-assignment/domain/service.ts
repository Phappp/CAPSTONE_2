/* eslint-disable no-trailing-spaces */
import { DataSource } from 'typeorm';
import AppDataSource from '../../../../../lib/database';
import Assignment from '../../../../../internal/model/assignment';
import Submission from '../../../../../internal/model/submissions';
import SubmissionText from '../../../../../internal/model/submission_text';
import SubmissionAttachment from '../../../../../internal/model/submission_attachment';
import { SubmitAssignmentBody } from '../adapter/dto';
import { SubmissionService } from '../types';
import { FileService } from '../../../utils/file.service';

export class SubmissionServiceImpl implements SubmissionService {
    private dataSource: DataSource;

    constructor() {
        this.dataSource = AppDataSource;
    }

    async submitAssignment(req: SubmitAssignmentBody): Promise<any> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        let savedPaths: string[] = [];

        try {
            // 1. Kiểm tra bài tập tồn tại
            const assignment = await queryRunner.manager.findOne(Assignment, {
                where: { id: req.assignment_id }
            });
            if (!assignment) throw new Error('NOT_FOUND_ASSIGNMENT');

            // 2. Logic Nộp lại
            const previousSubmissionsCount = await queryRunner.manager.count(Submission, {
                where: { assignment_id: req.assignment_id, user_id: req.user_id }
            });

            if (previousSubmissionsCount > 0) {
                if (!assignment.allow_resubmission) throw new Error('RESUBMISSION_NOT_ALLOWED');
                if (previousSubmissionsCount >= (assignment.max_resubmissions + 1)) {
                    throw new Error('MAX_RESUBMISSIONS_EXCEEDED');
                }
            }

            // 3. Logic Nộp muộn
            const now = new Date();
            let isLate = false;
            
            if (now > assignment.due_date) {
                if (!assignment.allow_late_submission) throw new Error('LATE_SUBMISSION_NOT_ALLOWED');
                const diffTime = Math.abs(now.getTime() - assignment.due_date.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                if (diffDays > assignment.late_submission_days) throw new Error('LATE_SUBMISSION_LIMIT_EXCEEDED');
                isLate = true;
            }

            // 4. Lưu bản ghi Submission gốc
            const newSubmission = queryRunner.manager.create(Submission, {
                assignment_id: req.assignment_id,
                user_id: req.user_id,
                is_late: isLate,
                resubmission_count: previousSubmissionsCount,
                status: 'submitted'
            });
            const savedSubmission = await queryRunner.manager.save(newSubmission);

            // 5. Lưu Text Submission
            if (req.text_submission && req.text_submission.trim() !== '') {
                const submissionText = queryRunner.manager.create(SubmissionText, {
                    submission_id: savedSubmission.id,
                    content: req.text_submission
                });
                await queryRunner.manager.save(submissionText);
            }

            // 6. Xử lý lưu mảng Files bằng FileService
            const filesData = [];
            
            if (req.files && req.files.length > 0) {
                // Service thực hiện lưu file và lấy lại mảng đường dẫn
                savedPaths = await FileService.saveFiles(req.files);

                for (let i = 0; i < savedPaths.length; i++) {
                    const file = req.files[i];
                    const absPath = savedPaths[i];
                    const urlPath = FileService.toClientPath(absPath);
                    
                    const attachment = queryRunner.manager.create(SubmissionAttachment, {
                        submission_id: savedSubmission.id,
                        file_name: file.originalname,
                        file_path: urlPath,
                        file_size: file.size,
                        mime_type: file.mimetype
                    });
                    await queryRunner.manager.save(attachment);

                    filesData.push({
                        file_name: attachment.file_name,
                        file_path: attachment.file_path,
                        file_size: attachment.file_size
                    });
                }
            }

            await queryRunner.commitTransaction();

            return {
                submission_id: savedSubmission.id,
                assignment_id: savedSubmission.assignment_id,
                submitted_at: savedSubmission.submitted_at,
                is_late: savedSubmission.is_late,
                resubmission_count: savedSubmission.resubmission_count,
                files: filesData,
                status: savedSubmission.status
            };

        } catch (error) {
            await queryRunner.rollbackTransaction();
            
            // Nếu có lỗi xảy ra, xóa toàn bộ các file vừa được FileService tạo ra
            if (savedPaths.length > 0) {
                await FileService.deleteFiles(savedPaths);
            }
            
            throw error;
        } finally {
            await queryRunner.release(); 
        }
    }
}