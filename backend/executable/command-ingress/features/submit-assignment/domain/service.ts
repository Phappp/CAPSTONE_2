/* eslint-disable no-trailing-spaces */
import { DataSource, In } from 'typeorm';
import AppDataSource from '../../../../../lib/database';
import Assignment from '../../../../../internal/model/assignment';
import Lesson from '../../../../../internal/model/lesson';
import Module from '../../../../../internal/model/modules';
import CourseEnrollment from '../../../../../internal/model/course_enrollment';
import Submission from '../../../../../internal/model/submissions';
import SubmissionText from '../../../../../internal/model/submission_text';
import SubmissionAttachment from '../../../../../internal/model/submission_attachment';
import { SubmitAssignmentBody } from '../adapter/dto';
import { SubmissionService } from '../types';
import { FileService } from '../../../utils/file.service';

function assignmentKind(a: any): 'file_prompt' | 'short_answer' {
  return String(a?.assignment_kind || '') === 'short_answer' ? 'short_answer' : 'file_prompt';
}

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
      const assignment = await queryRunner.manager.findOne(Assignment, {
        where: { id: req.assignment_id },
      });
      if (!assignment) throw new Error('Không tìm thấy bài tập.');

      const lesson = await queryRunner.manager.findOne(Lesson, {
        where: { id: (assignment as any).lesson_id } as any,
      });
      if (!lesson) throw new Error('Không tìm thấy bài học.');
      const mod = await queryRunner.manager.findOne(Module, {
        where: { id: (lesson as any).module_id } as any,
      });
      if (!mod) throw new Error('Không tìm thấy chương.');

      const enroll = await queryRunner.manager.findOne(CourseEnrollment, {
        where: {
          user_id: req.user_id,
          course_id: (mod as any).course_id,
          status: In(['active', 'completed']),
        } as any,
      });
      if (!enroll) throw new Error('Bạn chưa ghi danh khóa học này.');

      const previousSubmissionsCount = await queryRunner.manager.count(Submission, {
        where: { assignment_id: req.assignment_id, user_id: req.user_id },
      });

      if (previousSubmissionsCount > 0) {
        if (!assignment.allow_resubmission) throw new Error('Bài tập không cho phép nộp lại.');
        if (previousSubmissionsCount >= assignment.max_resubmissions + 1) {
          throw new Error('Bạn đã hết số lần nộp bài.');
        }
      }

      const now = new Date();
      let isLate = false;
      const dueRaw = (assignment as any).due_date;
      if (dueRaw) {
        const due = new Date(dueRaw);
        if (!Number.isNaN(due.getTime()) && now > due) {
          if (!assignment.allow_late_submission) throw new Error('Đã quá hạn nộp bài.');
          const diffTime = Math.abs(now.getTime() - due.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          if (diffDays > assignment.late_submission_days) throw new Error('Đã quá số ngày nộp trễ cho phép.');
          isLate = true;
        }
      }

      const kind = assignmentKind(assignment);
      const newSubmission = queryRunner.manager.create(Submission, {
        assignment_id: req.assignment_id,
        user_id: req.user_id,
        is_late: isLate,
        resubmission_count: previousSubmissionsCount,
        status: 'submitted',
      });
      const savedSubmission = await queryRunner.manager.save(newSubmission);

      const filesData: { file_name: string; file_path: string; file_size: number }[] = [];

      if (kind === 'short_answer') {
        const qs = Array.isArray((assignment as any).short_answer_questions)
          ? (assignment as any).short_answer_questions
          : [];
        if (qs.length < 1) throw new Error('Bài tập chưa được cấu hình câu hỏi.');
        if (req.files && req.files.length > 0) throw new Error('Dạng trả lời ngắn không nộp kèm file.');
        if (req.text_submission && req.text_submission.trim() !== '') {
          throw new Error('Dạng trả lời ngắn không dùng ô văn bản tự do; hãy điền từng câu.');
        }
        const byId = new Map((req.short_answers || []).map((a) => [a.question_id, a.answer_text]));
        const normalized: { question_id: string; answer_text: string }[] = [];
        for (const q of qs) {
          const id = String((q as any).id ?? '');
          const t = String(byId.get(id) ?? '').trim();
          if (!t) throw new Error('Vui lòng trả lời đầy đủ tất cả các câu.');
          normalized.push({ question_id: id, answer_text: t });
        }
        const content = JSON.stringify({ v: 1, kind: 'short_answer', answers: normalized });
        const submissionText = queryRunner.manager.create(SubmissionText, {
          submission_id: savedSubmission.id,
          content,
        });
        await queryRunner.manager.save(submissionText);
      } else {
        if (req.short_answers && req.short_answers.length > 0) {
          throw new Error('Bài tập này chỉ nhận văn bản hoặc file đính kèm.');
        }
        const hasText = req.text_submission && req.text_submission.trim() !== '';
        const hasFiles = req.files && req.files.length > 0;
        if (!hasText && !hasFiles) {
          throw new Error('Vui lòng nộp nội dung (văn bản và/hoặc file).');
        }

        if (hasText) {
          const submissionText = queryRunner.manager.create(SubmissionText, {
            submission_id: savedSubmission.id,
            content: req.text_submission as string,
          });
          await queryRunner.manager.save(submissionText);
        }

        if (hasFiles && req.files) {
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
              mime_type: file.mimetype,
            });
            await queryRunner.manager.save(attachment);
            filesData.push({
              file_name: attachment.file_name,
              file_path: attachment.file_path,
              file_size: attachment.file_size,
            });
          }
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
        status: savedSubmission.status,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (savedPaths.length > 0) {
        await FileService.deleteFiles(savedPaths);
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
