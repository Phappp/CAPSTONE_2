/* eslint-disable no-trailing-spaces */
import { DataSource, EntityManager, In } from 'typeorm';
import AppDataSource from '../../../../../lib/database';
import Assignment from '../../../../../internal/model/assignment';
import Lesson from '../../../../../internal/model/lesson';
import Module from '../../../../../internal/model/modules';
import CourseEnrollment from '../../../../../internal/model/course_enrollment';
import Submission from '../../../../../internal/model/submissions';
import SubmissionText from '../../../../../internal/model/submission_text';
import SubmissionAttachment from '../../../../../internal/model/submission_attachment';
import LessonProgress from '../../../../../internal/model/lesson_progress';
import LessonCompletion from '../../../../../internal/model/lesson_completion';
import CourseCompletionRequirement from '../../../../../internal/model/course_completion_requirements';
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

  private parseDate(value: unknown): Date | null {
    if (!value) return null;
    const dt = new Date(value as any);
    if (Number.isNaN(dt.getTime())) return null;
    return dt;
  }

  private async ensureAssignmentLessonAccessible(
    manager: EntityManager,
    userId: number,
    courseId: number,
    lesson: Lesson,
    module: Module
  ): Promise<void> {
    const now = new Date();
    const moduleOpenAt = this.parseDate((module as any).open_at);
    if (moduleOpenAt && moduleOpenAt.getTime() > now.getTime()) {
      throw new Error('Bài học chưa mở theo lịch.');
    }
    const lessonOpenAt = this.parseDate((lesson as any).open_at);
    if (lessonOpenAt && lessonOpenAt.getTime() > now.getTime()) {
      throw new Error('Bài học chưa mở theo lịch.');
    }

    const modules = await manager.find(Module, {
      where: { course_id: courseId } as any,
      order: { order_index: 'ASC', id: 'ASC' } as any,
    });
    const moduleIds = (modules as any[]).map((m) => Number((m as any).id)).filter((id) => id > 0);
    if (!moduleIds.length) return;

    const lessons = await manager.find(Lesson, {
      where: { module_id: In(moduleIds) } as any,
      order: { order_index: 'ASC', id: 'ASC' } as any,
    });
    const moduleOrder = new Map<number, number>(moduleIds.map((id, idx) => [id, idx]));
    const orderedLessons = [...(lessons as any[])].sort((a, b) => {
      const am = moduleOrder.get(Number((a as any).module_id)) ?? Number.MAX_SAFE_INTEGER;
      const bm = moduleOrder.get(Number((b as any).module_id)) ?? Number.MAX_SAFE_INTEGER;
      if (am !== bm) return am - bm;
      const ao = Number((a as any).order_index ?? 0);
      const bo = Number((b as any).order_index ?? 0);
      if (ao !== bo) return ao - bo;
      return Number((a as any).id) - Number((b as any).id);
    });

    const lessonId = Number((lesson as any).id);
    const idx = orderedLessons.findIndex((l) => Number((l as any).id) === lessonId);
    if (idx < 0) throw new Error('Bài học không hợp lệ.');

    const completionRows = await manager.find(LessonCompletion, {
      where: { user_id: userId, lesson_id: In(orderedLessons.map((l) => Number((l as any).id))) } as any,
      select: ['lesson_id'] as any,
    });
    const completedSet = new Set<number>((completionRows as any[]).map((r) => Number((r as any).lesson_id)));

    if (idx > 0) {
      const prevLessonId = Number((orderedLessons[idx - 1] as any).id);
      if (!completedSet.has(prevLessonId)) {
        throw new Error('Bạn cần hoàn thành bài trước đó trước khi nộp bài.');
      }
    }

    const lessonType = String((lesson as any).lesson_type || '');
    if (lessonType === 'assignment' || lessonType === 'quiz') {
      const moduleId = Number((lesson as any).module_id);
      const inModule = orderedLessons.filter((l) => Number((l as any).module_id) === moduleId);
      const selfIdx = inModule.findIndex((l) => Number((l as any).id) === lessonId);
      if (selfIdx > 0) {
        for (let i = 0; i < selfIdx; i++) {
          const requiredLessonId = Number((inModule[i] as any).id);
          if (!completedSet.has(requiredLessonId)) {
            throw new Error('Bạn cần hoàn thành các bài trước trong chương trước khi nộp bài.');
          }
        }
      }
    }
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
      await this.ensureAssignmentLessonAccessible(
        queryRunner.manager,
        Number(req.user_id),
        Number((mod as any).course_id),
        lesson as any,
        mod as any
      );

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
        const limitMinutes = Number((assignment as any).time_limit_minutes ?? 0);
        if (Number.isFinite(limitMinutes) && limitMinutes > 0) {
          const progressForTimer = await queryRunner.manager.findOne(LessonProgress, {
            where: {
              user_id: req.user_id,
              course_id: Number((mod as any).course_id),
              lesson_id: Number((lesson as any).id),
            } as any,
          });
          const nowMs = Date.now();
          const startedAtMs = progressForTimer?.created_at ? new Date((progressForTimer as any).created_at).getTime() : nowMs;
          const elapsedSeconds = Math.max(0, Math.floor((nowMs - startedAtMs) / 1000));
          const allowedSeconds = Math.max(1, Math.floor(limitMinutes * 60));
          if (elapsedSeconds > allowedSeconds) {
            throw new Error('Đã hết thời gian làm bài. Bạn không thể nộp thêm.');
          }
        }
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

      // Assignment được nộp => coi như đã hoàn thành lesson assessment để mở khóa bài tiếp theo.
      // Đồng bộ lesson_progress + lesson_completions tương tự luồng completeLesson.
      const courseId = Number((mod as any).course_id);
      const rules = await queryRunner.manager.findOne(CourseCompletionRequirement, {
        where: { course_id: courseId } as any,
      });
      const requiredSeconds = Number((rules as any)?.text_min_seconds ?? 30);

      let progress = await queryRunner.manager.findOne(LessonProgress, {
        where: { user_id: req.user_id, course_id: courseId, lesson_id: Number((lesson as any).id) } as any,
      });
      if (!progress) {
        progress = queryRunner.manager.create(LessonProgress, {
          user_id: req.user_id,
          course_id: courseId,
          lesson_id: Number((lesson as any).id),
          time_spent_seconds: requiredSeconds,
        } as any);
      } else {
        (progress as any).time_spent_seconds = Math.max(
          Number((progress as any).time_spent_seconds || 0),
          requiredSeconds
        );
      }
      await queryRunner.manager.save(progress as any);

      const completion = await queryRunner.manager.findOne(LessonCompletion, {
        where: { user_id: req.user_id, lesson_id: Number((lesson as any).id) } as any,
      });
      if (!completion) {
        await queryRunner.manager.save(
          queryRunner.manager.create(LessonCompletion, {
            user_id: req.user_id,
            lesson_id: Number((lesson as any).id),
            time_spent_seconds: Number((progress as any).time_spent_seconds || requiredSeconds),
          } as any)
        );
      }

      // Best-effort sync progress_percent cho enrollment.
      const lessonCountRows = await queryRunner.manager.query(
        `
        SELECT COUNT(*) AS total_lessons
        FROM lessons l
        INNER JOIN modules m ON m.id = l.module_id
        WHERE m.course_id = ?
        `,
        [courseId]
      );
      const totalLessons = Number(lessonCountRows?.[0]?.total_lessons ?? 0);
      if (totalLessons > 0) {
        const completedCountRows = await queryRunner.manager.query(
          `
          SELECT COUNT(*) AS completed_lessons
          FROM lesson_completions lc
          INNER JOIN lessons l ON l.id = lc.lesson_id
          INNER JOIN modules m ON m.id = l.module_id
          WHERE lc.user_id = ? AND m.course_id = ?
          `,
          [req.user_id, courseId]
        );
        const completedLessons = Number(completedCountRows?.[0]?.completed_lessons ?? 0);
        const progressPercent = Math.max(
          0,
          Math.min(100, Math.round(((completedLessons / totalLessons) * 100) * 100) / 100)
        );
        await queryRunner.manager.update(
          CourseEnrollment,
          { user_id: req.user_id, course_id: courseId } as any,
          {
            progress_percent: progressPercent,
            last_accessed_at: new Date(),
            ...(progressPercent >= 100 ? { status: 'completed', completed_at: new Date() } : {}),
          } as any
        );
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
