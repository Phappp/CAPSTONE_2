import { In } from 'typeorm';
import AppDataSource from '../../../../../lib/database';
import { getSignedDeliveryUrl } from '../../../lib/cloudinary';
import Course from '../../../../../internal/model/course';
import CourseInstructor from '../../../../../internal/model/course_instructor';
import CourseEnrollment from '../../../../../internal/model/course_enrollment';
import Module from '../../../../../internal/model/modules';
import Lesson from '../../../../../internal/model/lesson';
import LessonResource from '../../../../../internal/model/lesson_resource';
import LessonResourceReviewEvent from '../../../../../internal/model/lesson_resource_review_event';
import LessonCompletion from '../../../../../internal/model/lesson_completion';
import LessonProgress from '../../../../../internal/model/lesson_progress';
import CourseCompletionRequirement from '../../../../../internal/model/course_completion_requirements';
import UserRole from '../../../../../internal/model/user_roles';
import Role from '../../../../../internal/model/role';
import User from '../../../../../internal/model/user';
import Quiz from '../../../../../internal/model/quizze';
import QuizQuestion from '../../../../../internal/model/quiz_question';
import QuizAttempt from '../../../../../internal/model/quiz_attempt';
import QuestionBank from '../../../../../internal/model/question_banks';
import BankQuestion from '../../../../../internal/model/bank_questions';
import BankQuestionOption from '../../../../../internal/model/bank_question_options';
import QuestionOption from '../../../../../internal/model/question_option';
import QuizResponse from '../../../../../internal/model/quiz_response';
import QuizResponseOption from '../../../../../internal/model/quiz_response_options';
import Assignment from '../../../../../internal/model/assignment';
import LessonTranscriptCache from '../../../../../internal/model/lesson_transcript_cache';
import PaymentOrder from '../../../../../internal/model/payment_order';
import PaymentRevenueLedger from '../../../../../internal/model/payment_revenue_ledger';
import OpenRouterKey from '../../../../../internal/model/openrouter_key';
import OpenRouterSetting from '../../../../../internal/model/openrouter_setting';
import AuditLog from '../../../../../internal/model/audit_log';
import CourseReview from '../../../../../internal/model/course_review';
import crypto from 'crypto';
import env from '../../../utils/env';

import {
  CourseDashboardStats,
  TeacherRevenueSummary,
  TeacherRevenueSummaryQuery,
  TeacherRevenueTransactionsQuery,
  TeacherRevenueTransactionsResult,
  TeacherRevenueTrendResult,
  CourseContentTree,
  CourseListItem,
  CourseListQuery,
  CourseListResult,
  CourseService,
  CourseSortBy,
  CourseModuleItem,
  CourseLessonItem,
  CourseStatus,
  CreateLessonRequest,
  CreateModuleRequest,
  CreateCourseRequest,
  LessonType,
  LessonResourceItem,
  ReorderCourseContentRequest,
  SortDir,
  UpdateLessonRequest,
  UpdateModuleRequest,
  UpdateCourseRequest,
  PublishedCourseListQuery,
  PublishedCourseListResult,
  PublishedCourseListItem,
  CourseDetail,
  MyEnrollmentsQuery,
  MyEnrollmentsResult,
  MyEnrollmentListItem,
  EnrollmentResult,
  EnrollmentStatus,
  CourseProgressResult,
  LessonHeartbeatResult,
  LessonCompleteResult,
  CourseCompletionRules,
  UpdateCourseCompletionRulesRequest,
  CourseLearnerProgressResult,
  CourseLeaderboardResult,
  CourseManagerOverview,
  CoursePrerequisiteOption,
  PendingReviewCourseQuery,
  PendingReviewCourseListResult,
  ReviewCourseDecision,
  CoursePrerequisiteGraph,
  CoursePrerequisiteGraphNode,
  CoursePrerequisiteGraphEdge,
  ManualQuizDetailResult,
  ManualQuizAiGenerateRequest,
  ManualQuizAiGenerateResult,
  ManualQuizUpsertRequest,
  ManualQuizQuestionInput,
  LearnerQuizTakePayload,
  LearnerQuizSubmitRequest,
  LearnerQuizSubmitResult,
  QuizLearnerScoresResult,
  QuizLearnerScoresRow,
  QuizLearnerAttemptRow,
  QuizAttemptDetailResult,
  PendingLessonResourceQuery,
  PendingLessonResourceListResult,
  TeacherRejectedResourceListResult,
  TeacherPendingResourceListResult,
  TeacherApprovedResourceListResult,
  LessonResourceReviewDecision,
  LessonResourceReviewTimelineResult,
  LearningActivityResult,
  LearningActivityDayPoint,
  InstructorCatalogResult,
  InstructorCatalogItem,
  InstructorDetailItem,
  CourseReviewItem,
  CourseReviewListResult,
} from '../types';
import { AiSummaryService, LessonSummaryPayload, LessonSummarySourceType } from '../../ai-summary/types';

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function stripMarkdownJson(raw: string): string {
  let text = String(raw || '').trim();
  text = text.replace(/^```(?:json)?\s*/i, '');
  text = text.replace(/\s*```$/i, '');
  return text.trim();
}

function validateManualQuizQuestions(questions: ManualQuizQuestionInput[]): ManualQuizQuestionInput[] {
  if (!Array.isArray(questions) || questions.length < 1) {
    throw new Error('Cần ít nhất một câu hỏi.');
  }
  return questions.map((raw, qi) => {
    const qt = String(raw?.question_type || '');
    if (qt !== 'multiple_choice' && qt !== 'true_false') {
      throw new Error(`Câu ${qi + 1}: loại câu hỏi không hợp lệ.`);
    }
    const text = String(raw?.question_text || '').trim();
    if (!text) throw new Error(`Câu ${qi + 1}: nội dung trống.`);

    let options = Array.isArray(raw?.options) ? [...raw.options] : [];
    if (qt === 'true_false' && options.length === 0) {
      options = [
        { option_text: 'Đúng', is_correct: true },
        { option_text: 'Sai', is_correct: false },
      ] as ManualQuizQuestionInput['options'];
    }
    if (options.length < 2) {
      throw new Error(`Câu ${qi + 1}: cần ít nhất 2 lựa chọn.`);
    }
    const mapped = options.map((o) => ({
      option_text: String(o?.option_text ?? '').trim(),
      is_correct: Boolean(o?.is_correct),
    }));
    if (mapped.some((o) => !o.option_text)) {
      throw new Error(`Câu ${qi + 1}: đáp án không được để trống.`);
    }
    if (!mapped.some((o) => o.is_correct)) {
      throw new Error(`Câu ${qi + 1}: chưa chọn đáp án đúng.`);
    }

    const diff = String(raw?.difficulty || 'medium');
    const difficulty = diff === 'easy' || diff === 'hard' ? diff : 'medium';
    const points = raw?.points != null && Number.isFinite(Number(raw.points)) ? Number(raw.points) : 1;

    return {
      question_type: qt as ManualQuizQuestionInput['question_type'],
      question_text: text,
      explanation: raw?.explanation != null ? String(raw.explanation) : null,
      points,
      difficulty: difficulty as ManualQuizQuestionInput['difficulty'],
      options: mapped,
    };
  });
}

function normalizeSlug(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function safeJsonParse<T>(value: any, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === 'string') {
    const s = value.trim();
    if (!s) return fallback;
    try {
      return JSON.parse(s) as T;
    } catch {
      return fallback;
    }
  }
  // Some drivers already return JSON columns as objects/arrays.
  return value as T;
}

function parseNullableDateTime(input: any): Date | null {
  if (input == null) return null;
  const s = String(input).trim();
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function isCourseEffectivelyPublished(course: any, now: Date): boolean {
  const status = String(course?.status || 'draft');
  if (status === 'published') return true;
  if (status === 'archived') return false;
  const scheduled = parseNullableDateTime(course?.publish_scheduled_at);
  return Boolean(scheduled && scheduled.getTime() <= now.getTime());
}

function getFilenameExtension(name: string | null | undefined): string {
  const n = String(name || '').trim().toLowerCase();
  const idx = n.lastIndexOf('.');
  if (idx < 0) return '';
  return n.slice(idx + 1);
}

function parseYoutubeVideoId(inputUrl: string): string | null {
  try {
    const u = new URL(String(inputUrl || '').trim());
    const host = u.hostname.replace(/^www\./, '').toLowerCase();
    if (host === 'youtu.be') {
      const id = u.pathname.split('/').filter(Boolean)[0] || '';
      return id || null;
    }
    if (host === 'youtube.com' || host.endsWith('.youtube.com')) {
      const v = u.searchParams.get('v');
      if (v) return v;
      const parts = u.pathname.split('/').filter(Boolean);
      const idx = parts.findIndex((p) => p === 'embed' || p === 'shorts');
      if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
    }
    return null;
  } catch {
    return null;
  }
}

function buildYoutubeEmbedUrl(videoId: string): string {
  const id = String(videoId || '').trim();
  return `https://www.youtube.com/embed/${id}`;
}

function classifyResourceKind(params: { mime_type?: string | null; filename?: string | null; url?: string | null }): 'pdf' | 'word' | 'video' | 'youtube' | 'other' {
  const mime = String(params.mime_type || '').toLowerCase();
  const ext = getFilenameExtension(params.filename);
  const url = String(params.url || '').toLowerCase();

  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (mime.startsWith('video/')) return 'video';
  if (['mp4', 'webm', 'mov', 'm4v', 'avi', 'mkv', 'ogg'].includes(ext)) return 'video';
  if (mime === 'application/pdf' || ext === 'pdf') return 'pdf';
  if (
    mime === 'application/msword' ||
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    ext === 'doc' ||
    ext === 'docx'
  ) {
    return 'word';
  }
  return 'other';
}

function toIsoOrNull(input: Date | string | null | undefined): string | null {
  if (!input) return null;
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

const AUTO_QUIZ_BANK_NAME = '__AUTO_QUIZ_INTERNAL_BANK__';

function stripHtmlToText(input: string): string {
  return String(input || '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeTextForCompare(input: string): string {
  return String(input || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

let courseWorkflowSchemaEnsured = false;
async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  const rows = await AppDataSource.query(
    `
    SELECT COUNT(*) AS total
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND COLUMN_NAME = ?
    `,
    [tableName, columnName]
  );
  return Number(rows?.[0]?.total || 0) > 0;
}

async function indexExists(tableName: string, indexName: string): Promise<boolean> {
  const rows = await AppDataSource.query(
    `
    SELECT COUNT(*) AS total
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND INDEX_NAME = ?
    `,
    [tableName, indexName]
  );
  return Number(rows?.[0]?.total || 0) > 0;
}

async function ensureCourseWorkflowSchema(): Promise<void> {
  if (courseWorkflowSchemaEnsured) return;
  await AppDataSource.query(
    `
    CREATE TABLE IF NOT EXISTS course_review_events (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      course_id BIGINT UNSIGNED NOT NULL,
      actor_user_id BIGINT UNSIGNED NOT NULL,
      from_status ENUM('draft','pending_review','published','archived') NULL,
      to_status ENUM('draft','pending_review','published','archived') NOT NULL,
      decision ENUM('submit','approve','reject','archive','revert_draft') NOT NULL,
      note TEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_course_review_events_course_id (course_id),
      KEY idx_course_review_events_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `,
  );
  await AppDataSource.query(
    `
    CREATE TABLE IF NOT EXISTS course_manager_verifications (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      user_id BIGINT UNSIGNED NOT NULL,
      status ENUM('pending','verified','rejected','suspended') NOT NULL DEFAULT 'pending',
      application_note TEXT NULL,
      review_note TEXT NULL,
      reviewed_by BIGINT UNSIGNED NULL,
      reviewed_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_course_manager_verifications_user_id (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `,
  );
  await AppDataSource.query(
    `
    CREATE TABLE IF NOT EXISTS lesson_resource_review_events (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      resource_id BIGINT UNSIGNED NOT NULL,
      actor_user_id BIGINT UNSIGNED NOT NULL,
      from_status ENUM('pending','approved','rejected') NULL,
      to_status ENUM('pending','approved','rejected') NOT NULL,
      decision ENUM('submit','approve','reject','resubmit') NOT NULL,
      note TEXT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_lrr_events_resource_id (resource_id),
      KEY idx_lrr_events_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `,
  );
  if (!(await columnExists('lesson_resources', 'resource_kind'))) {
    await AppDataSource.query(
      `ALTER TABLE lesson_resources ADD COLUMN resource_kind ENUM('pdf','word','video','youtube','other') NOT NULL DEFAULT 'other'`
    );
  }
  if (!(await columnExists('lesson_resources', 'review_status'))) {
    await AppDataSource.query(
      `ALTER TABLE lesson_resources ADD COLUMN review_status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending'`
    );
  }
  if (!(await columnExists('lesson_resources', 'review_reason'))) {
    await AppDataSource.query(`ALTER TABLE lesson_resources ADD COLUMN review_reason TEXT NULL`);
  }
  if (!(await columnExists('lesson_resources', 'reviewed_by'))) {
    await AppDataSource.query(`ALTER TABLE lesson_resources ADD COLUMN reviewed_by BIGINT UNSIGNED NULL`);
  }
  if (!(await columnExists('lesson_resources', 'reviewed_at'))) {
    await AppDataSource.query(`ALTER TABLE lesson_resources ADD COLUMN reviewed_at DATETIME NULL`);
  }
  if (!(await columnExists('lesson_resources', 'review_decision'))) {
    await AppDataSource.query(
      `ALTER TABLE lesson_resources ADD COLUMN review_decision ENUM('add','update','delete') NOT NULL DEFAULT 'add'`
    );
  }

  if (!(await indexExists('lesson_resources', 'idx_lesson_resources_review_status'))) {
    await AppDataSource.query(`ALTER TABLE lesson_resources ADD INDEX idx_lesson_resources_review_status (review_status)`);
  }
  if (!(await indexExists('lesson_resources', 'idx_lesson_resources_resource_kind'))) {
    await AppDataSource.query(`ALTER TABLE lesson_resources ADD INDEX idx_lesson_resources_resource_kind (resource_kind)`);
  }
  if (!(await indexExists('lesson_resources', 'idx_lesson_resources_created_at'))) {
    await AppDataSource.query(`ALTER TABLE lesson_resources ADD INDEX idx_lesson_resources_created_at (created_at)`);
  }

  // Data fix for historical rows created before moderation flow:
  // old rows could be marked "approved" by default although never reviewed.
  await AppDataSource.query(
    `
    UPDATE lesson_resources lr
    LEFT JOIN (
      SELECT resource_id,
             SUM(CASE WHEN decision IN ('approve','reject') THEN 1 ELSE 0 END) AS reviewed_events
      FROM lesson_resource_review_events
      GROUP BY resource_id
    ) ev ON ev.resource_id = lr.id
    SET
      lr.review_status = 'pending',
      lr.review_reason = NULL,
      lr.reviewed_by = NULL,
      lr.reviewed_at = NULL
    WHERE
      lr.review_status = 'approved'
      AND lr.reviewed_by IS NULL
      AND lr.reviewed_at IS NULL
      AND COALESCE(ev.reviewed_events, 0) = 0
    `
  );

  // Helper to retry a query on deadlock (MySQL error 1213)
  const retryOnDeadlock = async <T>(fn: () => Promise<T>, retries = 3): Promise<T> => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (err: any) {
        if (err?.code === 'ER_LOCK_DEADLOCK' && attempt < retries) {
          // Wait a bit before retrying
          await new Promise((resolve) => setTimeout(resolve, 50 * attempt));
          continue;
        }
        throw err;
      }
    }
    throw new Error('Max retries exceeded');
  };

  // Backfill marker review-items for structured content (quiz/assignment)
  // so admin moderation can handle them through the same lesson_resources flow.
  await retryOnDeadlock(async () =>
    AppDataSource.query(
    `
    INSERT INTO lesson_resources
      (lesson_id, resource_type, url, filename, mime_type, preview_url, size_bytes, resource_kind, review_status, review_reason, reviewed_by, reviewed_at)
    SELECT
      q.lesson_id,
      'file',
      CONCAT('internal://lesson/', q.lesson_id, '/quiz'),
      CONCAT('[QUIZ] ', COALESCE(NULLIF(TRIM(q.title), ''), 'Quiz nội dung')),
      'application/vnd.mindbridge.review-item',
      NULL,
      NULL,
      'other',
      'pending',
      NULL,
      NULL,
      NULL
    FROM quizzes q
    LEFT JOIN lesson_resources lr
      ON lr.lesson_id = q.lesson_id
     AND lr.url = CONCAT('internal://lesson/', q.lesson_id, '/quiz')
    WHERE lr.id IS NULL
    `
    )
  );

  await retryOnDeadlock(async () =>
    AppDataSource.query(
    `
    INSERT INTO lesson_resources
      (lesson_id, resource_type, url, filename, mime_type, preview_url, size_bytes, resource_kind, review_status, review_reason, reviewed_by, reviewed_at)
    SELECT
      a.lesson_id,
      'file',
      CONCAT('internal://lesson/', a.lesson_id, '/assignment'),
      CONCAT('[ASSIGNMENT] ', COALESCE(NULLIF(TRIM(a.title), ''), 'Assignment nội dung')),
      'application/vnd.mindbridge.review-item',
      NULL,
      NULL,
      'other',
      'pending',
      NULL,
      NULL,
      NULL
    FROM assignments a
    INNER JOIN (
      SELECT lesson_id, MAX(id) AS max_id
      FROM assignments
      GROUP BY lesson_id
    ) latest ON latest.max_id = a.id
    LEFT JOIN lesson_resources lr
      ON lr.lesson_id = a.lesson_id
     AND lr.url = CONCAT('internal://lesson/', a.lesson_id, '/assignment')
    WHERE lr.id IS NULL
    `
    )
  );

  // Backfill granular assignment review markers (description + attachment/{idx})
  // and remove legacy single-marker rows (.../assignment).
  const latestAssignments = await AppDataSource.query(
    `
    SELECT
      a.id,
      a.lesson_id,
      a.title,
      a.attachments,
      legacy.id AS legacy_resource_id,
      legacy.review_status AS legacy_review_status,
      legacy.review_reason AS legacy_review_reason,
      legacy.reviewed_by AS legacy_reviewed_by,
      legacy.reviewed_at AS legacy_reviewed_at
    FROM assignments a
    INNER JOIN (
      SELECT lesson_id, MAX(id) AS max_id
      FROM assignments
      GROUP BY lesson_id
    ) latest ON latest.max_id = a.id
    LEFT JOIN lesson_resources legacy
      ON legacy.lesson_id = a.lesson_id
     AND legacy.url = CONCAT('internal://lesson/', a.lesson_id, '/assignment')
    `
  );
  for (const row of latestAssignments as any[]) {
    const lessonId = Number(row.lesson_id);
    if (!Number.isFinite(lessonId) || lessonId <= 0) continue;
    const baseTitle = String(row.title || '').trim() || 'Assignment nội dung';
    let attachments: any[] = [];
    try {
      const parsed = typeof row.attachments === 'string' ? JSON.parse(row.attachments) : row.attachments;
      attachments = Array.isArray(parsed) ? parsed : [];
    } catch {
      attachments = [];
    }
    const specs: Array<{ url: string; filename: string; mime_type: string }> = [
      {
        url: `internal://lesson/${lessonId}/assignment/description`,
        filename: `[ASSIGNMENT] ${baseTitle} - Mô tả`.slice(0, 255),
        mime_type: 'text/html',
      },
      ...attachments.map((att: any, idx: number) => {
        const attName = String(att?.file_name || '').trim() || `Tệp đính kèm #${idx + 1}`;
        return {
          url: `internal://lesson/${lessonId}/assignment/attachment/${idx}`,
          filename: `[ASSIGNMENT] ${baseTitle} - ${attName}`.slice(0, 255),
          mime_type: 'application/octet-stream',
        };
      }),
    ];
    const existingRows = await AppDataSource.query(
      `
      SELECT id, url
      FROM lesson_resources
      WHERE lesson_id = ?
        AND url LIKE ?
      `,
      [lessonId, `internal://lesson/${lessonId}/assignment/%`]
    );
    const existingByUrl = new Map<string, any>();
    for (const ex of existingRows as any[]) existingByUrl.set(String(ex.url || ''), ex);

    const legacyStatus = String(row.legacy_review_status || 'pending');
    const legacyReason = row.legacy_review_reason ?? null;
    const legacyReviewedBy = row.legacy_reviewed_by != null ? Number(row.legacy_reviewed_by) : null;
    const legacyReviewedAt = row.legacy_reviewed_at ?? null;

    for (const spec of specs) {
      const existing = existingByUrl.get(spec.url);
      if (existing) {
        await AppDataSource.query(
          `
          UPDATE lesson_resources
          SET filename = ?, mime_type = ?
          WHERE id = ?
          `,
          [spec.filename, spec.mime_type, Number(existing.id)]
        );
        continue;
      }
      await AppDataSource.query(
        `
        INSERT INTO lesson_resources
          (lesson_id, resource_type, url, filename, mime_type, preview_url, size_bytes, resource_kind, review_status, review_reason, reviewed_by, reviewed_at)
        VALUES
          (?, 'file', ?, ?, ?, NULL, NULL, 'other', ?, ?, ?, ?)
        `,
        [
          lessonId,
          spec.url,
          spec.filename,
          spec.mime_type,
          legacyStatus === 'approved' || legacyStatus === 'rejected' ? legacyStatus : 'pending',
          legacyStatus === 'rejected' ? legacyReason : null,
          legacyStatus === 'approved' || legacyStatus === 'rejected' ? legacyReviewedBy : null,
          legacyStatus === 'approved' || legacyStatus === 'rejected' ? legacyReviewedAt : null,
        ]
      );
    }

    if (row.legacy_resource_id != null) {
      await AppDataSource.query(`DELETE FROM lesson_resources WHERE id = ?`, [Number(row.legacy_resource_id)]);
    }
  }

  // Backfill YouTube resources created before embed normalization.
  await AppDataSource.query(
    `
    UPDATE lesson_resources
    SET resource_kind = 'youtube',
        resource_type = 'video'
    WHERE LOWER(COALESCE(url, '')) LIKE '%youtube.com%'
       OR LOWER(COALESCE(url, '')) LIKE '%youtu.be%'
    `
  );

  await AppDataSource.query(
    `
    UPDATE lesson_resources
    SET url = CONCAT(
      'https://www.youtube.com/embed/',
      SUBSTRING_INDEX(SUBSTRING_INDEX(url, 'v=', -1), '&', 1)
    )
    WHERE LOWER(COALESCE(url, '')) LIKE '%youtube.com/watch?v=%'
    `
  );

  await AppDataSource.query(
    `
    UPDATE lesson_resources
    SET url = CONCAT(
      'https://www.youtube.com/embed/',
      SUBSTRING_INDEX(SUBSTRING_INDEX(url, '?', 1), '/', -1)
    )
    WHERE LOWER(COALESCE(url, '')) LIKE '%youtu.be/%'
    `
  );
  courseWorkflowSchemaEnsured = true;
}

async function isUserCourseManager(userId: number): Promise<boolean> {
  await ensureCourseWorkflowSchema();
  const userRoleRepo = AppDataSource.getRepository(UserRole);
  const roleRepo = AppDataSource.getRepository(Role);
  const userRoles = await userRoleRepo.find({ where: { user_id: userId } });
  if (!userRoles.length) return false;

  const roleIds = userRoles.map((ur) => ur.role_id);
  const roles = await roleRepo.findByIds(roleIds);
  const names = roles.map((r) => String(r.name).toLowerCase());
  if (names.includes('admin')) return true;
  if (names.includes('teacher')) return true;
  if (!names.includes('course_manager')) return false;
  const rows = await AppDataSource.query(
    `SELECT status FROM course_manager_verifications WHERE user_id = ? LIMIT 1`,
    [userId],
  );
  if (!Array.isArray(rows) || rows.length === 0) return false;
  return String(rows[0].status || '').toLowerCase() === 'verified';
}

async function isUserInstructorRole(userId: number): Promise<boolean> {
  const userRoleRepo = AppDataSource.getRepository(UserRole);
  const roleRepo = AppDataSource.getRepository(Role);
  const userRoles = await userRoleRepo.find({ where: { user_id: userId } });
  if (!userRoles.length) return false;

  const roleIds = userRoles.map((ur) => ur.role_id);
  const roles = await roleRepo.findByIds(roleIds);
  const names = roles.map((r) => String(r.name).toLowerCase());
  return names.includes('admin') || names.includes('teacher') || names.includes('course_manager');
}

async function ensureUserIsCourseManager(userId: number) {
  const ok = await isUserCourseManager(userId);
  if (!ok) throw new Error('Bạn không có quyền thực hiện thao tác này.');
}

async function ensureUserCanAccessInstructorDashboard(userId: number) {
  const ok = await isUserInstructorRole(userId);
  if (!ok) throw new Error('Bạn không có quyền thực hiện thao tác này.');
}

async function isUserAdmin(userId: number): Promise<boolean> {
  const userRoleRepo = AppDataSource.getRepository(UserRole);
  const roleRepo = AppDataSource.getRepository(Role);
  const userRoles = await userRoleRepo.find({ where: { user_id: userId } });
  if (!userRoles.length) return false;
  const roleIds = userRoles.map((ur) => ur.role_id);
  const roles = await roleRepo.findByIds(roleIds);
  return roles.some((r) => String(r.name).toLowerCase() === 'admin');
}

function getOpenRouterEncryptionKey(): Buffer {
  const base = process.env.OPENROUTER_ENCRYPTION_SECRET || process.env.JWT_SECRET || 'mindbridge-openrouter-secret';
  return crypto.createHash('sha256').update(base).digest();
}

function decryptOpenRouterKey(payload: string): string {
  const [ivHex, encryptedHex] = String(payload || '').split(':');
  if (!ivHex || !encryptedHex) return '';
  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', getOpenRouterEncryptionKey(), iv);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

function mapCourseRowToItem(row: any): CourseListItem {
  const rawThumb = row.thumbnail_url ?? null;
  const thumbnail_url = rawThumb ? getSignedDeliveryUrl(rawThumb) : null;
  const now = new Date();
  const scheduled = row.publish_scheduled_at ? new Date(row.publish_scheduled_at) : null;
  const isScheduledAndDue = row.status === 'draft' && scheduled && scheduled.getTime() <= now.getTime();
  return {
    id: Number(row.id),
    title: String(row.title),
    slug: String(row.slug),
    short_description: row.short_description ?? null,
    full_description: row.full_description ?? null,
    category: row.category ?? null,
    thumbnail_url,
    level: String(row.level),
    language: String(row.language),
    learning_objectives: safeJsonParse<string[] | null>(row.learning_objectives ?? null, null),
    prerequisites: safeJsonParse<string[] | null>(row.prerequisites ?? null, null),
    price: row.price != null ? Number(row.price) : null,
    has_certificate: Boolean(row.has_certificate),
    estimated_hours: row.estimated_hours != null ? Number(row.estimated_hours) : null,
    tags: safeJsonParse<string[] | null>(row.tags ?? null, null),
    status: (isScheduledAndDue ? 'published' : (row.status as CourseStatus)) as CourseStatus,
    published_at: isScheduledAndDue
      ? scheduled?.toISOString() ?? null
      : row.published_at
        ? new Date(row.published_at).toISOString()
        : null,
    publish_scheduled_at: row.publish_scheduled_at ? new Date(row.publish_scheduled_at).toISOString() : null,
    created_at: new Date(row.created_at).toISOString(),
    updated_at: new Date(row.updated_at).toISOString(),
    learners_count: Number(row.learners_count ?? 0),
    modules_count: Number(row.modules_count ?? 0),
    lessons_count: Number(row.lessons_count ?? 0),
  };
}

function mapToPublishedCourseListItem(row: any): PublishedCourseListItem {
  const rawThumb = row.thumbnail_url ?? null;
  const thumbnail_url = rawThumb ? getSignedDeliveryUrl(rawThumb) : null;
  const now = new Date();
  const scheduled = row.publish_scheduled_at ? new Date(row.publish_scheduled_at) : null;
  const isScheduledAndDue = row.status === 'draft' && scheduled && scheduled.getTime() <= now.getTime();
  
  return {
    id: Number(row.id),
    title: String(row.title),
    slug: String(row.slug),
    short_description: row.short_description ?? null,
    thumbnail_url,
    level: String(row.level),
    language: String(row.language),
    published_at: isScheduledAndDue ? scheduled?.toISOString() ?? null : row.published_at ? new Date(row.published_at).toISOString() : null,
    learners_count: Number(row.learners_count ?? 0),
    modules_count: Number(row.modules_count ?? 0),
    lessons_count: Number(row.lessons_count ?? 0),
    price: row.price != null ? Number(row.price) : null,
    total_duration_minutes: row.total_duration_minutes ? Number(row.total_duration_minutes) : null,
    // COUNT(*) from SQL drivers thường trả về string ("0"/"1"), nên ép kiểu số.
    is_enrolled: Number(row.is_enrolled ?? 0) > 0,
    can_enroll: row.can_enroll == null ? true : Boolean(row.can_enroll),
    instructors: safeJsonParse<any[]>(row.instructors, []),
    rating: row.rating != null ? Number(row.rating) : null,
    avg_rating: row.rating != null ? Number(row.rating) : null,
    rating_count: Number(row.rating_count ?? 0),
  };
}

function mapToMyEnrollmentListItem(row: any): MyEnrollmentListItem {
  return {
    id: Number(row.id),
    course_id: Number(row.course_id),
    course_title: String(row.course_title),
    course_slug: String(row.course_slug),
    course_thumbnail: row.course_thumbnail ? getSignedDeliveryUrl(row.course_thumbnail) : null,
    course_level: String(row.course_level),
    enrolled_at: new Date(row.enrolled_at).toISOString(),
    last_accessed_at: row.last_accessed_at ? new Date(row.last_accessed_at).toISOString() : null,
    status: row.status as EnrollmentStatus,
    progress_percent: Number(row.progress_percent),
    completed_at: row.completed_at ? new Date(row.completed_at).toISOString() : null,
  };
}

function parsePrerequisiteCourseIds(prerequisites: unknown): number[] {
  if (!Array.isArray(prerequisites)) return [];
  const ids = prerequisites
    .map((x) => Number(String(x).trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
  return Array.from(new Set(ids));
}

function parseRevenueDateRange(query: TeacherRevenueSummaryQuery): { from?: Date; to?: Date } {
  const fromRaw = query?.from ? String(query.from).trim() : '';
  const toRaw = query?.to ? String(query.to).trim() : '';
  const from = fromRaw ? new Date(`${fromRaw}T00:00:00.000Z`) : undefined;
  const to = toRaw ? new Date(`${toRaw}T23:59:59.999Z`) : undefined;
  const validFrom = from && !Number.isNaN(from.getTime()) ? from : undefined;
  const validTo = to && !Number.isNaN(to.getTime()) ? to : undefined;
  return { from: validFrom, to: validTo };
}

export class CourseServiceImpl implements CourseService {
  private aiSummaryService: AiSummaryService | null = null;

  constructor(aiSummaryService?: AiSummaryService) {
    if (aiSummaryService) {
      this.aiSummaryService = aiSummaryService;
    }
  }

  async requestLessonSummary(uid: number, courseId: number, lessonId: number): Promise<LessonSummaryPayload> {
    if (!this.aiSummaryService) throw new Error('AiSummaryService chưa được cấu hình.');
    await this.ensureCanAccessLessonSummary(uid, courseId, lessonId);
    return this.aiSummaryService.requestLessonSummary(uid, courseId, lessonId);
  }

  async getLessonSummary(uid: number, courseId: number, lessonId: number): Promise<LessonSummaryPayload> {
    if (!this.aiSummaryService) throw new Error('AiSummaryService chưa được cấu hình.');
    await this.ensureCanAccessLessonSummary(uid, courseId, lessonId);
    return this.aiSummaryService.getLessonSummary(uid, courseId, lessonId);
  }

  async regenerateLessonSummary(uid: number, courseId: number, lessonId: number): Promise<LessonSummaryPayload> {
    if (!this.aiSummaryService) throw new Error('AiSummaryService chưa được cấu hình.');
    await this.ensureCanAccessLessonSummary(uid, courseId, lessonId);
    return this.aiSummaryService.regenerateLessonSummary(uid, courseId, lessonId);
  }

  private async ensureCanAccessLessonSummary(subjectUserId: number, courseId: number, lessonId: number): Promise<void> {
    const lessonRepo = AppDataSource.getRepository(Lesson);
    const moduleRepo = AppDataSource.getRepository(Module);
    const lesson = await lessonRepo.findOne({ where: { id: lessonId } as any });
    if (!lesson) throw new Error('Không tìm thấy bài học.');
    const mod = await moduleRepo.findOne({ where: { id: Number((lesson as any).module_id), course_id: courseId } as any });
    if (!mod) throw new Error('Bài học không thuộc khóa học này.');

    const admin = await isUserAdmin(subjectUserId);
    if (admin) return;

    const manager = await isUserCourseManager(subjectUserId);
    if (manager) return;

    const course = await AppDataSource.getRepository(Course).findOne({ where: { id: courseId } as any });
    if (course && Number((course as any).instructor_id) === subjectUserId) return;

    const enrollment = await AppDataSource.getRepository(CourseEnrollment).findOne({
      where: { user_id: subjectUserId, course_id: courseId } as any,
    });
    if (!enrollment) {
      throw new Error('Bạn chưa đăng ký khóa học này.');
    }
  }

  private async logCourseAudit(
    actorUserId: number,
    action: string,
    courseId: number,
    metadata: Record<string, unknown> | null = null
  ): Promise<void> {
    try {
      const auditRepo = AppDataSource.getRepository(AuditLog);
      await auditRepo.save(
        auditRepo.create({
          actor_user_id: actorUserId,
          target_user_id: null,
          action,
          metadata: { course_id: courseId, ...(metadata || {}) },
        })
      );
    } catch {
      // Không chặn nghiệp vụ nếu bảng audit chưa sẵn sàng.
    }
  }

  private async logCourseReviewEvent(params: {
    courseId: number;
    actorUserId: number;
    fromStatus: CourseStatus | null;
    toStatus: CourseStatus;
    decision: 'submit' | 'approve' | 'reject' | 'archive' | 'revert_draft';
    note?: string | null;
  }): Promise<void> {
    await ensureCourseWorkflowSchema();
    await AppDataSource.query(
      `
      INSERT INTO course_review_events (course_id, actor_user_id, from_status, to_status, decision, note)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [params.courseId, params.actorUserId, params.fromStatus, params.toStatus, params.decision, params.note ?? null],
    );
  }

  private async logLessonResourceReviewEvent(params: {
    resourceId: number;
    actorUserId: number;
    fromStatus: 'pending' | 'approved' | 'rejected' | null;
    toStatus: 'pending' | 'approved' | 'rejected';
    decision: 'submit' | 'approve' | 'reject' | 'resubmit';
    note?: string | null;
  }): Promise<void> {
    await ensureCourseWorkflowSchema();
    await AppDataSource.query(
      `
      INSERT INTO lesson_resource_review_events (resource_id, actor_user_id, from_status, to_status, decision, note)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [params.resourceId, params.actorUserId, params.fromStatus, params.toStatus, params.decision, params.note ?? null],
    );
  }

  private async upsertStructuredLessonReviewResource(params: {
    lessonId: number;
    actorUserId: number;
    kind: 'quiz' | 'assignment';
    title?: string | null;
  }): Promise<void> {
    const resourceRepo = AppDataSource.getRepository(LessonResource);
    const markerUrl = `internal://lesson/${params.lessonId}/${params.kind}`;
    const markerName =
      params.kind === 'quiz'
        ? `[QUIZ] ${String(params.title || 'Quiz nội dung').trim()}`
        : `[ASSIGNMENT] ${String(params.title || 'Assignment nội dung').trim()}`;

    const existing = await resourceRepo.findOne({
      where: { lesson_id: params.lessonId, url: markerUrl } as any,
      order: { id: 'DESC' } as any,
    });
    const fromStatus = existing
      ? (String((existing as any).review_status || 'pending') as 'pending' | 'approved' | 'rejected')
      : null;

    if (!existing) {
      const created = await resourceRepo.save(
        resourceRepo.create({
          lesson_id: params.lessonId,
          resource_type: 'file',
          resource_kind: 'other',
          url: markerUrl,
          filename: markerName.slice(0, 255),
          mime_type: 'application/vnd.mindbridge.review-item',
          size_bytes: null,
          preview_url: null,
          review_status: 'pending',
          review_reason: null,
          reviewed_by: null,
          reviewed_at: null,
        } as any)
      );
      await this.logLessonResourceReviewEvent({
        resourceId: Number((created as any).id),
        actorUserId: params.actorUserId,
        fromStatus: null,
        toStatus: 'pending',
        decision: 'submit',
        note: `structured:${params.kind}`,
      });
      return;
    }

    await resourceRepo.update(
      { id: (existing as any).id } as any,
      {
        filename: markerName.slice(0, 255),
        review_status: 'pending',
        review_reason: null,
        reviewed_by: null,
        reviewed_at: null,
      } as any
    );
    await this.logLessonResourceReviewEvent({
      resourceId: Number((existing as any).id),
      actorUserId: params.actorUserId,
      fromStatus,
      toStatus: 'pending',
      decision: fromStatus === 'rejected' ? 'resubmit' : 'submit',
      note: `structured:${params.kind}`,
    });
  }

  private async ensurePendingReviewFallsBackToDraftOnContentChange(
    subjectUserId: number,
    courseId: number,
    note: string
  ): Promise<void> {
    const courseRepo = AppDataSource.getRepository(Course);
    const course = await courseRepo.findOne({ where: { id: courseId } as any });
    if (!course || (course as any).deleted_at) return;
    const fromStatus = String((course as any).status || '') as CourseStatus;
    if (fromStatus !== 'pending_review') return;
    (course as any).status = 'draft';
    (course as any).published_at = null;
    (course as any).publish_scheduled_at = null;
    await courseRepo.save(course as any);
    await this.logCourseReviewEvent({
      courseId,
      actorUserId: subjectUserId,
      fromStatus,
      toStatus: 'draft',
      decision: 'revert_draft',
      note,
    });
  }

  private ensureCourseEditableForTeacher(course: any): void {
    const status = String((course as any)?.status || '');
    if (status === 'pending_review') {
      throw new Error('Khóa học đang chờ duyệt. Vui lòng thu hồi yêu cầu duyệt để tiếp tục chỉnh sửa.');
    }
  }

  private async ensureCanEditRejectedResourceWhilePendingReview(
    course: any,
    params: { resourceId?: number; lessonId?: number; markerPrefix?: 'quiz' | 'assignment' }
  ): Promise<void> {
    const status = String((course as any)?.status || '');
    if (status !== 'pending_review') return;

    const resourceRepo = AppDataSource.getRepository(LessonResource);
    if (params.resourceId && Number(params.resourceId) > 0) {
      const row = await resourceRepo.findOne({ where: { id: Number(params.resourceId) } as any });
      if (row && String((row as any).review_status || '') === 'rejected') return;
      throw new Error('Khóa học đang chờ duyệt. Chỉ được sửa mục đang bị từ chối.');
    }

    if (params.lessonId) {
      const qb = resourceRepo
        .createQueryBuilder('r')
        .where('r.lesson_id = :lessonId', { lessonId: Number(params.lessonId) })
        .andWhere('r.review_status = :status', { status: 'rejected' });
      if (params.markerPrefix) {
        const markerPrefix = `internal://lesson/${Number(params.lessonId)}/${params.markerPrefix}`;
        qb.andWhere('r.url LIKE :prefix', { prefix: `${markerPrefix}%` });
      }
      const rejectedMarker = await qb.getOne();
      if (rejectedMarker) return;
      throw new Error('Khóa học đang chờ duyệt. Chỉ được sửa mục đang bị từ chối.');
    }

    throw new Error('Khóa học đang chờ duyệt. Chỉ được sửa mục đang bị từ chối.');
  }

  private async ensureCourseMeetsSubmissionGate(courseId: number): Promise<void> {
    const courseRepo = AppDataSource.getRepository(Course);
    const moduleRepo = AppDataSource.getRepository(Module);
    const lessonRepo = AppDataSource.getRepository(Lesson);
    const resourceRepo = AppDataSource.getRepository(LessonResource);
    const quizRepo = AppDataSource.getRepository(Quiz);
    const quizQuestionRepo = AppDataSource.getRepository(QuizQuestion);
    const assignmentRepo = AppDataSource.getRepository(Assignment);
    const course = await courseRepo.findOne({ where: { id: courseId } as any });
    if (!course || (course as any).deleted_at) throw new Error('Không tìm thấy khóa học.');

    const issues: string[] = [];
    const MIN_QUIZ_QUESTIONS = 3;
    const MIN_FILE_PROMPT_DESC_LENGTH = 20;
    const MIN_RICH_TEXT_CONTENT_LENGTH = 30;
    if (!String(course.title || '').trim()) issues.push('Thiếu tiêu đề khóa học.');
    if (!String((course as any).short_description || '').trim()) issues.push('Thiếu mô tả ngắn.');
    if (!String((course as any).full_description || '').trim()) issues.push('Thiếu mô tả chi tiết.');
    if (!String((course as any).thumbnail_url || '').trim()) issues.push('Thiếu ảnh đại diện khóa học.');

    const modules = await moduleRepo.find({ where: { course_id: courseId } as any });
    if (modules.length < 1) issues.push('Khóa học cần ít nhất 1 chương.');
    const moduleIds = modules.map((m: any) => Number(m.id));
    const lessons = moduleIds.length
      ? await lessonRepo.createQueryBuilder('l').where('l.module_id IN (:...moduleIds)', { moduleIds }).getMany()
      : [];
    if (lessons.length < 3) issues.push('Khóa học cần ít nhất 3 bài học.');
    const lessonIds = lessons.map((l: any) => Number(l.id));
    const resources = lessonIds.length
      ? await resourceRepo.createQueryBuilder('r').where('r.lesson_id IN (:...lessonIds)', { lessonIds }).getMany()
      : [];
    const resourcesByLesson = new Map<number, any[]>();
    for (const r of resources as any[]) {
      const lid = Number((r as any).lesson_id);
      const arr = resourcesByLesson.get(lid) || [];
      arr.push(r);
      resourcesByLesson.set(lid, arr);
    }

    const quizzes = lessonIds.length
      ? await quizRepo.find({ where: { lesson_id: In(lessonIds) } as any })
      : [];
    const quizByLesson = new Map<number, any>();
    for (const q of quizzes as any[]) {
      quizByLesson.set(Number((q as any).lesson_id), q);
    }
    const quizIds = (quizzes as any[]).map((q) => Number((q as any).id)).filter((id) => Number.isFinite(id));
    const quizQuestions = quizIds.length
      ? await quizQuestionRepo.find({
          where: { quiz_id: In(quizIds) } as any,
          relations: ['bankQuestion', 'bankQuestion.options'],
        })
      : [];
    const quizQuestionsByQuizId = new Map<number, any[]>();
    for (const qq of quizQuestions as any[]) {
      const qid = Number((qq as any).quiz_id);
      const arr = quizQuestionsByQuizId.get(qid) || [];
      arr.push(qq);
      quizQuestionsByQuizId.set(qid, arr);
    }

    const assignments = lessonIds.length
      ? await assignmentRepo.find({ where: { lesson_id: In(lessonIds) } as any, order: { id: 'DESC' } as any })
      : [];
    const assignmentByLesson = new Map<number, any>();
    for (const a of assignments as any[]) {
      const lid = Number((a as any).lesson_id);
      if (!assignmentByLesson.has(lid)) assignmentByLesson.set(lid, a);
    }

    for (const lesson of lessons as any[]) {
      const lessonId = Number((lesson as any).id);
      const lessonTitle = String((lesson as any).title || `#${lessonId}`).trim();
      const lessonType = String((lesson as any).lesson_type || 'text');
      const lessonResources = resourcesByLesson.get(lessonId) || [];
      const allKinds = lessonResources.map((r) =>
        classifyResourceKind({
          mime_type: (r as any).mime_type,
          filename: (r as any).filename,
          url: (r as any).url,
        })
      );

      if (lessonType === 'quiz') {
        const quiz = quizByLesson.get(lessonId);
        if (!quiz) {
          issues.push(`Bài Quiz "${lessonTitle}" chưa có bộ câu hỏi.`);
          continue;
        }
        const qRows = quizQuestionsByQuizId.get(Number((quiz as any).id)) || [];
        if (qRows.length < MIN_QUIZ_QUESTIONS) {
          issues.push(`Bài Quiz "${lessonTitle}" cần ít nhất ${MIN_QUIZ_QUESTIONS} câu hỏi.`);
          continue;
        }
        qRows.forEach((row, idx) => {
          const qText = String((row as any)?.bankQuestion?.question_text || '').trim();
          if (!qText) {
            issues.push(`Bài Quiz "${lessonTitle}" có câu ${idx + 1} bị trống nội dung.`);
            return;
          }
          const optsRaw = Array.isArray((row as any)?.bankQuestion?.options) ? (row as any).bankQuestion.options : [];
          const opts = optsRaw
            .map((o: any) => ({
              text: String(o?.option_text || '').trim(),
              isCorrect: Boolean(o?.is_correct),
            }))
            .sort((a: any, b: any) => normalizeTextForCompare(a.text).localeCompare(normalizeTextForCompare(b.text)));
          if (opts.length < 2) {
            issues.push(`Bài Quiz "${lessonTitle}" có câu ${idx + 1} chưa đủ lựa chọn.`);
            return;
          }
          if (opts.some((o: any) => !o.text)) {
            issues.push(`Bài Quiz "${lessonTitle}" có câu ${idx + 1} chứa đáp án rỗng.`);
            return;
          }
          const normalizedSet = new Set(opts.map((o: any) => normalizeTextForCompare(o.text)));
          if (normalizedSet.size !== opts.length) {
            issues.push(`Bài Quiz "${lessonTitle}" có câu ${idx + 1} bị trùng đáp án.`);
            return;
          }
          const correctCount = opts.filter((o: any) => o.isCorrect).length;
          if (correctCount !== 1) {
            issues.push(`Bài Quiz "${lessonTitle}" có câu ${idx + 1} cần đúng 1 đáp án chính xác.`);
          }
        });
        continue;
      }

      if (lessonType === 'assignment') {
        const assignment = assignmentByLesson.get(lessonId);
        if (!assignment) {
          issues.push(`Bài tập "${lessonTitle}" chưa được cấu hình.`);
          continue;
        }
        const title = String((assignment as any).title || '').trim();
        const description = stripHtmlToText(String((assignment as any).description || ''));
        const instructions = stripHtmlToText(String((assignment as any).instructions || ''));
        const formats = safeJsonParse<any[]>((assignment as any).submission_format, []);
        const hasSubmissionCriteria = instructions.length > 0 || (Array.isArray(formats) && formats.length > 0);
        const kind = String((assignment as any).assignment_kind || 'file_prompt') === 'short_answer' ? 'short_answer' : 'file_prompt';

        if (!title) issues.push(`Bài tập "${lessonTitle}" thiếu tiêu đề.`);
        if (!description && kind !== 'short_answer') issues.push(`Bài tập "${lessonTitle}" thiếu mô tả yêu cầu.`);
        if (!hasSubmissionCriteria) {
          issues.push(`Bài tập "${lessonTitle}" thiếu tiêu chí nộp bài (hướng dẫn hoặc định dạng nộp).`);
        }

        if (kind === 'short_answer') {
          const shortQuestions = safeJsonParse<any[]>((assignment as any).short_answer_questions, []);
          const validShortQuestions = shortQuestions.filter((q: any) => String(q?.question_text || '').trim().length > 0);
          if (validShortQuestions.length < 1) {
            issues.push(`Bài tập "${lessonTitle}" dạng trả lời ngắn cần ít nhất 1 câu hỏi.`);
          }
        } else {
          if (description.length < MIN_FILE_PROMPT_DESC_LENGTH) {
            issues.push(
              `Bài tập "${lessonTitle}" dạng tự luận cần mô tả đề bài rõ ràng (tối thiểu ${MIN_FILE_PROMPT_DESC_LENGTH} ký tự).`
            );
          }
        }
        continue;
      }

      const hasVideo = lessonResources.some((r, idx) => {
        const kind = allKinds[idx];
        const mime = String((r as any).mime_type || '').toLowerCase();
        return kind === 'video' || kind === 'youtube' || mime.startsWith('video/');
      });
      const hasHtmlContent = lessonResources.some((r) => {
        const mime = String((r as any).mime_type || '').toLowerCase();
        const size = Number((r as any).size_bytes ?? 0);
        return mime.includes('text/html') && size >= MIN_RICH_TEXT_CONTENT_LENGTH;
      });
      const hasAttachment = lessonResources.some((r, idx) => {
        const kind = allKinds[idx];
        const mime = String((r as any).mime_type || '').toLowerCase();
        return (
          kind === 'pdf' ||
          kind === 'word' ||
          kind === 'other' ||
          ((mime && !mime.includes('text/html') && !mime.startsWith('video/')) || (!mime && kind !== 'video' && kind !== 'youtube'))
        );
      });
      if (!hasVideo && !hasHtmlContent && !hasAttachment) {
        issues.push(
          `Bài học "${lessonTitle}" chưa có nội dung hợp lệ (cần video, rich text hoặc tài liệu đính kèm).`
        );
      }
    }

    if (resources.length < 1) issues.push('Khóa học cần ít nhất 1 tài nguyên học tập.');
    const rejectedResources = (resources as any[]).filter((r) => String((r as any).review_status || '') === 'rejected');
    if (rejectedResources.length > 0) {
      issues.push('Có tài nguyên bị từ chối, vui lòng cập nhật trước khi gửi duyệt.');
    }
    if (issues.length > 0) {
      throw new Error(`Khóa học chưa đạt điều kiện duyệt: ${issues.join(' ')}`);
    }
  }

  private async ensureCourseReadyForPublish(courseId: number): Promise<void> {
    await this.ensureCourseMeetsSubmissionGate(courseId);
    const resourceRepo = AppDataSource.getRepository(LessonResource);
    const moduleRepo = AppDataSource.getRepository(Module);
    const lessonRepo = AppDataSource.getRepository(Lesson);

    const modules = await moduleRepo.find({ where: { course_id: courseId } as any });
    const moduleIds = modules.map((m: any) => Number(m.id));
    const lessons = moduleIds.length
      ? await lessonRepo.createQueryBuilder('l').where('l.module_id IN (:...moduleIds)', { moduleIds }).getMany()
      : [];
    const lessonIds = lessons.map((l: any) => Number(l.id));
    const resources = lessonIds.length
      ? await resourceRepo.createQueryBuilder('r').where('r.lesson_id IN (:...lessonIds)', { lessonIds }).getMany()
      : [];
    const pendingCount = (resources as any[]).filter((r) => String((r as any).review_status || 'pending') === 'pending').length;
    if (pendingCount > 0) {
      throw new Error(`Còn ${pendingCount} tài nguyên chờ duyệt. Vui lòng xử lý hết trước khi xuất bản.`);
    }
    const rejectedCount = (resources as any[]).filter((r) => String((r as any).review_status || '') === 'rejected').length;
    if (rejectedCount > 0) {
      throw new Error(`Còn ${rejectedCount} tài nguyên bị từ chối. Vui lòng cập nhật và gửi lại trước khi xuất bản.`);
    }
  }

  private async buildPrerequisiteGraph(
    rootCourse: any,
    subjectUserId: number | undefined,
    scope: 'published' | 'published_or_own' = 'published'
  ): Promise<CoursePrerequisiteGraph> {
    const courseRepo = AppDataSource.getRepository(Course);
    const enrollmentRepo = AppDataSource.getRepository(CourseEnrollment);
    const rootId = Number(rootCourse.id);
    const now = new Date();
    const qb = courseRepo
      .createQueryBuilder('c')
      .where('c.deleted_at IS NULL');
    if (scope === 'published_or_own' && subjectUserId) {
      qb.andWhere(
        `(
          (c.status = :published OR (c.status = :draft AND c.publish_scheduled_at IS NOT NULL AND c.publish_scheduled_at <= :now))
          OR c.created_by = :uid
          OR c.id = :rootId
        )`,
        { published: 'published', draft: 'draft', now, uid: subjectUserId, rootId }
      );
    } else {
      qb.andWhere(
        `(c.status = :published OR (c.status = :draft AND c.publish_scheduled_at IS NOT NULL AND c.publish_scheduled_at <= :now) OR c.id = :rootId)`,
        { published: 'published', draft: 'draft', now, rootId }
      );
    }
    const courses = await qb.getMany();
    const courseById = new Map<number, any>();
    for (const c of courses as any[]) courseById.set(Number(c.id), c);
    if (!courseById.has(rootId)) courseById.set(rootId, rootCourse);

    const edges: CoursePrerequisiteGraphEdge[] = [];
    const undirected = new Map<number, Set<number>>();
    const addUndirected = (a: number, b: number) => {
      const sa = undirected.get(a) || new Set<number>();
      sa.add(b);
      undirected.set(a, sa);
      const sb = undirected.get(b) || new Set<number>();
      sb.add(a);
      undirected.set(b, sb);
    };

    for (const [cid, c] of courseById.entries()) {
      const prereqIds = parsePrerequisiteCourseIds(c.prerequisites);
      for (const pid of prereqIds) {
        if (!courseById.has(pid) || pid === cid) continue;
        edges.push({ from_course_id: pid, to_course_id: cid });
        addUndirected(pid, cid);
      }
    }

    const componentIds = new Set<number>();
    const queue: number[] = [rootId];
    while (queue.length) {
      const id = queue.shift()!;
      if (componentIds.has(id)) continue;
      componentIds.add(id);
      const adj = undirected.get(id);
      if (!adj) continue;
      for (const n of adj) if (!componentIds.has(n)) queue.push(n);
    }

    const nodesById = new Map<number, CoursePrerequisiteGraphNode>();
    for (const id of componentIds) {
      const c = courseById.get(id);
      if (!c) continue;
      nodesById.set(id, {
        id,
        title: String(c.title || ''),
        slug: String(c.slug || ''),
        thumbnail_url: c.thumbnail_url ? getSignedDeliveryUrl(c.thumbnail_url) : null,
        level: String(c.level || ''),
        is_current: id === rootId,
        is_completed: false,
      });
    }
    const filteredEdges = edges.filter(
      (e) => componentIds.has(e.from_course_id) && componentIds.has(e.to_course_id)
    );

    if (subjectUserId) {
      const nodeIds = Array.from(nodesById.keys());
      if (nodeIds.length) {
        const enrollments = await enrollmentRepo.find({ where: { user_id: subjectUserId } as any });
        const completedSet = new Set<number>(
          (enrollments as any[])
            .filter((e) => String((e as any).status) === 'completed')
            .map((e) => Number((e as any).course_id))
        );
        for (const id of nodeIds) {
          const n = nodesById.get(id);
          if (n) n.is_completed = completedSet.has(id);
        }
      }
    }

    return {
      root_course_id: rootId,
      nodes: Array.from(nodesById.values()),
      edges: filteredEdges,
    };
  }

  private async validatePrerequisiteGraph(courseId: number, prerequisiteIds: number[]): Promise<void> {
    const uniquePrerequisiteIds = Array.from(
      new Set(prerequisiteIds.filter((id) => Number.isInteger(id) && id > 0))
    );
    if (!uniquePrerequisiteIds.length) return;

    if (uniquePrerequisiteIds.includes(courseId)) {
      throw new Error('Không thể đặt khóa học làm tiên quyết của chính nó.');
    }

    const courseRepo = AppDataSource.getRepository(Course);
    const prerequisiteCourses = await courseRepo.findByIds(uniquePrerequisiteIds as any);
    const existingIds = new Set<number>((prerequisiteCourses as any[]).map((c) => Number(c.id)));
    const missingIds = uniquePrerequisiteIds.filter((id) => !existingIds.has(id));
    if (missingIds.length) {
      throw new Error(`Không tìm thấy khóa học tiên quyết: ${missingIds.join(', ')}.`);
    }

    for (const c of prerequisiteCourses as any[]) {
      const deps = parsePrerequisiteCourseIds(c.prerequisites);
      if (deps.includes(courseId)) {
        throw new Error(`Quan hệ tiên quyết không hợp lệ với khóa học "${c.title}" (không được đặt ngược).`);
      }
    }

    const cache = new Map<number, number[]>();
    const getDeps = async (id: number): Promise<number[]> => {
      if (cache.has(id)) return cache.get(id)!;
      const c = await courseRepo.findOne({ where: { id, deleted_at: null as any } as any });
      const deps = c ? parsePrerequisiteCourseIds((c as any).prerequisites) : [];
      cache.set(id, deps);
      return deps;
    };

    for (const start of uniquePrerequisiteIds) {
      const stack: number[] = [start];
      const visited = new Set<number>();
      while (stack.length) {
        const node = stack.pop()!;
        if (node === courseId) {
          throw new Error('Quan hệ khóa học tiên quyết bị xoay vòng. Vui lòng kiểm tra lại.');
        }
        if (visited.has(node)) continue;
        visited.add(node);
        const deps = await getDeps(node);
        for (const dep of deps) {
          if (!visited.has(dep)) stack.push(dep);
        }
      }
    }
  }

  private async validatePrerequisiteIdsExist(prerequisiteIds: number[]): Promise<void> {
    const uniquePrerequisiteIds = Array.from(
      new Set(prerequisiteIds.filter((id) => Number.isInteger(id) && id > 0))
    );
    if (!uniquePrerequisiteIds.length) return;
    const courseRepo = AppDataSource.getRepository(Course);
    const prerequisiteCourses = await courseRepo.findByIds(uniquePrerequisiteIds as any);
    const existingIds = new Set<number>((prerequisiteCourses as any[]).map((c) => Number(c.id)));
    const missingIds = uniquePrerequisiteIds.filter((id) => !existingIds.has(id));
    if (missingIds.length) {
      throw new Error(`Không tìm thấy khóa học tiên quyết: ${missingIds.join(', ')}.`);
    }
  }

  // Public methods - Course catalog
  async listPublishedCourses(
    subjectUserId: number | undefined, 
    query: PublishedCourseListQuery
  ): Promise<PublishedCourseListResult> {
    const courseRepo = AppDataSource.getRepository(Course);
    const now = new Date();

    const page = Number(query.page || 1);
    const pageSize = Math.min(50, Math.max(1, Number(query.page_size || 12)));
    const q = query.q ? String(query.q).trim() : '';

    const qb = courseRepo.createQueryBuilder('c');
    // Effective "published": either explicitly published, or draft scheduled for publish_scheduled_at <= now.
    qb.where(
      `(c.status = :published OR (c.status = :draft AND c.publish_scheduled_at IS NOT NULL AND c.publish_scheduled_at <= :now))`,
      { published: 'published', draft: 'draft', now }
    );
    qb.andWhere('c.deleted_at IS NULL');
    
    if (q) {
      qb.andWhere('(c.title LIKE :q OR c.short_description LIKE :q)', { q: `%${q}%` });
    }
    
    if (query.level) {
      qb.andWhere('c.level = :level', { level: query.level });
    }
    
    if (query.language) {
      qb.andWhere('c.language = :language', { language: query.language });
    }

    // Add learners count
    qb.addSelect((subQb) => {
      return subQb
        .select('COUNT(*)', 'cnt')
        .from(CourseEnrollment, 'ce')
        .where('ce.course_id = c.id');
    }, 'learners_count');

    // Add modules count
    qb.addSelect((subQb) => {
      return subQb
        .select('COUNT(*)', 'cnt')
        .from(Module, 'm')
        .where('m.course_id = c.id');
    }, 'modules_count');

    // Add lessons count
    qb.addSelect((subQb) => {
      return subQb
        .select('COUNT(*)', 'cnt')
        .from(Lesson, 'l')
        .innerJoin(Module, 'm', 'm.id = l.module_id')
        .where('m.course_id = c.id');
    }, 'lessons_count');

    // Add total duration
    qb.addSelect((subQb) => {
      return subQb
        .select('SUM(l.duration_minutes)', 'sum')
        .from(Lesson, 'l')
        .innerJoin(Module, 'm', 'm.id = l.module_id')
        .where('m.course_id = c.id');
    }, 'total_duration_minutes');

    // Add instructors info
    qb.addSelect((subQb) => {
      return subQb
        .select(`
          JSON_ARRAYAGG(
            JSON_OBJECT(
              'id', u.id,
              'full_name', u.full_name,
              'avatar_url', u.avatar_url
            )
          )
        `)
        .from(CourseInstructor, 'ci')
        .innerJoin(User, 'u', 'u.id = ci.instructor_id')
        .where('ci.course_id = c.id');
    }, 'instructors');

    // Add avg rating and rating count
    qb.addSelect((subQb) => {
      return subQb
        .select('AVG(cr.rating)', 'rating')
        .from(CourseReview, 'cr')
        .where('cr.course_id = c.id')
        .andWhere('cr.is_visible = true');
    }, 'rating');

    qb.addSelect((subQb) => {
      return subQb
        .select('COUNT(*)', 'cnt')
        .from(CourseReview, 'cr')
        .where('cr.course_id = c.id')
        .andWhere('cr.is_visible = true');
    }, 'rating_count');

    // Check if user is enrolled
    if (subjectUserId) {
      qb.addSelect((subQb) => {
        return subQb
          .select('COUNT(*)', 'cnt')
          .from(CourseEnrollment, 'ce')
          .where('ce.course_id = c.id')
          .andWhere('ce.user_id = :userId', { userId: subjectUserId });
      }, 'is_enrolled');
    }

    const sortBy = query.sort_by || 'created_at';
    const sortDir = query.sort_dir === 'asc' ? 'asc' : 'desc';

    if (sortBy === 'title') {
      qb.orderBy('c.title', sortDir.toUpperCase() as any);
    } else if (sortBy === 'created_at') {
      qb.orderBy('c.created_at', sortDir.toUpperCase() as any);
    } else if (sortBy === 'learners_count') {
      qb.orderBy('learners_count', sortDir.toUpperCase() as any);
      qb.addOrderBy('c.created_at', 'DESC');
    } else {
      qb.orderBy('c.created_at', 'DESC');
    }

    qb.skip((page - 1) * pageSize).take(pageSize);

    const total = await qb.getCount();
    const { raw } = await qb.getRawAndEntities();

    let completedSet = new Set<number>();
    if (subjectUserId) {
      const enrollmentRepo = AppDataSource.getRepository(CourseEnrollment);
      const enrollments = await enrollmentRepo.find({ where: { user_id: subjectUserId } as any });
      completedSet = new Set<number>(
        (enrollments as any[])
          .filter((e) => String((e as any).status) === 'completed')
          .map((e) => Number((e as any).course_id))
      );
    }

    const items = raw.map((r: any) => {
      const prerequisiteIds = parsePrerequisiteCourseIds(r.c_prerequisites ?? r.prerequisites);
      const canEnrollByPrerequisite = prerequisiteIds.every((id) => completedSet.has(id));
      const row = {
        id: r.c_id ?? r.id,
        title: r.c_title ?? r.title,
        slug: r.c_slug ?? r.slug,
        short_description: r.c_short_description ?? r.short_description,
        thumbnail_url: r.c_thumbnail_url ?? r.thumbnail_url,
        level: r.c_level ?? r.level,
        language: r.c_language ?? r.language,
        price: r.c_price ?? r.price,
        published_at: r.c_published_at ?? r.published_at,
        learners_count: r.learners_count,
        modules_count: r.modules_count,
        lessons_count: r.lessons_count,
        total_duration_minutes: r.total_duration_minutes,
        is_enrolled: r.is_enrolled,
        can_enroll: subjectUserId ? canEnrollByPrerequisite : true,
        instructors: r.instructors,
        avg_rating: r.rating ? Number(r.rating) : null,
        rating: r.rating ? Number(r.rating) : null,
        rating_count: Number(r.rating_count ?? 0),
      };
      return mapToPublishedCourseListItem(row);
    });

    return {
      items,
      page,
      page_size: pageSize,
      total,
    };
  }

  async getPublishedCourseBySlug(subjectUserId: number | undefined, slug: string): Promise<CourseDetail> {
    const courseRepo = AppDataSource.getRepository(Course);
    const now = new Date();

    const qb = courseRepo.createQueryBuilder('c');
    qb.where('c.slug = :slug', { slug });
    qb.andWhere(
      `(c.status = :published OR (c.status = :draft AND c.publish_scheduled_at IS NOT NULL AND c.publish_scheduled_at <= :now))`,
      { published: 'published', draft: 'draft', now }
    );
    qb.andWhere('c.deleted_at IS NULL');

    // Add learners count
    qb.addSelect((subQb) => {
      return subQb
        .select('COUNT(*)', 'cnt')
        .from(CourseEnrollment, 'ce')
        .where('ce.course_id = c.id');
    }, 'learners_count');

    // Add modules count
    qb.addSelect((subQb) => {
      return subQb
        .select('COUNT(*)', 'cnt')
        .from(Module, 'm')
        .where('m.course_id = c.id');
    }, 'modules_count');

    // Add lessons count
    qb.addSelect((subQb) => {
      return subQb
        .select('COUNT(*)', 'cnt')
        .from(Lesson, 'l')
        .innerJoin(Module, 'm', 'm.id = l.module_id')
        .where('m.course_id = c.id');
    }, 'lessons_count');

    // Add total duration
    qb.addSelect((subQb) => {
      return subQb
        .select('SUM(l.duration_minutes)', 'sum')
        .from(Lesson, 'l')
        .innerJoin(Module, 'm', 'm.id = l.module_id')
        .where('m.course_id = c.id');
    }, 'total_duration_minutes');

    // Add instructors info
    qb.addSelect((subQb) => {
      return subQb
        .select(`
          JSON_ARRAYAGG(
            JSON_OBJECT(
              'id', u.id,
              'full_name', u.full_name,
              'avatar_url', u.avatar_url,
              'is_primary', ci.is_primary
            )
          )
        `)
        .from(CourseInstructor, 'ci')
        .innerJoin(User, 'u', 'u.id = ci.instructor_id')
        .where('ci.course_id = c.id');
    }, 'instructors');

    // Add avg rating and rating count
    qb.addSelect((subQb) => {
      return subQb
        .select('AVG(cr.rating)', 'rating')
        .from(CourseReview, 'cr')
        .where('cr.course_id = c.id')
        .andWhere('cr.is_visible = true');
    }, 'rating');

    qb.addSelect((subQb) => {
      return subQb
        .select('COUNT(*)', 'cnt')
        .from(CourseReview, 'cr')
        .where('cr.course_id = c.id')
        .andWhere('cr.is_visible = true');
    }, 'rating_count');

    // Check if user is enrolled
    if (subjectUserId) {
      qb.addSelect((subQb) => {
        return subQb
          .select(`
            JSON_OBJECT(
              'status', ce.status,
              'enrolled_at', ce.enrolled_at,
              'completed_at', ce.completed_at,
              'progress_percent', ce.progress_percent
            )
          `)
          .from(CourseEnrollment, 'ce')
          .where('ce.course_id = c.id')
          .andWhere('ce.user_id = :userId', { userId: subjectUserId });
      }, 'enrollment');
    }

    const raw = await qb.getRawOne();
    if (!raw) throw new Error('Không tìm thấy khóa học.');

    const course: CourseDetail = {
      id: Number(raw.c_id ?? raw.id),
      title: String(raw.c_title ?? raw.title),
      slug: String(raw.c_slug ?? raw.slug),
      short_description: raw.c_short_description ?? raw.short_description ?? null,
      full_description: raw.c_full_description ?? raw.full_description ?? null,
      thumbnail_url: (raw.c_thumbnail_url ?? raw.thumbnail_url) ? getSignedDeliveryUrl(raw.c_thumbnail_url ?? raw.thumbnail_url) : null,
      level: String(raw.c_level ?? raw.level),
      language: String(raw.c_language ?? raw.language),
      learning_objectives: raw.c_learning_objectives ?? raw.learning_objectives ?? null,
      prerequisites: raw.c_prerequisites ?? raw.prerequisites ?? null,
      status: (raw.c_status ?? raw.status) as CourseStatus,
      published_at: (raw.c_published_at ?? raw.published_at) ? new Date(raw.c_published_at ?? raw.published_at).toISOString() : null,
      created_at: new Date(raw.c_created_at ?? raw.created_at).toISOString(),
      updated_at: new Date(raw.c_updated_at ?? raw.updated_at).toISOString(),
      learners_count: Number(raw.learners_count ?? 0),
      modules_count: Number(raw.modules_count ?? 0),
      lessons_count: Number(raw.lessons_count ?? 0),
      price: raw.c_price != null ? Number(raw.c_price) : raw.price != null ? Number(raw.price) : null,
      total_duration_minutes: raw.total_duration_minutes ? Number(raw.total_duration_minutes) : null,
      rating: raw.rating ? Number(raw.rating) : null,
      rating_count: Number(raw.rating_count ?? 0),
      is_enrolled: !!raw.enrollment,
      enrollment: safeJsonParse<any | null>(raw.enrollment, null),
      instructors: safeJsonParse<any[]>(raw.instructors, []),
    };

    // Load modules and lessons for preview
    const moduleRepo = AppDataSource.getRepository(Module);
    const lessonRepo = AppDataSource.getRepository(Lesson);

    const modules = await moduleRepo.find({
      where: { course_id: course.id } as any,
      order: { order_index: 'ASC', id: 'ASC' } as any,
    });

    const moduleIds = (modules as any[]).map((m) => m.id);
    const lessons = moduleIds.length
      ? await lessonRepo
          .createQueryBuilder('l')
          .where('l.module_id IN (:...moduleIds)', { moduleIds })
          .andWhere('l.is_published = :isPublished', { isPublished: true })
          .orderBy('l.order_index', 'ASC')
          .addOrderBy('l.id', 'ASC')
          .getMany()
      : [];

    const lessonIds = (lessons as any[]).map((l) => Number(l.id));
    const attachFlags = await this.loadLessonAttachmentFlags(lessonIds);
    // Load resource review statuses to filter out lessons with pending/rejected resources
    const resourceStatuses = await this.loadLessonResourceStatuses(lessonIds);

    const lessonByModule = new Map<number, CourseLessonItem[]>();
    for (const l of lessons as any[]) {
      const lid = Number(l.id);
      const resStatus = resourceStatuses.get(lid);
      const hasUnapproved = resStatus && (resStatus.hasPending || resStatus.hasRejected);

      // Skip lessons that have pending or rejected resources for learners
      if (hasUnapproved) continue;

      const arr = lessonByModule.get(l.module_id) || [];
      arr.push({
        id: l.id,
        module_id: l.module_id,
        title: l.title,
        description: l.description ?? null,
        lesson_type: (l.lesson_type || 'text') as LessonType,
        order_index: l.order_index,
        open_at: (l as any).open_at ? new Date((l as any).open_at).toISOString() : null,
        is_free_preview: l.is_free_preview,
        duration_minutes: l.duration_minutes,
        has_quiz: attachFlags.hasQuiz.has(lid),
        has_assignment: attachFlags.hasAssignment.has(lid),
      });
      lessonByModule.set(l.module_id, arr);
    }

    course.modules = (modules as any[]).map((m) => ({
      id: m.id,
      course_id: m.course_id,
      title: m.title,
      description: m.description ?? null,
      order_index: m.order_index,
      lessons: lessonByModule.get(m.id) || [],
    }));

    return course;
  }

  async getPublishedCoursePrerequisiteGraphBySlug(
    subjectUserId: number | undefined,
    slug: string
  ): Promise<CoursePrerequisiteGraph> {
    const courseRepo = AppDataSource.getRepository(Course);
    const now = new Date();
    const root = await courseRepo
      .createQueryBuilder('c')
      .where('c.slug = :slug', { slug })
      .andWhere('c.deleted_at IS NULL')
      .andWhere(
        `(c.status = :published OR (c.status = :draft AND c.publish_scheduled_at IS NOT NULL AND c.publish_scheduled_at <= :now))`,
        { published: 'published', draft: 'draft', now }
      )
      .getOne();
    if (!root) throw new Error('Không tìm thấy khóa học.');
    return this.buildPrerequisiteGraph(root as any, subjectUserId, 'published');
  }

  async listInstructorsCatalog(): Promise<InstructorCatalogResult> {
    const now = new Date();

    // Get all users who are instructors (have teacher/course_manager/admin role)
    // and are linked to at least one published course
    const qb = AppDataSource.getRepository(User)
      .createQueryBuilder('u')
      .innerJoin(CourseInstructor, 'ci', 'ci.instructor_id = u.id')
      .innerJoin(Course, 'c', 'c.id = ci.course_id')
      .where(
        `(c.status = :published OR (c.status = :draft AND c.publish_scheduled_at IS NOT NULL AND c.publish_scheduled_at <= :now))`,
        { published: 'published', draft: 'draft', now }
      )
      .andWhere('c.deleted_at IS NULL')
      .groupBy('u.id');

    // Add course count (published courses only)
    qb.addSelect('COUNT(DISTINCT c.id)', 'course_count');

    // Add total learners across all published courses
    qb.addSelect((subQb) => {
      return subQb
        .select('COUNT(DISTINCT ce.user_id)', 'total_learners')
        .from(CourseEnrollment, 'ce')
        .innerJoin(Course, 'cc', 'cc.id = ce.course_id')
        .where('cc.created_by = u.id')
        .andWhere(
          `(cc.status = :published OR (cc.status = :draft AND cc.publish_scheduled_at IS NOT NULL AND cc.publish_scheduled_at <= :now))`,
          { published: 'published', draft: 'draft', now }
        )
        .andWhere('cc.deleted_at IS NULL');
    }, 'total_learners');

    const result = await qb.getRawAndEntities();
    const raw = result.raw;

    const MIN_COURSES_FOR_TOP_RATED = 2;

    const items: InstructorCatalogItem[] = raw.map((r: any) => ({
      id: r.u_id,
      full_name: r.u_full_name,
      avatar_url: r.u_avatar_url,
      title: r.u_bio ? r.u_full_name.split(' ').slice(-1)[0] + ' Expert' : null,
      bio: r.u_bio,
      course_count: Number(r.course_count ?? 0),
      total_learners: Number(r.total_learners ?? 0),
      top_rated: Number(r.course_count ?? 0) >= MIN_COURSES_FOR_TOP_RATED,
    }));

    return {
      items,
      total: items.length,
    };
  }

  async getInstructorById(instructorId: number): Promise<InstructorDetailItem | null> {
    const now = new Date();

    // Get instructor info
    const instructor = await AppDataSource.getRepository(User)
      .createQueryBuilder('u')
      .where('u.id = :instructorId', { instructorId })
      .getOne();

    if (!instructor) return null;

    // Get instructor's published courses with count
    const coursesQb = AppDataSource.getRepository(Course)
      .createQueryBuilder('c')
      .innerJoin(CourseInstructor, 'ci', 'ci.course_id = c.id AND ci.instructor_id = :instructorId', { instructorId })
      .where('c.deleted_at IS NULL')
      .andWhere(
        `(c.status = :published OR (c.status = :draft AND c.publish_scheduled_at IS NOT NULL AND c.publish_scheduled_at <= :now))`,
        { published: 'published', draft: 'draft', now }
      );

    const courses = await coursesQb.getMany();
    const courseCount = courses.length;

    // Get total learners
    const learnerCount = await AppDataSource.getRepository(CourseEnrollment)
      .createQueryBuilder('ce')
      .innerJoin(Course, 'c', 'c.id = ce.course_id')
      .innerJoin(CourseInstructor, 'ci', 'ci.course_id = c.id AND ci.instructor_id = :instructorId', { instructorId })
      .where(
        `(c.status = :published OR (c.status = :draft AND c.publish_scheduled_at IS NOT NULL AND c.publish_scheduled_at <= :now))`,
        { published: 'published', draft: 'draft', now }
      )
      .andWhere('c.deleted_at IS NULL')
      .select('COUNT(DISTINCT ce.user_id)', 'total')
      .getRawOne();

    // Get average rating from course reviews
    const avgRatingResult = await AppDataSource.getRepository(CourseReview)
      .createQueryBuilder('cr')
      .innerJoin(Course, 'c', 'c.id = cr.course_id')
      .innerJoin(CourseInstructor, 'ci', 'ci.course_id = c.id AND ci.instructor_id = :instructorId', { instructorId })
      .where(
        `(c.status = :published OR (c.status = :draft AND c.publish_scheduled_at IS NOT NULL AND c.publish_scheduled_at <= :now))`,
        { published: 'published', draft: 'draft', now }
      )
      .andWhere('c.deleted_at IS NULL')
      .select('AVG(cr.rating)', 'avg_rating')
      .getRawOne();

    const avgRating = avgRatingResult?.avg_rating ? parseFloat(avgRatingResult.avg_rating) : 0;

    // Build credentials based on instructor roles
    const credentials: { icon: string; title: string; sub: string }[] = [];

    // Check roles
    const roles = await AppDataSource.getRepository(UserRole)
      .createQueryBuilder('ur')
      .innerJoin(Role, 'r', 'r.id = ur.role_id')
      .where('ur.user_id = :instructorId', { instructorId })
      .getMany();

    const roleNames = roles.map((r: any) => r.role?.name || 'Instructor');
    if (roleNames.includes('admin') || roleNames.includes('course_manager')) {
      credentials.push({ icon: 'workspace_premium', title: 'Course Manager', sub: 'MindBridge Platform' });
    }
    if (courseCount >= 2) {
      credentials.push({ icon: 'school', title: 'Expert Instructor', sub: `${courseCount} Courses` });
    }
    if (Number(learnerCount?.total || 0) >= 100) {
      credentials.push({ icon: 'groups', title: 'Community Leader', sub: `${Number(learnerCount?.total || 0).toLocaleString()} Students` });
    }

    // Get courses with category info
    // Get average rating per course
    const courseIds = courses.map((c: any) => c.id);
    const courseRatings: Record<number, number> = {};
    const courseReviewCounts: Record<number, number> = {};

    if (courseIds.length > 0) {
      const ratingsResult = await AppDataSource.getRepository(CourseReview)
        .createQueryBuilder('cr')
        .where('cr.course_id IN (:...courseIds)', { courseIds })
        .select('cr.course_id', 'course_id')
        .addSelect('AVG(cr.rating)', 'avg_rating')
        .addSelect('COUNT(*)', 'review_count')
        .groupBy('cr.course_id')
        .getRawMany();

      ratingsResult.forEach((r: any) => {
        courseRatings[r.course_id] = parseFloat(r.avg_rating) || 0;
        courseReviewCounts[r.course_id] = parseInt(r.review_count) || 0;
      });
    }

    const courseItems = courses.map((c: any) => ({
      slug: c.slug || String(c.id),
      title: c.title,
      category: c.category || 'General',
      description: c.short_description || c.description || '',
      price: c.price ? `${Number(c.price).toLocaleString('vi-VN')} ₫` : 'Miễn phí',
      image: c.thumbnail_url || null,
      rating: courseRatings[c.id] || 0,
      reviewCount: courseReviewCounts[c.id] || 0,
    }));

    // Get a sample testimony (random course review with rating >= 4)
    const testimonyResult = await AppDataSource.getRepository(CourseReview)
      .createQueryBuilder('cr')
      .innerJoin(Course, 'c', 'c.id = cr.course_id')
      .innerJoin(CourseInstructor, 'ci', 'ci.course_id = c.id AND ci.instructor_id = :instructorId', { instructorId })
      .innerJoin(User, 'u', 'u.id = cr.user_id')
      .where(
        `(c.status = :published OR (c.status = :draft AND c.publish_scheduled_at IS NOT NULL AND c.publish_scheduled_at <= :now))`,
        { published: 'published', draft: 'draft', now }
      )
      .andWhere('c.deleted_at IS NULL')
      .andWhere('cr.rating >= :minRating', { minRating: 4 })
      .orderBy('RAND()')
      .limit(1)
      .getRawAndEntities();

    let testimony: { quote: string; author: string; avatar: string | null } | null = null;
    if (testimonyResult.raw.length > 0) {
      const t = testimonyResult.raw[0];
      testimony = {
        quote: t.cr_comment || `I loved learning from ${instructor.full_name}! Highly recommend their courses.`,
        author: t.u_full_name || 'Anonymous Student',
        avatar: t.u_avatar_url || null,
      };
    }

    // Parse bio into paragraphs
    const bioText = instructor.bio || '';
    const bioParagraphs = bioText.length > 0
      ? bioText.split(/\n+/).filter(p => p.trim()).slice(0, 3)
      : [`${instructor.full_name} is a dedicated instructor on MindBridge, sharing their expertise through high-quality courses.`];

    return {
      id: instructor.id,
      full_name: instructor.full_name,
      avatar_url: instructor.avatar_url,
      bio: bioText,
      stats: {
        students: Number(learnerCount?.total || 0),
        courses: courseCount,
        rating: Math.round(avgRating * 10) / 10,
      },
      credentials,
      courses: courseItems,
      testimony,
    };
  }

  // Enrollment methods
  async enrollCourse(subjectUserId: number, courseId: number): Promise<EnrollmentResult> {
    const courseRepo = AppDataSource.getRepository(Course);
    const enrollmentRepo = AppDataSource.getRepository(CourseEnrollment);
    const paymentOrderRepo = AppDataSource.getRepository(PaymentOrder);

    // Check if course exists and is effectively published (including scheduled publish time).
    const now = new Date();
    const course = await courseRepo
      .createQueryBuilder('c')
      .where('c.id = :courseId', { courseId })
      .andWhere('c.deleted_at IS NULL')
      .andWhere(
        `(c.status = :published OR (c.status = :draft AND c.publish_scheduled_at IS NOT NULL AND c.publish_scheduled_at <= :now))`,
        { published: 'published', draft: 'draft', now }
      )
      .getOne();
    
    if (!course) {
      throw new Error('Khóa học không tồn tại hoặc chưa được xuất bản.');
    }

    const price = Number((course as any).price ?? 0);
    if (Number.isFinite(price) && price > 0) {
      const paidOrder = await paymentOrderRepo.findOne({
        where: {
          user_id: subjectUserId,
          course_id: courseId,
          status: 'paid' as any,
        } as any,
        order: { id: 'DESC' } as any,
      });
      if (!paidOrder) {
        throw new Error('Khóa học trả phí yêu cầu thanh toán thành công trước khi đăng ký.');
      }
    }

    // Check prerequisite courses: learner must complete all prerequisite courses first.
    const prerequisiteIds = parsePrerequisiteCourseIds((course as any).prerequisites);
    if (prerequisiteIds.length) {
      const prerequisiteEnrollments = await enrollmentRepo.find({
        where: { user_id: subjectUserId } as any,
      });
      const completedSet = new Set<number>(
        (prerequisiteEnrollments as any[])
          .filter((e) => String((e as any).status) === 'completed')
          .map((e) => Number((e as any).course_id))
      );
      const missingIds = prerequisiteIds.filter((id) => !completedSet.has(id));
      if (missingIds.length) {
        const prerequisiteCourses = await courseRepo.findByIds(missingIds as any);
        const names = (prerequisiteCourses as any[]).map((c) => String(c.title)).filter(Boolean);
        const missingText = names.length ? names.join(', ') : missingIds.map(String).join(', ');
        throw new Error(`Bạn cần hoàn tất khóa học tiên quyết trước khi đăng ký: ${missingText}.`);
      }
    }

    // Check if already enrolled
    const existingEnrollment = await enrollmentRepo.findOne({
      where: { user_id: subjectUserId, course_id: courseId } as any,
    });

    if (existingEnrollment) {
      throw new Error('Bạn đã đăng ký khóa học này rồi.');
    }

    // Create enrollment
    const enrollment = enrollmentRepo.create({
      user_id: subjectUserId,
      course_id: courseId,
      status: 'active',
      progress_percent: 0,
      enrolled_at: new Date(),
      last_accessed_at: new Date(),
    } as any);

    const saved = await enrollmentRepo.save(enrollment as any);

    return {
      id: (saved as any).id,
      course_id: (saved as any).course_id,
      user_id: (saved as any).user_id,
      status: (saved as any).status,
      enrolled_at: new Date((saved as any).enrolled_at).toISOString(),
      progress_percent: Number((saved as any).progress_percent),
    };
  }

  async listMyEnrollments(subjectUserId: number, query: MyEnrollmentsQuery): Promise<MyEnrollmentsResult> {
    const enrollmentRepo = AppDataSource.getRepository(CourseEnrollment);

    const page = Number(query.page || 1);
    const pageSize = Math.min(50, Math.max(1, Number(query.page_size || 12)));
    const status = query.status;
    const q = query.q ? String(query.q).trim() : '';

    const qb = enrollmentRepo.createQueryBuilder('ce');
    qb.where('ce.user_id = :userId', { userId: subjectUserId });
    
    if (status) {
      qb.andWhere('ce.status = :status', { status });
    }

    qb.innerJoinAndSelect('ce.course', 'c');
    if (q) {
      qb.andWhere('(c.title LIKE :q OR c.slug LIKE :q)', { q: `%${q}%` });
    }
    qb.select([
      'ce.id',
      'ce.user_id',
      'ce.course_id',
      'ce.status',
      'ce.enrolled_at',
      'ce.last_accessed_at',
      'ce.completed_at',
      'ce.progress_percent',
      'c.title',
      'c.slug',
      'c.thumbnail_url',
      'c.level',
    ]);
    qb.addSelect((subQb) => {
      return subQb
        .select('COUNT(*)')
        .from(CourseEnrollment, 'ce2')
        .where('ce2.course_id = c.id');
    }, 'learners_count');
    qb.addSelect((subQb) => {
      return subQb
        .select('COUNT(*)')
        .from(Module, 'm')
        .where('m.course_id = c.id');
    }, 'modules_count');
    qb.addSelect((subQb) => {
      return subQb
        .select('COUNT(*)')
        .from(Lesson, 'l')
        .innerJoin(Module, 'm', 'm.id = l.module_id')
        .where('m.course_id = c.id');
    }, 'lessons_count');

    qb.orderBy('ce.last_accessed_at', 'DESC')
      .addOrderBy('ce.enrolled_at', 'DESC');

    qb.skip((page - 1) * pageSize).take(pageSize);

    const [entities, total] = await qb.getManyAndCount();
    const rawRows = await qb.getRawMany();
    const countByEnrollmentId = new Map<number, {
      learners_count: number;
      modules_count: number;
      lessons_count: number;
    }>();
    for (const row of rawRows as any[]) {
      const enrollmentId = Number(row.ce_id);
      countByEnrollmentId.set(enrollmentId, {
        learners_count: Number(row.learners_count ?? 0),
        modules_count: Number(row.modules_count ?? 0),
        lessons_count: Number(row.lessons_count ?? 0),
      });
    }

    const items = (entities as any[]).map((e) => {
      const counts = countByEnrollmentId.get(Number(e.id));
      return {
        id: e.id,
        course_id: e.course_id,
        course_title: e.course?.title,
        course_slug: e.course?.slug,
        course_thumbnail: e.course?.thumbnail_url,
        course_level: e.course?.level,
        enrolled_at: e.enrolled_at.toISOString(),
        last_accessed_at: e.last_accessed_at?.toISOString() || null,
        status: e.status,
        progress_percent: Number(e.progress_percent),
        completed_at: e.completed_at?.toISOString() || null,
        learners_count: counts?.learners_count ?? 0,
        modules_count: counts?.modules_count ?? 0,
        lessons_count: counts?.lessons_count ?? 0,
      };
    });

    return {
      items,
      page,
      page_size: pageSize,
      total,
    };
  }

  async getMyLearningCourse(subjectUserId: number, courseId: number): Promise<CourseDetail> {
    const enrollmentRepo = AppDataSource.getRepository(CourseEnrollment);

    // Only active/completed enrollments are allowed to access learning flow.
    const enrollment = await enrollmentRepo.findOne({
      where: {
        user_id: subjectUserId,
        course_id: courseId,
        status: In(['active', 'completed']),
      } as any,
      relations: ['course'],
    });

    if (!enrollment) {
      throw new Error('Bạn chưa có ghi danh hợp lệ cho khóa học này (đã dừng hoặc hết hạn).');
    }

    const course = (enrollment as any).course;
    if (!course || (course as any).deleted_at) {
      throw new Error('Không tìm thấy khóa học.');
    }

    // Get course detail with full content (all lessons are accessible to enrolled users)
    const moduleRepo = AppDataSource.getRepository(Module);
    const lessonRepo = AppDataSource.getRepository(Lesson);

    const modules = await moduleRepo.find({
      where: { course_id: courseId } as any,
      order: { order_index: 'ASC', id: 'ASC' } as any,
    });

    const moduleIds = (modules as any[]).map((m) => m.id);
    const lessons = moduleIds.length
      ? await lessonRepo
          .createQueryBuilder('l')
          .where('l.module_id IN (:...moduleIds)', { moduleIds })
          .orderBy('l.order_index', 'ASC')
          .addOrderBy('l.id', 'ASC')
          .getMany()
      : [];

    const lessonIds = (lessons as any[]).map((l) => Number(l.id));
    const attachFlagsLearning = await this.loadLessonAttachmentFlags(lessonIds);
    // Load resource review statuses to filter out lessons with pending/rejected resources for learners
    const resourceStatuses = await this.loadLessonResourceStatuses(lessonIds);

    const lessonByModule = new Map<number, CourseLessonItem[]>();
    for (const l of lessons as any[]) {
      const lid = Number(l.id);
      const resStatus = resourceStatuses.get(lid);
      const hasUnapproved = resStatus && (resStatus.hasPending || resStatus.hasRejected);

      // Skip lessons that have pending or rejected resources for learners
      if (hasUnapproved) continue;

      const arr = lessonByModule.get(l.module_id) || [];
      arr.push({
        id: l.id,
        module_id: l.module_id,
        title: l.title,
        description: l.description ?? null,
        lesson_type: (l.lesson_type || 'text') as LessonType,
        order_index: l.order_index,
        is_free_preview: l.is_free_preview,
        duration_minutes: l.duration_minutes,
        open_at: l.open_at ? new Date(l.open_at).toISOString() : null,
        has_quiz: attachFlagsLearning.hasQuiz.has(lid),
        has_assignment: attachFlagsLearning.hasAssignment.has(lid),
      });
      lessonByModule.set(l.module_id, arr);
    }

    // Get instructors
    const instructorRepo = AppDataSource.getRepository(CourseInstructor);
    const instructors = await instructorRepo
      .createQueryBuilder('ci')
      .innerJoinAndSelect('ci.instructor', 'u')
      .where('ci.course_id = :courseId', { courseId })
      .getMany();

    const courseDetail: CourseDetail = {
      id: course.id,
      title: course.title,
      slug: course.slug,
      short_description: course.short_description,
      full_description: course.full_description,
      thumbnail_url: course.thumbnail_url ? getSignedDeliveryUrl(course.thumbnail_url) : null,
      level: course.level,
      language: course.language,
      learning_objectives: course.learning_objectives,
      prerequisites: course.prerequisites,
      status: course.status,
      published_at: course.published_at?.toISOString() || null,
      created_at: course.created_at.toISOString(),
      updated_at: course.updated_at.toISOString(),
      learners_count: 0, // Will be calculated separately if needed
      modules_count: modules.length,
      lessons_count: lessons.length,
      total_duration_minutes: lessons.reduce((sum, l: any) => sum + (l.duration_minutes || 0), 0),
      is_enrolled: true,
      enrollment: {
        status: (enrollment as any).status,
        enrolled_at: (enrollment as any).enrolled_at.toISOString(),
        completed_at: (enrollment as any).completed_at?.toISOString() || null,
        progress_percent: Number((enrollment as any).progress_percent),
      },
      instructors: (instructors as any[]).map((ci) => ({
        id: ci.instructor.id,
        full_name: ci.instructor.full_name,
        avatar_url: ci.instructor.avatar_url,
        is_primary: ci.is_primary,
      })),
      modules: (modules as any[]).map((m) => ({
        id: m.id,
        course_id: m.course_id,
        title: m.title,
        description: m.description ?? null,
        open_at: m.open_at ? new Date(m.open_at).toISOString() : null,
        order_index: m.order_index,
        lessons: lessonByModule.get(m.id) || [],
      })),
    };

    return courseDetail;
  }

  private async loadOrderedLessonsForCourse(courseId: number): Promise<{ modules: any[]; lessons: Lesson[]; orderedLessons: Lesson[] }> {
    const moduleRepo = AppDataSource.getRepository(Module);
    const lessonRepo = AppDataSource.getRepository(Lesson);

    const modules = await moduleRepo.find({
      where: { course_id: courseId } as any,
      order: { order_index: 'ASC', id: 'ASC' } as any,
    });
    const moduleIds = (modules as any[]).map((m) => m.id);
    const lessons = moduleIds.length
      ? await lessonRepo
          .createQueryBuilder('l')
          .where('l.module_id IN (:...moduleIds)', { moduleIds })
          .orderBy('l.order_index', 'ASC')
          .addOrderBy('l.id', 'ASC')
          .getMany()
      : [];

    const moduleOrder = new Map<number, number>();
    for (let i = 0; i < modules.length; i++) moduleOrder.set((modules as any[])[i].id, i);

    const orderedLessons = [...(lessons as Lesson[])].sort((a: any, b: any) => {
      const ma = moduleOrder.get(a.module_id) ?? 0;
      const mb = moduleOrder.get(b.module_id) ?? 0;
      if (ma !== mb) return ma - mb;
      const oa = Number(a.order_index ?? 0);
      const ob = Number(b.order_index ?? 0);
      if (oa !== ob) return oa - ob;
      return Number(a.id) - Number(b.id);
    });

    return { modules, lessons: lessons as Lesson[], orderedLessons };
  }

  private async loadLessonAttachmentFlags(lessonIds: number[]): Promise<{
    hasQuiz: Set<number>;
    hasAssignment: Set<number>;
  }> {
    const hasQuiz = new Set<number>();
    const hasAssignment = new Set<number>();
    const ids = lessonIds.map((x) => Number(x)).filter((x) => Number.isFinite(x));
    if (!ids.length) return { hasQuiz, hasAssignment };
    const quizRepo = AppDataSource.getRepository(Quiz);
    const assignRepo = AppDataSource.getRepository(Assignment);
    const qRaw = await quizRepo
      .createQueryBuilder('q')
      .select('q.lesson_id', 'lesson_id')
      .where('q.lesson_id IN (:...ids)', { ids })
      .getRawMany();
    for (const r of qRaw as any[]) {
      const lid = Number(r.lesson_id);
      if (Number.isFinite(lid)) hasQuiz.add(lid);
    }
    const aRaw = await assignRepo
      .createQueryBuilder('a')
      .select('a.lesson_id', 'lesson_id')
      .where('a.lesson_id IN (:...ids)', { ids })
      .getRawMany();
    for (const r of aRaw as any[]) {
      const lid = Number(r.lesson_id);
      if (Number.isFinite(lid)) hasAssignment.add(lid);
    }
    return { hasQuiz, hasAssignment };
  }

  /**
   * Load resource review statuses for lessons.
   * Returns a map of lessonId -> { hasApproved, hasPending, hasRejected }
   * A lesson is considered "content approved" only if it has NO pending/rejected resources.
   */
  private async loadLessonResourceStatuses(lessonIds: number[]): Promise<Map<number, {
    hasApproved: boolean;
    hasPending: boolean;
    hasRejected: boolean;
  }>> {
    const result = new Map<number, { hasApproved: boolean; hasPending: boolean; hasRejected: boolean }>();
    const ids = lessonIds.map((x) => Number(x)).filter((x) => Number.isFinite(x));
    if (!ids.length) return result;

    // Initialize all lessons with empty status
    for (const id of ids) {
      result.set(id, { hasApproved: false, hasPending: false, hasRejected: false });
    }

    const resourceRepo = AppDataSource.getRepository(LessonResource);
    const raw = await resourceRepo
      .createQueryBuilder('r')
      .select('r.lesson_id', 'lesson_id')
      .addSelect('r.review_status', 'review_status')
      .addSelect('COUNT(*)', 'cnt')
      .where('r.lesson_id IN (:...ids)', { ids })
      .groupBy('r.lesson_id, r.review_status')
      .getRawMany();

    for (const row of raw as any[]) {
      const lid = Number(row.lesson_id);
      const status = String(row.review_status || 'pending');
      const cnt = Number(row.cnt) || 0;
      if (!cnt) continue;

      const entry = result.get(lid);
      if (!entry) continue;

      if (status === 'approved') entry.hasApproved = true;
      else if (status === 'pending') entry.hasPending = true;
      else if (status === 'rejected') entry.hasRejected = true;
    }

    return result;
  }

  private moduleLessonsInOrder(moduleId: number, orderedLessons: Lesson[]): Lesson[] {
    return orderedLessons.filter((l) => Number((l as any).module_id) === Number(moduleId));
  }

  /** Quizz & bài tập (theo lesson_type): chỉ mở khi mọi bài đứng trước trong cùng chương đã hoàn thành. */
  private assessmentPredecessorsInModuleComplete(
    lesson: any,
    inModule: Lesson[],
    completedSet: Set<number>
  ): boolean {
    const lt = String((lesson as any).lesson_type || '');
    if (lt !== 'assignment' && lt !== 'quiz') return true;
    const lessonId = Number((lesson as any).id);
    const sorted = [...inModule].sort((a, b) => {
      const oa = Number((a as any).order_index ?? 0);
      const ob = Number((b as any).order_index ?? 0);
      if (oa !== ob) return oa - ob;
      return Number((a as any).id) - Number((b as any).id);
    });
    const selfIdx = sorted.findIndex((x) => Number((x as any).id) === lessonId);
    if (selfIdx <= 0) return true;
    for (let i = 0; i < selfIdx; i++) {
      const x = sorted[i] as any;
      if (!completedSet.has(Number(x.id))) return false;
    }
    return true;
  }

  private lessonProgressionPrerequisiteMet(
    lesson: any,
    globalIndex: number,
    orderedLessons: Lesson[],
    modules: any[],
    completedSet: Set<number>
  ): boolean {
    const moduleId = Number(lesson.module_id);
    const moduleIdsOrdered = (modules as any[]).map((m) => Number(m.id));
    const mi = moduleIdsOrdered.indexOf(moduleId);
    if (mi < 0) return false;

    const inModule = this.moduleLessonsInOrder(moduleId, orderedLessons);
    if (!this.assessmentPredecessorsInModuleComplete(lesson, inModule, completedSet)) return false;

    if (globalIndex === 0) return true;
    return completedSet.has(Number((orderedLessons[globalIndex - 1] as any).id));
  }

  private async loadEffectiveCompletedLessonSet(subjectUserId: number, orderedLessons: Lesson[]): Promise<Set<number>> {
    const lessonIds = orderedLessons.map((l) => Number((l as any).id)).filter((x) => Number.isFinite(x) && x > 0);
    if (!lessonIds.length) return new Set<number>();

    const completionRepo = AppDataSource.getRepository(LessonCompletion);
    const completionRows = await completionRepo
      .createQueryBuilder('lc')
      .select(['lc.lesson_id'])
      .where('lc.user_id = :uid', { uid: subjectUserId })
      .andWhere('lc.lesson_id IN (:...lessonIds)', { lessonIds })
      .getRawMany();
    const set = new Set<number>(completionRows.map((r: any) => Number(r.lc_lesson_id ?? r.lesson_id)));

    // Backward-compatibility: với dữ liệu cũ, assignment đã nộp nhưng chưa ghi lesson_completion.
    const submittedAssignments = await AppDataSource.query(
      `
      SELECT DISTINCT a.lesson_id
      FROM submissions s
      INNER JOIN assignments a ON a.id = s.assignment_id
      WHERE s.user_id = ? AND s.status IN ('submitted', 'graded', 'returned') AND a.lesson_id IN (?)
      `,
      [subjectUserId, lessonIds]
    ).catch(async () => {
      // Fallback cho một số cấu hình driver không map IN (?) với mảng.
      return await AppDataSource.query(
        `
        SELECT DISTINCT a.lesson_id
        FROM submissions s
        INNER JOIN assignments a ON a.id = s.assignment_id
        WHERE s.user_id = ? AND s.status IN ('submitted', 'graded', 'returned') AND a.lesson_id IN (${lessonIds
          .map(() => '?')
          .join(',')})
        `,
        [subjectUserId, ...lessonIds]
      );
    });
    for (const r of submittedAssignments as any[]) {
      const lid = Number((r as any).lesson_id);
      if (Number.isFinite(lid) && lid > 0) set.add(lid);
    }

    // Backward-compatibility: quiz đã đạt nhưng chưa ghi lesson_completion.
    const passedQuizLessons = await AppDataSource.query(
      `
      SELECT DISTINCT q.lesson_id
      FROM quiz_attempts qa
      INNER JOIN quizzes q ON q.id = qa.quiz_id
      WHERE qa.user_id = ? AND qa.is_passed = 1 AND q.lesson_id IN (?)
      `,
      [subjectUserId, lessonIds]
    ).catch(async () => {
      return await AppDataSource.query(
        `
        SELECT DISTINCT q.lesson_id
        FROM quiz_attempts qa
        INNER JOIN quizzes q ON q.id = qa.quiz_id
        WHERE qa.user_id = ? AND qa.is_passed = 1 AND q.lesson_id IN (${lessonIds
          .map(() => '?')
          .join(',')})
        `,
        [subjectUserId, ...lessonIds]
      );
    });
    for (const r of passedQuizLessons as any[]) {
      const lid = Number((r as any).lesson_id);
      if (Number.isFinite(lid) && lid > 0) set.add(lid);
    }

    return set;
  }

  private async getTimeRulesForCourse(courseId: number): Promise<{ videoMinSeconds: number; videoMinPercent: number; textMinSeconds: number }> {
    const repo = AppDataSource.getRepository(CourseCompletionRequirement);
    const row = await repo.findOne({ where: { course_id: courseId } as any });
    const videoMinSeconds = Number((row as any)?.video_min_seconds ?? 60);
    const videoMinPercent = Number((row as any)?.video_min_percent ?? 0.7);
    const textMinSeconds = Number((row as any)?.text_min_seconds ?? 30);
    return {
      videoMinSeconds: Number.isFinite(videoMinSeconds) && videoMinSeconds > 0 ? videoMinSeconds : 60,
      videoMinPercent: Number.isFinite(videoMinPercent) && videoMinPercent >= 0 && videoMinPercent <= 1 ? videoMinPercent : 0.7,
      textMinSeconds: Number.isFinite(textMinSeconds) && textMinSeconds > 0 ? textMinSeconds : 30,
    };
  }

  private computeRequiredSecondsForLesson(lesson: Lesson, rules: { videoMinSeconds: number; videoMinPercent: number; textMinSeconds: number }): number {
    const t = String((lesson as any).lesson_type || 'text');
    if (t === 'video') {
      const dm = Number((lesson as any).duration_minutes);
      if (Number.isFinite(dm) && dm > 0) {
        const durSec = Math.round(dm * 60);
        return Math.max(rules.videoMinSeconds, Math.round(durSec * rules.videoMinPercent));
      }
      return rules.videoMinSeconds;
    }
    if (t === 'text') return rules.textMinSeconds;
    // quiz/assignment: treat as at least a minimal engagement time for now.
    return rules.textMinSeconds;
  }

  private async ensureEnrolledLearner(subjectUserId: number, courseId: number): Promise<CourseEnrollment> {
    const enrollmentRepo = AppDataSource.getRepository(CourseEnrollment);
    const enrollment = await enrollmentRepo.findOne({
      where: {
        user_id: subjectUserId,
        course_id: courseId,
        status: In(['active', 'completed']),
      } as any,
    });
    if (!enrollment) throw new Error('Bạn chưa có ghi danh hợp lệ cho khóa học này (đã dừng hoặc hết hạn).');
    return enrollment as any;
  }

  private async ensureCanAccessLesson(subjectUserId: number, courseId: number, lessonId: number): Promise<void> {
    const isManager = await isUserCourseManager(subjectUserId);
    if (isManager) {
      await this.ensureCourseOwnedOrAdmin(subjectUserId, courseId);
      return;
    }

    await this.ensureEnrolledLearner(subjectUserId, courseId);
    const { orderedLessons, modules } = await this.loadOrderedLessonsForCourse(courseId);
    const now = new Date();
    const moduleById = new Map<number, any>((modules as any[]).map((m) => [Number(m.id), m]));
    const idx = orderedLessons.findIndex((l) => Number((l as any).id) === Number(lessonId));
    if (idx < 0) throw new Error('Bài học không hợp lệ.');

    // Module open time gating (optional schedule)
    const targetLesson = orderedLessons[idx] as any;
    const targetModule = moduleById.get(Number(targetLesson?.module_id));
    const openAt = parseNullableDateTime(targetModule?.open_at);
    if (openAt && openAt.getTime() > now.getTime()) {
      throw new Error('Không thể truy cập bài học.');
    }

    const lessonOpenAt = parseNullableDateTime(targetLesson?.open_at);
    if (lessonOpenAt && lessonOpenAt.getTime() > now.getTime()) {
      throw new Error('Không thể truy cập bài học.');
    }

    const completedSet = await this.loadEffectiveCompletedLessonSet(subjectUserId, orderedLessons);

    const prereqOk = this.lessonProgressionPrerequisiteMet(
      targetLesson,
      idx,
      orderedLessons,
      modules,
      completedSet
    );
    if (!prereqOk) throw new Error('Không thể truy cập bài học.');
  }

  async getMyCourseProgress(subjectUserId: number, courseId: number): Promise<CourseProgressResult> {
    await this.ensureEnrolledLearner(subjectUserId, courseId);

    const { orderedLessons, modules } = await this.loadOrderedLessonsForCourse(courseId);
    const total = orderedLessons.length;
    const now = new Date();
    const moduleById = new Map<number, any>((modules as any[]).map((m) => [Number(m.id), m]));

    const completedSet = await this.loadEffectiveCompletedLessonSet(subjectUserId, orderedLessons);

    const unlocked: number[] = [];
    let nextLocked: number | null = null;
    for (let i = 0; i < orderedLessons.length; i++) {
      const lesson = orderedLessons[i] as any;
      const lessonId = Number(lesson.id);
      const module = moduleById.get(Number(lesson.module_id));
      const openAt = parseNullableDateTime(module?.open_at);
      const moduleOk = !openAt || openAt.getTime() <= now.getTime();
      const lessonOpenAt = parseNullableDateTime(lesson?.open_at);
      const lessonOk = !lessonOpenAt || lessonOpenAt.getTime() <= now.getTime();

      // Always keep first lesson reachable once schedule window is open.
      if (i === 0 && moduleOk && lessonOk) {
        unlocked.push(lessonId);
        continue;
      }

      const prereqOk = this.lessonProgressionPrerequisiteMet(lesson, i, orderedLessons, modules, completedSet);
      if (prereqOk && moduleOk && lessonOk) {
        unlocked.push(lessonId);
        continue;
      }

      nextLocked = lessonId;
      break;
    }

    const completedCount = completedSet.size;
    const rawPct = total ? (completedCount / total) * 100 : 0;
    const progress_percent = Math.max(0, Math.min(100, Math.round(rawPct * 100) / 100));

    // Best-effort sync enrollment progress_percent to computed value.
    const enrollmentRepo = AppDataSource.getRepository(CourseEnrollment);
    await enrollmentRepo.update({ user_id: subjectUserId, course_id: courseId } as any, { progress_percent } as any);

    return {
      course_id: courseId,
      total_lessons: total,
      completed_lessons: completedCount,
      progress_percent,
      completed_lesson_ids: Array.from(completedSet.values()),
      unlocked_lesson_ids: unlocked,
      next_locked_lesson_id: nextLocked,
    };
  }

  async addLessonProgressHeartbeat(
    subjectUserId: number,
    courseId: number,
    lessonId: number,
    deltaSeconds: number
  ): Promise<LessonHeartbeatResult> {
    await this.ensureEnrolledLearner(subjectUserId, courseId);

    const { orderedLessons, modules } = await this.loadOrderedLessonsForCourse(courseId);
    const target = orderedLessons.find((l) => Number((l as any).id) === Number(lessonId));
    if (!target) throw new Error('Bài học không hợp lệ.');

    const now = new Date();
    const moduleById = new Map<number, any>((modules as any[]).map((m) => [Number(m.id), m]));
    const targetModule = moduleById.get(Number((target as any).module_id));
    const openAt = parseNullableDateTime(targetModule?.open_at);
    if (openAt && openAt.getTime() > now.getTime()) {
      throw new Error('Không thể truy cập bài học.');
    }
    const lessonOpenAt = parseNullableDateTime((target as any)?.open_at);
    if (lessonOpenAt && lessonOpenAt.getTime() > now.getTime()) {
      throw new Error('Không thể truy cập bài học.');
    }

    // Clamp delta to reduce abuse.
    const delta = Math.max(1, Math.min(10, Math.floor(Number(deltaSeconds))));

    const progressRepo = AppDataSource.getRepository(LessonProgress);
    const existing = await progressRepo.findOne({
      where: { user_id: subjectUserId, course_id: courseId, lesson_id: lessonId } as any,
    });
    const entity = existing
      ? existing
      : progressRepo.create({ user_id: subjectUserId, course_id: courseId, lesson_id: lessonId, time_spent_seconds: 0 } as any);

    (entity as any).time_spent_seconds = Number((entity as any).time_spent_seconds || 0) + delta;
    const saved = await progressRepo.save(entity as any);

    const rules = await this.getTimeRulesForCourse(courseId);
    const required_seconds = this.computeRequiredSecondsForLesson(target, rules);
    const time_spent_seconds = Number((saved as any).time_spent_seconds || 0);
    const can_complete = time_spent_seconds >= required_seconds;

    const courseProgress = await this.getMyCourseProgress(subjectUserId, courseId);
    return {
      lesson_id: lessonId,
      time_spent_seconds,
      required_seconds,
      can_complete,
      progress_percent: courseProgress.progress_percent,
    };
  }

  async completeLesson(subjectUserId: number, courseId: number, lessonId: number): Promise<LessonCompleteResult> {
    const enrollment = await this.ensureEnrolledLearner(subjectUserId, courseId);

    const { orderedLessons, modules } = await this.loadOrderedLessonsForCourse(courseId);
    const idx = orderedLessons.findIndex((l) => Number((l as any).id) === Number(lessonId));
    if (idx < 0) throw new Error('Bài học không hợp lệ.');

    const now = new Date();
    const moduleById = new Map<number, any>((modules as any[]).map((m) => [Number(m.id), m]));
    const targetLesson = orderedLessons[idx] as any;
    const targetModule = moduleById.get(Number(targetLesson?.module_id));
    const openAt = parseNullableDateTime(targetModule?.open_at);
    if (openAt && openAt.getTime() > now.getTime()) {
      throw new Error('Không thể hoàn thành bài học.');
    }
    const lessonOpenAt = parseNullableDateTime(targetLesson?.open_at);
    if (lessonOpenAt && lessonOpenAt.getTime() > now.getTime()) {
      throw new Error('Không thể hoàn thành bài học.');
    }

    const completionRepo = AppDataSource.getRepository(LessonCompletion);
    const completedSetForPrereq = await this.loadEffectiveCompletedLessonSet(subjectUserId, orderedLessons);
    const prereqOk = this.lessonProgressionPrerequisiteMet(
      targetLesson,
      idx,
      orderedLessons,
      modules,
      completedSetForPrereq
    );
    if (!prereqOk) throw new Error('Không thể hoàn thành bài học.');

    const exists = await completionRepo.findOne({ where: { user_id: subjectUserId, lesson_id: lessonId } as any });
    if (exists) {
      const courseProgress = await this.getMyCourseProgress(subjectUserId, courseId);
      return { lesson_id: lessonId, completed: true, progress_percent: courseProgress.progress_percent };
    }

    const progressRepo = AppDataSource.getRepository(LessonProgress);
    const p = await progressRepo.findOne({ where: { user_id: subjectUserId, course_id: courseId, lesson_id: lessonId } as any });
    const timeSpent = Number((p as any)?.time_spent_seconds ?? 0);
    const rules = await this.getTimeRulesForCourse(courseId);
    const required = this.computeRequiredSecondsForLesson(orderedLessons[idx], rules);
    if (timeSpent < required) {
      throw new Error(`Chưa đủ thời gian học để hoàn thành bài (cần ${required}s).`);
    }

    await completionRepo.save(
      completionRepo.create({
        user_id: subjectUserId,
        lesson_id: lessonId,
        time_spent_seconds: timeSpent,
        completed_at: new Date(),
      } as any)
    );

    // Recompute and persist enrollment progress.
    const total = orderedLessons.length;
    const completedRows = total
      ? await completionRepo
          .createQueryBuilder('lc')
          .select(['lc.lesson_id'])
          .where('lc.user_id = :uid', { uid: subjectUserId })
          .andWhere('lc.lesson_id IN (:...lessonIds)', { lessonIds: orderedLessons.map((l) => (l as any).id) })
          .getRawMany()
      : [];
    const completedCount = completedRows.length;
    const rawPct = total ? (completedCount / total) * 100 : 0;
    const progress_percent = Math.max(0, Math.min(100, Math.round(rawPct * 100) / 100));

    const enrollmentRepo = AppDataSource.getRepository(CourseEnrollment);
    const patch: any = { progress_percent, last_accessed_at: new Date() };
    if (progress_percent >= 100 && (enrollment as any).status !== 'completed') {
      patch.status = 'completed';
      patch.completed_at = new Date();
    }
    await enrollmentRepo.update({ user_id: subjectUserId, course_id: courseId } as any, patch);

    return { lesson_id: lessonId, completed: true, progress_percent };
  }

  async getMyCourseCompletionRules(subjectUserId: number, courseId: number): Promise<CourseCompletionRules> {
    await ensureUserIsCourseManager(subjectUserId);
    await this.ensureCourseOwnedOrAdmin(subjectUserId, courseId);

    const repo = AppDataSource.getRepository(CourseCompletionRequirement);
    const row = await repo.findOne({ where: { course_id: courseId } as any });
    const rules = await this.getTimeRulesForCourse(courseId);

    // If row doesn't exist yet, return defaults (do not force-create).
    return {
      course_id: courseId,
      video_min_seconds: Number((row as any)?.video_min_seconds ?? rules.videoMinSeconds),
      video_min_percent: Number((row as any)?.video_min_percent ?? rules.videoMinPercent),
      text_min_seconds: Number((row as any)?.text_min_seconds ?? rules.textMinSeconds),
    };
  }

  async updateMyCourseCompletionRules(
    subjectUserId: number,
    courseId: number,
    request: UpdateCourseCompletionRulesRequest
  ): Promise<CourseCompletionRules> {
    await ensureUserIsCourseManager(subjectUserId);
    const ownCourse = await this.ensureOwnCourse(subjectUserId, courseId);
    this.ensureCourseEditableForTeacher(ownCourse);

    const repo = AppDataSource.getRepository(CourseCompletionRequirement);
    const existing = await repo.findOne({ where: { course_id: courseId } as any });
    const entity = existing ? existing : repo.create({ course_id: courseId } as any);

    if (request.video_min_seconds != null) (entity as any).video_min_seconds = Number(request.video_min_seconds);
    if (request.video_min_percent != null) (entity as any).video_min_percent = Number(request.video_min_percent);
    if (request.text_min_seconds != null) (entity as any).text_min_seconds = Number(request.text_min_seconds);

    const saved = await repo.save(entity as any);
    return {
      course_id: courseId,
      video_min_seconds: Number((saved as any).video_min_seconds ?? 60),
      video_min_percent: Number((saved as any).video_min_percent ?? 0.7),
      text_min_seconds: Number((saved as any).text_min_seconds ?? 30),
    };
  }

  async listMyCourseLearnerProgress(
    subjectUserId: number,
    courseId: number,
    query: { page?: number; page_size?: number; q?: string }
  ): Promise<CourseLearnerProgressResult> {
    await ensureUserIsCourseManager(subjectUserId);
    await this.ensureOwnCourse(subjectUserId, courseId);

    const { orderedLessons } = await this.loadOrderedLessonsForCourse(courseId);
    const totalLessons = orderedLessons.length;

    const page = Number(query.page || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.page_size || 20)));
    const q = query.q ? String(query.q).trim() : '';

    const enrollmentRepo = AppDataSource.getRepository(CourseEnrollment);
    const qb = enrollmentRepo.createQueryBuilder('ce');
    qb.innerJoin(User, 'u', 'u.id = ce.user_id');
    qb.where('ce.course_id = :courseId', { courseId });

    if (q) {
      qb.andWhere('(u.full_name LIKE :q OR u.email LIKE :q)', { q: `%${q}%` });
    }

    qb.select([
      'ce.user_id as user_id',
      'u.full_name as full_name',
      'u.email as email',
      'u.avatar_url as avatar_url',
      'ce.status as status',
      'ce.enrolled_at as enrolled_at',
      'ce.last_accessed_at as last_accessed_at',
      'ce.completed_at as completed_at',
      'ce.progress_percent as progress_percent',
    ]);

    qb.addSelect((subQb) => {
      return subQb
        .select('COUNT(*)')
        .from(LessonCompletion, 'lc')
        .innerJoin(Lesson, 'l', 'l.id = lc.lesson_id')
        .innerJoin(Module, 'm', 'm.id = l.module_id')
        .where('lc.user_id = ce.user_id')
        .andWhere('m.course_id = :courseId', { courseId });
    }, 'completed_lessons');

    qb.addSelect((subQb) => {
      return subQb
        .select('COALESCE(SUM(lp.time_spent_seconds), 0)')
        .from(LessonProgress, 'lp')
        .where('lp.user_id = ce.user_id')
        .andWhere('lp.course_id = :courseId', { courseId });
    }, 'time_spent_seconds');

    // Avoid window functions/subqueries inside window ORDER BY (MySQL parse errors).
    // We compute rank in application code:
    // - progress_percent desc
    // - completed_lessons desc
    // - time_spent_seconds asc
    // - last_accessed_at desc
    // - user_id asc (stable)
    const allRows = await qb.getRawMany();
    const total = allRows.length;

    const sorted = (allRows as any[]).sort((a, b) => {
      const ap = Number(a.progress_percent ?? 0);
      const bp = Number(b.progress_percent ?? 0);
      if (bp !== ap) return bp - ap;

      const ac = Number(a.completed_lessons ?? 0);
      const bc = Number(b.completed_lessons ?? 0);
      if (bc !== ac) return bc - ac;

      const at = Number(a.time_spent_seconds ?? 0);
      const bt = Number(b.time_spent_seconds ?? 0);
      if (at !== bt) return at - bt;

      const al = a.last_accessed_at ? new Date(a.last_accessed_at).getTime() : 0;
      const bl = b.last_accessed_at ? new Date(b.last_accessed_at).getTime() : 0;
      if (bl !== al) return bl - al;

      return Number(a.user_id ?? 0) - Number(b.user_id ?? 0);
    });

    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const pageRows = sorted.slice(start, end);

    return {
      course_id: courseId,
      total_lessons: totalLessons,
      items: pageRows.map((r, idx) => ({
        rank: start + idx + 1,
        user_id: Number(r.user_id),
        full_name: String(r.full_name || ''),
        email: String(r.email || ''),
        avatar_url: r.avatar_url ? getSignedDeliveryUrl(String(r.avatar_url)) : null,
        status: r.status as any,
        enrolled_at: r.enrolled_at ? new Date(r.enrolled_at).toISOString() : new Date().toISOString(),
        last_accessed_at: r.last_accessed_at ? new Date(r.last_accessed_at).toISOString() : null,
        completed_at: r.completed_at ? new Date(r.completed_at).toISOString() : null,
        progress_percent: Number(r.progress_percent ?? 0),
        completed_lessons: Number(r.completed_lessons ?? 0),
        time_spent_seconds: Number(r.time_spent_seconds ?? 0),
      })),
      page,
      page_size: pageSize,
      total,
    };
  }

  async getCourseLeaderboard(subjectUserId: number, courseId: number): Promise<CourseLeaderboardResult> {
    const isManager = await isUserCourseManager(subjectUserId);
    if (isManager) {
      await this.ensureOwnCourse(subjectUserId, courseId);
    } else {
      await this.ensureEnrolledLearner(subjectUserId, courseId);
    }

    const { orderedLessons } = await this.loadOrderedLessonsForCourse(courseId);
    const totalLessons = orderedLessons.length;

    // IMPORTANT: MySQL version in this project might not support window functions (ROW_NUMBER).
    // So we compute leaderboard by ordering in SQL + ranking in application code.
    const TOP_LIMIT = 100;
    const enrollmentRepo = AppDataSource.getRepository(CourseEnrollment);

    const completedSelect = (subQb: any) => {
      return subQb
        .select('COUNT(*)')
        .from(LessonCompletion, 'lc')
        .innerJoin(Lesson, 'l', 'l.id = lc.lesson_id')
        .innerJoin(Module, 'm', 'm.id = l.module_id')
        .where('lc.user_id = ce.user_id')
        .andWhere('m.course_id = :courseId', { courseId });
    };

    const timeSelect = (subQb: any) => {
      return subQb
        .select('COALESCE(SUM(lp.time_spent_seconds), 0)')
        .from(LessonProgress, 'lp')
        .where('lp.user_id = ce.user_id')
        .andWhere('lp.course_id = :courseId', { courseId });
    };

    const topRows = await enrollmentRepo
      .createQueryBuilder('ce')
      .innerJoin(User, 'u', 'u.id = ce.user_id')
      .where('ce.course_id = :courseId', { courseId })
      .select([
        'ce.user_id as user_id',
        'u.full_name as full_name',
        'u.avatar_url as avatar_url',
        'ce.progress_percent as progress_percent',
        'ce.last_accessed_at as last_accessed_at',
      ])
      .addSelect((subQb) => completedSelect(subQb), 'completed_lessons')
      .addSelect((subQb) => timeSelect(subQb), 'time_spent_seconds')
      .orderBy('ce.progress_percent', 'DESC')
      // Order by select aliases is supported in MySQL (unlike in window ORDER BY).
      .addOrderBy('completed_lessons', 'DESC')
      .addOrderBy('time_spent_seconds', 'ASC')
      .addOrderBy('ce.last_accessed_at', 'DESC')
      .addOrderBy('ce.user_id', 'ASC')
      .limit(TOP_LIMIT)
      .getRawMany();

    const myRow = await enrollmentRepo
      .createQueryBuilder('ce')
      .innerJoin(User, 'u', 'u.id = ce.user_id')
      .where('ce.course_id = :courseId', { courseId })
      .andWhere('ce.user_id = :uid', { uid: subjectUserId })
      .select([
        'ce.user_id as user_id',
        'u.full_name as full_name',
        'u.avatar_url as avatar_url',
        'ce.progress_percent as progress_percent',
        'ce.last_accessed_at as last_accessed_at',
      ])
      .addSelect((subQb) => completedSelect(subQb), 'completed_lessons')
      .addSelect((subQb) => timeSelect(subQb), 'time_spent_seconds')
      .getRawOne();

    type RowShape = {
      user_id: number;
      full_name: string;
      avatar_url: string | null;
      progress_percent: number;
      last_accessed_at: string | null;
      completed_lessons: number;
      time_spent_seconds: number;
    };

    const top: RowShape[] = (topRows as any[]).map((r) => ({
      user_id: Number(r.user_id ?? 0),
      full_name: String(r.full_name || ''),
      avatar_url: r.avatar_url ?? null,
      progress_percent: Number(r.progress_percent ?? 0),
      last_accessed_at: r.last_accessed_at ?? null,
      completed_lessons: Number(r.completed_lessons ?? 0),
      time_spent_seconds: Number(r.time_spent_seconds ?? 0),
    }));

    const my: RowShape | null = myRow
      ? {
          user_id: Number((myRow as any).user_id ?? 0),
          full_name: String((myRow as any).full_name || ''),
          avatar_url: (myRow as any).avatar_url ?? null,
          progress_percent: Number((myRow as any).progress_percent ?? 0),
          last_accessed_at: (myRow as any).last_accessed_at ?? null,
          completed_lessons: Number((myRow as any).completed_lessons ?? 0),
          time_spent_seconds: Number((myRow as any).time_spent_seconds ?? 0),
        }
      : null;

    const hasMeInTop = my ? top.some((x) => x.user_id === my.user_id) : false;

    // Compute exact rank for "me" if not in top, without window functions.
    let myRank: number | null = null;
    if (my) {
      if (hasMeInTop) {
        // Top is already ordered by the ranking rules, so index is rank.
        myRank = top.findIndex((x) => x.user_id === my.user_id) + 1;
      } else {
        const completedExpr = `(SELECT COUNT(*)
          FROM lesson_completions lc
          INNER JOIN lessons l ON l.id = lc.lesson_id
          INNER JOIN modules m ON m.id = l.module_id
          WHERE lc.user_id = ce.user_id AND m.course_id = :courseId)`;
        const timeExpr = `(SELECT COALESCE(SUM(lp.time_spent_seconds), 0)
          FROM lesson_progress lp
          WHERE lp.user_id = ce.user_id AND lp.course_id = :courseId)`;

        const higherCountQb = enrollmentRepo
          .createQueryBuilder('ce')
          .where('ce.course_id = :courseId', { courseId })
          .andWhere('ce.user_id <> :uid', { uid: subjectUserId })
          .andWhere(
            `(
              ce.progress_percent > :myProgress OR
              (ce.progress_percent = :myProgress AND ${completedExpr} > :myCompleted) OR
              (ce.progress_percent = :myProgress AND ${completedExpr} = :myCompleted AND ${timeExpr} < :myTime) OR
              (ce.progress_percent = :myProgress AND ${completedExpr} = :myCompleted AND ${timeExpr} = :myTime AND COALESCE(ce.last_accessed_at, '1970-01-01') > COALESCE(:myLast, '1970-01-01')) OR
              (ce.progress_percent = :myProgress AND ${completedExpr} = :myCompleted AND ${timeExpr} = :myTime AND COALESCE(ce.last_accessed_at, '1970-01-01') = COALESCE(:myLast, '1970-01-01') AND ce.user_id < :uid)
            )`,
            {
              myProgress: my.progress_percent,
              myCompleted: my.completed_lessons,
              myTime: my.time_spent_seconds,
              myLast: my.last_accessed_at,
              uid: subjectUserId,
              courseId,
            }
          );

        const higherCount = await higherCountQb.getCount();
        myRank = higherCount + 1;
      }
    }

    const itemsTop = top.map((r, idx) => ({
      rank: idx + 1,
      user_id: r.user_id,
      full_name: r.full_name,
      avatar_url: r.avatar_url ? getSignedDeliveryUrl(String(r.avatar_url)) : null,
      progress_percent: r.progress_percent,
      completed_lessons: r.completed_lessons,
      time_spent_seconds: r.time_spent_seconds,
      is_me: my ? r.user_id === my.user_id : false,
    }));

    const items =
      my && !hasMeInTop && myRank != null
        ? [
            ...itemsTop,
            {
              rank: myRank,
              user_id: my.user_id,
              full_name: my.full_name,
              avatar_url: my.avatar_url ? getSignedDeliveryUrl(String(my.avatar_url)) : null,
              progress_percent: my.progress_percent,
              completed_lessons: my.completed_lessons,
              time_spent_seconds: my.time_spent_seconds,
              is_me: true,
            },
          ].sort((a, b) => a.rank - b.rank)
        : itemsTop;

    return {
      course_id: courseId,
      total_lessons: totalLessons,
      items,
      top_limit: TOP_LIMIT,
      includes_me: Boolean(my && items.some((x) => x.user_id === my.user_id)),
    };
  }

  // Instructor methods (existing code)
  async createCourse(subjectUserId: number, request: CreateCourseRequest): Promise<{ id: number }> {
    await ensureUserIsCourseManager(subjectUserId);

    const courseRepo = AppDataSource.getRepository(Course);
    const instructorRepo = AppDataSource.getRepository(CourseInstructor);
    const now = new Date();

    const baseSlug = normalizeSlug(request.title);
    if (!baseSlug) throw new Error('Tiêu đề khóa học không hợp lệ.');

    // Ensure uniqueness with suffix if needed.
    let slug = baseSlug;
    let counter = 1;
    while (await courseRepo.findOne({ where: { slug } })) {
      counter += 1;
      slug = `${baseSlug}-${counter}`;
    }

    const prerequisiteIds = parsePrerequisiteCourseIds(request.prerequisites);
    await this.validatePrerequisiteIdsExist(prerequisiteIds);

    const scheduledAt = parseNullableDateTime((request as any)?.publish_scheduled_at);
    const shouldAutoPublish = scheduledAt ? scheduledAt.getTime() <= now.getTime() : false;
    const canDirectPublish = await isUserAdmin(subjectUserId);
    const nextStatus: CourseStatus = shouldAutoPublish
      ? (canDirectPublish ? 'published' : 'pending_review')
      : 'draft';

    const course = courseRepo.create({
      title: request.title,
      slug,
      short_description: request.short_description ?? null,
      full_description: request.full_description ?? null,
      category: request.category ?? null,
      thumbnail_url: request.thumbnail_url ?? null,
      learning_objectives: request.learning_objectives ?? null,
      prerequisites: prerequisiteIds.length ? prerequisiteIds.map(String) : null,
      price: request.price ?? null,
      has_certificate: Boolean(request.has_certificate),
      estimated_hours: request.estimated_hours ?? null,
      tags: request.tags ?? null,
      level: request.level ?? 'beginner',
      language: request.language ?? 'vi',
      status: nextStatus,
      published_at: nextStatus === 'published' ? scheduledAt : null,
      publish_scheduled_at: nextStatus === 'published' ? null : scheduledAt,
      created_by: subjectUserId,
    });

    const saved = await courseRepo.save(course);
    await instructorRepo.save(
      instructorRepo.create({
        course_id: saved.id,
        instructor_id: subjectUserId,
        is_primary: true,
      })
    );

    return { id: saved.id };
  }

  async listMyCourses(subjectUserId: number, query: CourseListQuery): Promise<CourseListResult> {
    await ensureUserCanAccessInstructorDashboard(subjectUserId);

    const courseRepo = AppDataSource.getRepository(Course);

    const page = Number(query.page || 1);
    const pageSize = Math.min(50, Math.max(1, Number(query.page_size || 12)));
    const status = query.status && query.status !== 'all' ? query.status : undefined;
    const q = query.q ? String(query.q).trim() : '';

    const qb = courseRepo.createQueryBuilder('c');
    qb.where('c.created_by = :uid', { uid: subjectUserId });
    qb.andWhere('c.deleted_at IS NULL');
    if (status) qb.andWhere('c.status = :status', { status });
    if (q) {
      qb.andWhere('(c.title LIKE :q OR c.slug LIKE :q)', { q: `%${q}%` });
    }

    qb.addSelect((subQb) => {
      return subQb
        .select('COUNT(*)', 'cnt')
        .from(CourseEnrollment, 'ce')
        .where('ce.course_id = c.id');
    }, 'learners_count');

    qb.addSelect((subQb) => {
      return subQb
        .select('COUNT(*)', 'cnt')
        .from(Module, 'm')
        .where('m.course_id = c.id');
    }, 'modules_count');

    qb.addSelect((subQb) => {
      return subQb
        .select('COUNT(*)', 'cnt')
        .from(Lesson, 'l')
        .innerJoin(Module, 'm', 'm.id = l.module_id')
        .where('m.course_id = c.id');
    }, 'lessons_count');

    const sortBy: CourseSortBy = query.sort_by || 'updated_at';
    const sortDir: SortDir = query.sort_dir === 'asc' ? 'asc' : 'desc';

    if (sortBy === 'title') {
      qb.orderBy('c.title', sortDir.toUpperCase() as any);
    } else if (sortBy === 'created_at') {
      qb.orderBy('c.created_at', sortDir.toUpperCase() as any);
    } else if (sortBy === 'updated_at') {
      qb.orderBy('c.updated_at', sortDir.toUpperCase() as any);
    } else if (sortBy === 'learners_count') {
      // Try to sort by the computed alias. If the underlying driver doesn't support alias ordering,
      // MySQL will still accept it in most cases.
      qb.orderBy('learners_count', sortDir.toUpperCase() as any);
      qb.addOrderBy('c.updated_at', 'DESC');
    } else {
      qb.orderBy('c.updated_at', 'DESC');
    }

    qb.skip((page - 1) * pageSize).take(pageSize);

    const total = await qb.getCount();
    const { raw } = await qb.getRawAndEntities();

    const items = await Promise.all(raw.map(async (r: any) => {
      // raw contains both c_* columns and extra selects. TypeORM names may vary; map defensively.
      const row = {
        id: r.c_id ?? r.id,
        title: r.c_title ?? r.title,
        slug: r.c_slug ?? r.slug,
        short_description: r.c_short_description ?? r.short_description,
        category: r.c_category ?? r.category,
        thumbnail_url: r.c_thumbnail_url ?? r.thumbnail_url,
        level: r.c_level ?? r.level,
        language: r.c_language ?? r.language,
        price: r.c_price ?? r.price,
        has_certificate: r.c_has_certificate ?? r.has_certificate,
        estimated_hours: r.c_estimated_hours ?? r.estimated_hours,
        tags: r.c_tags ?? r.tags,
        status: r.c_status ?? r.status,
        published_at: r.c_published_at ?? r.published_at,
        publish_scheduled_at: r.c_publish_scheduled_at ?? r.publish_scheduled_at,
        created_at: r.c_created_at ?? r.created_at,
        updated_at: r.c_updated_at ?? r.updated_at,
        learners_count: r.learners_count,
        modules_count: r.modules_count,
        lessons_count: r.lessons_count,
      };
      const item = mapCourseRowToItem(row);
      try {
        await this.ensureCourseMeetsSubmissionGate(Number(item.id));
        item.quality_gate = { ready: true, issues: [] };
      } catch (e: any) {
        item.quality_gate = {
          ready: false,
          issues: [e?.message ? String(e.message) : 'Khóa học chưa đạt quality gate.'],
        };
      }
      return item;
    }));

    return {
      items,
      page,
      page_size: pageSize,
      total,
    };
  }

  async getMyCourseDashboardStats(subjectUserId: number): Promise<CourseDashboardStats> {
    await ensureUserCanAccessInstructorDashboard(subjectUserId);
    const courseRepo = AppDataSource.getRepository(Course);
    const revenueRepo = AppDataSource.getRepository(PaymentRevenueLedger);

    const total = await courseRepo.count({ where: { created_by: subjectUserId, deleted_at: null as any } });
    const draft = await courseRepo.count({ where: { created_by: subjectUserId, status: 'draft', deleted_at: null as any } });
    const pending_review = await courseRepo.count({ where: { created_by: subjectUserId, status: 'pending_review', deleted_at: null as any } });
    const published = await courseRepo.count({ where: { created_by: subjectUserId, status: 'published', deleted_at: null as any } });
    const archived = await courseRepo.count({ where: { created_by: subjectUserId, status: 'archived', deleted_at: null as any } });
    const sumRow = await revenueRepo
      .createQueryBuilder('r')
      .select('COALESCE(SUM(r.gross_amount), 0)', 'gross')
      .addSelect('COALESCE(SUM(r.system_fee_amount), 0)', 'fee')
      .addSelect('COALESCE(SUM(r.net_amount), 0)', 'net')
      .addSelect('COUNT(*)', 'paid_orders')
      .where('r.teacher_user_id = :uid', { uid: subjectUserId })
      .andWhere('r.status = :status', { status: 'recognized' })
      .getRawOne();
    const finance = {
      currency: 'VND',
      gross_revenue: Number(sumRow?.gross || 0),
      platform_fee_total: Number(sumRow?.fee || 0),
      net_revenue: Number(sumRow?.net || 0),
      paid_orders: Number(sumRow?.paid_orders || 0),
    };

    return { total, draft, pending_review, published, archived, finance };
  }

  async getMyRevenueSummary(
    subjectUserId: number,
    query: TeacherRevenueSummaryQuery
  ): Promise<TeacherRevenueSummary> {
    await ensureUserCanAccessInstructorDashboard(subjectUserId);
    const revenueRepo = AppDataSource.getRepository(PaymentRevenueLedger);
    const { from, to } = parseRevenueDateRange(query);
    const qb = revenueRepo
      .createQueryBuilder('r')
      .select('COALESCE(SUM(r.gross_amount), 0)', 'gross')
      .addSelect('COALESCE(SUM(r.system_fee_amount), 0)', 'fee')
      .addSelect('COALESCE(SUM(r.net_amount), 0)', 'net')
      .addSelect('COUNT(*)', 'paid_orders')
      .where('r.teacher_user_id = :uid', { uid: subjectUserId })
      .andWhere('r.status = :status', { status: 'recognized' });
    if (from) qb.andWhere('r.recognized_at >= :from', { from });
    if (to) qb.andWhere('r.recognized_at <= :to', { to });
    const row = await qb.getRawOne();
    return {
      currency: 'VND',
      gross_revenue: Number(row?.gross || 0),
      platform_fee_total: Number(row?.fee || 0),
      net_revenue: Number(row?.net || 0),
      paid_orders: Number(row?.paid_orders || 0),
    };
  }

  async getMyRevenueTrend(
    subjectUserId: number,
    query: TeacherRevenueSummaryQuery
  ): Promise<TeacherRevenueTrendResult> {
    await ensureUserCanAccessInstructorDashboard(subjectUserId);
    const revenueRepo = AppDataSource.getRepository(PaymentRevenueLedger);
    const { from, to } = parseRevenueDateRange(query);
    const qb = revenueRepo
      .createQueryBuilder('r')
      .select('DATE(r.recognized_at)', 'date')
      .addSelect('COALESCE(SUM(r.gross_amount), 0)', 'gross')
      .addSelect('COALESCE(SUM(r.system_fee_amount), 0)', 'fee')
      .addSelect('COALESCE(SUM(r.net_amount), 0)', 'net')
      .addSelect('COUNT(*)', 'paid_orders')
      .where('r.teacher_user_id = :uid', { uid: subjectUserId })
      .andWhere('r.status = :status', { status: 'recognized' })
      .groupBy('DATE(r.recognized_at)')
      .orderBy('DATE(r.recognized_at)', 'ASC');
    if (from) qb.andWhere('r.recognized_at >= :from', { from });
    if (to) qb.andWhere('r.recognized_at <= :to', { to });
    const rows = await qb.getRawMany();
    return {
      points: (rows as any[]).map((r) => ({
        date: String(r.date || ''),
        gross_revenue: Number(r.gross || 0),
        platform_fee_total: Number(r.fee || 0),
        net_revenue: Number(r.net || 0),
        paid_orders: Number(r.paid_orders || 0),
      })),
    };
  }

  async listMyRevenueTransactions(
    subjectUserId: number,
    query: TeacherRevenueTransactionsQuery
  ): Promise<TeacherRevenueTransactionsResult> {
    await ensureUserCanAccessInstructorDashboard(subjectUserId);
    const revenueRepo = AppDataSource.getRepository(PaymentRevenueLedger);
    const { from, to } = parseRevenueDateRange(query);
    const page = Math.max(1, Number(query.page || 1));
    const pageSize = Math.min(50, Math.max(1, Number(query.page_size || 20)));
    const qb = revenueRepo
      .createQueryBuilder('r')
      .where('r.teacher_user_id = :uid', { uid: subjectUserId })
      .andWhere('r.status = :status', { status: 'recognized' })
      .orderBy('r.recognized_at', 'DESC')
      .addOrderBy('r.id', 'DESC');
    if (from) qb.andWhere('r.recognized_at >= :from', { from });
    if (to) qb.andWhere('r.recognized_at <= :to', { to });
    const total = await qb.getCount();
    const items = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();
    return {
      items: (items as any[]).map((r) => ({
        order_id: Number(r.order_id),
        course_id: Number(r.course_id),
        teacher_user_id: Number(r.teacher_user_id),
        gross_amount: Number(r.gross_amount || 0),
        platform_fee_amount: Number(r.system_fee_amount || 0),
        net_amount: Number(r.net_amount || 0),
        currency: String(r.currency || 'VND'),
        recognized_at: new Date(r.recognized_at).toISOString(),
        status: String(r.status || 'recognized') as 'recognized' | 'reversed',
      })),
      page,
      page_size: pageSize,
      total,
    };
  }

  async getMyCourseDetail(subjectUserId: number, courseId: number): Promise<CourseListItem> {
    await ensureUserIsCourseManager(subjectUserId);
    const courseRepo = AppDataSource.getRepository(Course);
    const admin = await isUserAdmin(subjectUserId);

    const qb = courseRepo.createQueryBuilder('c');
    qb.where('c.id = :id', { id: courseId });
    if (!admin) {
      qb.andWhere('c.created_by = :uid', { uid: subjectUserId });
    }
    qb.andWhere('c.deleted_at IS NULL');

    qb.addSelect((subQb) => subQb.select('COUNT(*)').from(CourseEnrollment, 'ce').where('ce.course_id = c.id'), 'learners_count');
    qb.addSelect((subQb) => subQb.select('COUNT(*)').from(Module, 'm').where('m.course_id = c.id'), 'modules_count');
    qb.addSelect((subQb) => subQb
      .select('COUNT(*)')
      .from(Lesson, 'l')
      .innerJoin(Module, 'm', 'm.id = l.module_id')
      .where('m.course_id = c.id'), 'lessons_count');

    const raw = await qb.getRawOne();
    if (!raw) throw new Error('Không tìm thấy khóa học.');

    const row = {
      id: raw.c_id ?? raw.id,
      title: raw.c_title ?? raw.title,
      slug: raw.c_slug ?? raw.slug,
      short_description: raw.c_short_description ?? raw.short_description,
      full_description: raw.c_full_description ?? raw.full_description,
      category: raw.c_category ?? raw.category,
      thumbnail_url: (raw.c_thumbnail_url ?? raw.thumbnail_url) ? getSignedDeliveryUrl(raw.c_thumbnail_url ?? raw.thumbnail_url) : null,
      level: String(raw.c_level ?? raw.level),
      language: String(raw.c_language ?? raw.language),
      learning_objectives: raw.c_learning_objectives ?? raw.learning_objectives,
      prerequisites: raw.c_prerequisites ?? raw.prerequisites,
      price: raw.c_price != null ? Number(raw.c_price) : raw.price != null ? Number(raw.price) : null,
      has_certificate: raw.c_has_certificate ?? raw.has_certificate,
      estimated_hours: raw.c_estimated_hours ?? raw.estimated_hours,
      tags: raw.c_tags ?? raw.tags,
      status: raw.c_status ?? raw.status,
      published_at: raw.c_published_at ?? raw.published_at,
      publish_scheduled_at: raw.c_publish_scheduled_at ?? raw.publish_scheduled_at,
      created_at: raw.c_created_at ?? raw.created_at,
      updated_at: raw.c_updated_at ?? raw.updated_at,
      learners_count: raw.learners_count,
      modules_count: raw.modules_count,
      lessons_count: raw.lessons_count,
    };
    const item = mapCourseRowToItem(row);
    try {
      await this.ensureCourseMeetsSubmissionGate(Number(item.id));
      item.quality_gate = { ready: true, issues: [] };
    } catch (e: any) {
      item.quality_gate = {
        ready: false,
        issues: [e?.message ? String(e.message) : 'Khóa học chưa đạt quality gate.'],
      };
    }
    return item;
  }

  async getMyCourseManagerOverview(subjectUserId: number, courseId: number): Promise<CourseManagerOverview> {
    await ensureUserIsCourseManager(subjectUserId);
    await this.ensureCourseOwnedOrAdmin(subjectUserId, courseId);

    const detail = await this.getMyCourseDetail(subjectUserId, courseId);
    const enrollRepo = AppDataSource.getRepository(CourseEnrollment);

    const statusRows = await enrollRepo
      .createQueryBuilder('ce')
      .select('ce.status', 'status')
      .addSelect('COUNT(*)', 'cnt')
      .where('ce.course_id = :courseId', { courseId })
      .groupBy('ce.status')
      .getRawMany();

    const enrollmentByStatus: Record<string, number> = {
      active: 0,
      completed: 0,
      dropped: 0,
      expired: 0,
    };
    for (const r of statusRows as any[]) {
      const s = String(r.status || '');
      if (s in enrollmentByStatus) enrollmentByStatus[s] = Number(r.cnt) || 0;
    }

    const avgRow = await enrollRepo
      .createQueryBuilder('ce')
      .select('AVG(ce.progress_percent)', 'avg_p')
      .where('ce.course_id = :courseId', { courseId })
      .getRawOne();
    const avgProgress =
      avgRow?.avg_p != null && !Number.isNaN(Number(avgRow.avg_p)) ? Math.round(Number(avgRow.avg_p) * 100) / 100 : 0;

    const now = new Date();
    const startMonth = new Date(now.getFullYear(), now.getMonth() - 5, 1, 0, 0, 0, 0);
    const monthlyRaw = await enrollRepo
      .createQueryBuilder('ce')
      .select("DATE_FORMAT(ce.enrolled_at, '%Y-%m')", 'ym')
      .addSelect('COUNT(*)', 'cnt')
      .where('ce.course_id = :courseId', { courseId })
      .andWhere('ce.enrolled_at >= :startMonth', { startMonth })
      .groupBy('ym')
      .orderBy('ym', 'ASC')
      .getRawMany();

    const monthKeys: string[] = [];
    const enrollmentTrendLabels: string[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      monthKeys.push(`${y}-${m}`);
      enrollmentTrendLabels.push(d.toLocaleDateString('vi-VN', { month: 'short', year: 'numeric' }));
    }
    const byYm = new Map((monthlyRaw as any[]).map((r) => [String(r.ym), Number(r.cnt) || 0]));
    const enrollmentTrendValues = monthKeys.map((k) => byYm.get(k) ?? 0);

    const lessonRepo = AppDataSource.getRepository(Lesson);
    const ltRaw = await lessonRepo
      .createQueryBuilder('l')
      .innerJoin(Module, 'm', 'm.id = l.module_id')
      .select('l.lesson_type', 'lesson_type')
      .addSelect('COUNT(*)', 'cnt')
      .where('m.course_id = :courseId', { courseId })
      .groupBy('l.lesson_type')
      .getRawMany();

    const lessonTypeCounts: Record<string, number> = {
      video: 0,
      text: 0,
      quiz: 0,
      assignment: 0,
    };
    for (const r of ltRaw as any[]) {
      const t = String(r.lesson_type || '');
      if (t in lessonTypeCounts) lessonTypeCounts[t] = Number(r.cnt) || 0;
    }

    const idRows = await lessonRepo
      .createQueryBuilder('l')
      .innerJoin(Module, 'm', 'm.id = l.module_id')
      .select('l.id', 'id')
      .where('m.course_id = :courseId', { courseId })
      .getRawMany();
    const lessonIds = (idRows as any[]).map((x) => Number(x.id)).filter((x) => Number.isFinite(x) && x > 0);
    const flags = await this.loadLessonAttachmentFlags(lessonIds);

    const progressRows = await enrollRepo
      .createQueryBuilder('ce')
      .select('ce.progress_percent', 'p')
      .where('ce.course_id = :courseId', { courseId })
      .getRawMany();

    const progressBuckets = [
      { label: '0–25%', count: 0 },
      { label: '26–50%', count: 0 },
      { label: '51–75%', count: 0 },
      { label: '76–100%', count: 0 },
    ];
    for (const r of progressRows as any[]) {
      const p = Math.min(100, Math.max(0, Number(r.p) || 0));
      if (p <= 25) progressBuckets[0].count += 1;
      else if (p <= 50) progressBuckets[1].count += 1;
      else if (p <= 75) progressBuckets[2].count += 1;
      else progressBuckets[3].count += 1;
    }

    return {
      course: detail,
      enrollment_by_status: enrollmentByStatus,
      avg_progress_percent: avgProgress,
      enrollment_trend: { labels: enrollmentTrendLabels, values: enrollmentTrendValues },
      lesson_type_counts: lessonTypeCounts,
      lessons_with_quiz_count: flags.hasQuiz.size,
      lessons_with_assignment_count: flags.hasAssignment.size,
      progress_distribution: progressBuckets.map(({ label, count }) => ({ label, count })),
    };
  }

  async getMyCoursePrerequisiteGraph(subjectUserId: number, courseId: number): Promise<CoursePrerequisiteGraph> {
    await ensureUserIsCourseManager(subjectUserId);
    const root = await this.ensureCourseOwnedOrAdmin(subjectUserId, courseId);
    return this.buildPrerequisiteGraph(root as any, subjectUserId, 'published_or_own');
  }

  async listMyCoursePrerequisiteOptions(subjectUserId: number, courseId: number): Promise<CoursePrerequisiteOption[]> {
    await ensureUserIsCourseManager(subjectUserId);
    const ownCourse = await this.ensureCourseOwnedOrAdmin(subjectUserId, courseId);
    const ownerId = Number((ownCourse as any)?.created_by || subjectUserId);
    const selectedSet = new Set<number>(parsePrerequisiteCourseIds((ownCourse as any).prerequisites));
    const courseRepo = AppDataSource.getRepository(Course);
    const now = new Date();

    const candidates = await courseRepo
      .createQueryBuilder('c')
      .where('c.deleted_at IS NULL')
      .andWhere('c.id <> :courseId', { courseId })
      .andWhere(
        `(c.status = :published OR (c.status = :draft AND c.publish_scheduled_at IS NOT NULL AND c.publish_scheduled_at <= :now) OR c.created_by = :uid)`,
        { published: 'published', draft: 'draft', now, uid: ownerId }
      )
      .orderBy('c.title', 'ASC')
      .addOrderBy('c.id', 'ASC')
      .getMany();

    const items = await Promise.all(
      (candidates as any[]).map(async (c) => {
        const id = Number(c.id);
        const title = String(c.title || '');
        const slug = String(c.slug || '');
        if (selectedSet.has(id)) {
          return { id, title, slug, selectable: true, reason: null };
        }
        try {
          await this.validatePrerequisiteGraph(courseId, [id]);
          return { id, title, slug, selectable: true, reason: null };
        } catch (e: any) {
          return {
            id,
            title,
            slug,
            selectable: false,
            reason: e?.message ? String(e.message) : 'Không thể chọn làm tiên quyết.',
          };
        }
      })
    );

    return items;
  }

  async updateMyCourse(subjectUserId: number, courseId: number, request: UpdateCourseRequest): Promise<void> {
    await ensureUserIsCourseManager(subjectUserId);
    const courseRepo = AppDataSource.getRepository(Course);
    const now = new Date();

    const course = await courseRepo.findOne({ where: { id: courseId, created_by: subjectUserId } as any });
    if (!course || (course as any).deleted_at) throw new Error('Không tìm thấy khóa học.');
    this.ensureCourseEditableForTeacher(course);

    if (request.title != null) {
      course.title = request.title;
    }
    if ('short_description' in request) course.short_description = request.short_description ?? null;
    if ('full_description' in request) course.full_description = request.full_description ?? null;
    if ('category' in request) (course as any).category = request.category ?? null;
    if ('thumbnail_url' in request) course.thumbnail_url = request.thumbnail_url ?? null;
    if ('learning_objectives' in request) course.learning_objectives = request.learning_objectives ?? null;
    if ('price' in request) (course as any).price = request.price ?? null;
    if ('has_certificate' in request) (course as any).has_certificate = Boolean(request.has_certificate);
    if ('estimated_hours' in request) (course as any).estimated_hours = request.estimated_hours ?? null;
    if ('tags' in request) (course as any).tags = request.tags ?? null;
    if ('prerequisites' in request) {
      const prerequisiteIds = parsePrerequisiteCourseIds(request.prerequisites);
      await this.validatePrerequisiteGraph(courseId, prerequisiteIds);
      course.prerequisites = prerequisiteIds.length ? prerequisiteIds.map(String) : null;
    }
    if ('level' in request && request.level) course.level = request.level;
    if ('language' in request && request.language) course.language = request.language;

    if ('publish_scheduled_at' in request) {
      const scheduledAt = parseNullableDateTime((request as any)?.publish_scheduled_at);
      if (!scheduledAt) {
        (course as any).publish_scheduled_at = null;
      } else if (scheduledAt.getTime() <= now.getTime()) {
        const canDirectPublish = await isUserAdmin(subjectUserId);
        if (canDirectPublish) {
          course.status = 'published';
          course.published_at = scheduledAt;
          (course as any).publish_scheduled_at = null;
        } else {
          course.status = 'pending_review';
          course.published_at = null;
          (course as any).publish_scheduled_at = scheduledAt;
        }
      } else {
        course.status = 'draft';
        course.published_at = null;
        (course as any).publish_scheduled_at = scheduledAt;
      }
    }

    await courseRepo.save(course);
  }

  async setMyCourseStatus(subjectUserId: number, courseId: number, status: CourseStatus): Promise<void> {
    await ensureUserIsCourseManager(subjectUserId);
    const courseRepo = AppDataSource.getRepository(Course);
    const course = await courseRepo.findOne({ where: { id: courseId, created_by: subjectUserId } as any });
    if (!course || (course as any).deleted_at) throw new Error('Không tìm thấy khóa học.');
    const fromStatus = String(course.status) as CourseStatus;

    if (fromStatus === 'pending_review' && status !== 'draft') {
      throw new Error('Khóa học đang chờ duyệt. Chỉ có thể thu hồi yêu cầu duyệt về bản nháp.');
    }

    if (status === 'published') {
      await this.ensureCourseReadyForPublish(courseId);
      const canDirectPublish = await isUserAdmin(subjectUserId);
      if (canDirectPublish) {
        course.status = 'published';
        course.published_at = course.published_at ?? new Date();
        (course as any).publish_scheduled_at = null;
        await this.logCourseReviewEvent({
          courseId,
          actorUserId: subjectUserId,
          fromStatus,
          toStatus: 'published',
          decision: 'approve',
          note: 'Direct publish by admin',
        });
      } else {
        course.status = 'pending_review';
        course.published_at = null;
        await this.logCourseReviewEvent({
          courseId,
          actorUserId: subjectUserId,
          fromStatus,
          toStatus: 'pending_review',
          decision: 'submit',
        });
      }
    } else if (status === 'draft') {
      course.status = 'draft';
      course.published_at = null;
      (course as any).publish_scheduled_at = null;
      await this.logCourseReviewEvent({
        courseId,
        actorUserId: subjectUserId,
        fromStatus,
        toStatus: 'draft',
        decision: 'revert_draft',
      });
    } else if (status === 'pending_review') {
      await this.ensureCourseMeetsSubmissionGate(courseId);
      course.status = 'pending_review';
      course.published_at = null;
      await this.logCourseReviewEvent({
        courseId,
        actorUserId: subjectUserId,
        fromStatus,
        toStatus: 'pending_review',
        decision: 'submit',
      });
    } else if (status === 'archived') {
      course.status = 'archived';
      (course as any).publish_scheduled_at = null;
      await this.logCourseReviewEvent({
        courseId,
        actorUserId: subjectUserId,
        fromStatus,
        toStatus: 'archived',
        decision: 'archive',
      });
    } else {
      throw new Error('Trạng thái không hợp lệ.');
    }

    await courseRepo.save(course);
  }

  async listPendingReviewCourses(
    subjectUserId: number,
    query: PendingReviewCourseQuery
  ): Promise<PendingReviewCourseListResult> {
    const admin = await isUserAdmin(subjectUserId);
    if (!admin) throw new Error('Bạn không có quyền thực hiện thao tác này.');

    const courseRepo = AppDataSource.getRepository(Course);
    const page = Number(query.page || 1);
    const pageSize = Math.min(50, Math.max(1, Number(query.page_size || 20)));
    const q = String(query.q || '').trim();

    const qb = courseRepo.createQueryBuilder('c');
    qb.where('c.deleted_at IS NULL');
    qb.andWhere('c.status = :status', { status: 'pending_review' });
    if (q) qb.andWhere('(c.title LIKE :q OR c.slug LIKE :q)', { q: `%${q}%` });

    qb.addSelect((subQb) => subQb.select('COUNT(*)').from(CourseEnrollment, 'ce').where('ce.course_id = c.id'), 'learners_count');
    qb.addSelect((subQb) => subQb.select('COUNT(*)').from(Module, 'm').where('m.course_id = c.id'), 'modules_count');
    qb.addSelect((subQb) => subQb
      .select('COUNT(*)')
      .from(Lesson, 'l')
      .innerJoin(Module, 'm', 'm.id = l.module_id')
      .where('m.course_id = c.id'), 'lessons_count');
    qb.orderBy('c.updated_at', 'DESC');
    qb.skip((page - 1) * pageSize).take(pageSize);

    const total = await qb.getCount();
    const { raw } = await qb.getRawAndEntities();
    const items = await Promise.all(raw.map(async (r: any) => {
      const item = mapCourseRowToItem({
        id: r.c_id ?? r.id,
        title: r.c_title ?? r.title,
        slug: r.c_slug ?? r.slug,
        short_description: r.c_short_description ?? r.short_description,
        full_description: r.c_full_description ?? r.full_description,
        category: r.c_category ?? r.category,
        thumbnail_url: r.c_thumbnail_url ?? r.thumbnail_url,
        level: r.c_level ?? r.level,
        language: r.c_language ?? r.language,
        learning_objectives: r.c_learning_objectives ?? r.learning_objectives,
        prerequisites: r.c_prerequisites ?? r.prerequisites,
        price: r.c_price ?? r.price,
        has_certificate: r.c_has_certificate ?? r.has_certificate,
        estimated_hours: r.c_estimated_hours ?? r.estimated_hours,
        tags: r.c_tags ?? r.tags,
        status: r.c_status ?? r.status,
        published_at: r.c_published_at ?? r.published_at,
        publish_scheduled_at: r.c_publish_scheduled_at ?? r.publish_scheduled_at,
        created_at: r.c_created_at ?? r.created_at,
        updated_at: r.c_updated_at ?? r.updated_at,
        learners_count: r.learners_count,
        modules_count: r.modules_count,
        lessons_count: r.lessons_count,
      });
      try {
        await this.ensureCourseMeetsSubmissionGate(Number(item.id));
        item.quality_gate = { ready: true, issues: [] };
      } catch (e: any) {
        item.quality_gate = {
          ready: false,
          issues: [e?.message ? String(e.message) : 'Khóa học chưa đạt quality gate.'],
        };
      }
      return item;
    }));

    return {
      items,
      page,
      page_size: pageSize,
      total,
    };
  }

  async listAdminCourses(
    subjectUserId: number,
    query: {
      status?: string;
      q?: string;
      page?: number;
      page_size?: number;
      sort_by?: string;
      sort_dir?: string;
    }
  ): Promise<{ items: any[]; page: number; page_size: number; total: number }> {
    const admin = await isUserAdmin(subjectUserId);
    if (!admin) throw new Error('Bạn không có quyền thực hiện thao tác này.');

    const courseRepo = AppDataSource.getRepository(Course);
    const page = Math.max(1, Number(query.page || 1));
    const pageSize = Math.min(50, Math.max(1, Number(query.page_size || 20)));
    const status = String(query.status || 'all');
    const q = String(query.q || '').trim();
    const sortBy = String(query.sort_by || 'updated_at');
    const sortDir = String(query.sort_dir || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const qb = courseRepo.createQueryBuilder('c');
    qb.where('c.deleted_at IS NULL');

    if (status !== 'all') {
      qb.andWhere('c.status = :status', { status });
    }

    if (q) {
      qb.andWhere('(c.title LIKE :q OR c.slug LIKE :q)', { q: `%${q}%` });
    }

    qb.addSelect((subQb) => subQb.select('COUNT(*)').from(CourseEnrollment, 'ce').where('ce.course_id = c.id'), 'learners_count');
    qb.addSelect((subQb) => subQb.select('COUNT(*)').from(Module, 'm').where('m.course_id = c.id'), 'modules_count');
    qb.addSelect((subQb) => subQb
      .select('COUNT(*)')
      .from(Lesson, 'l')
      .innerJoin(Module, 'm', 'm.id = l.module_id')
      .where('m.course_id = c.id'), 'lessons_count');
    qb.addSelect((subQb) => subQb
      .select('u.full_name')
      .from(User, 'u')
      .where('u.id = c.created_by')
      .limit(1), 'creator_name');

    const validSortFields: Record<string, string> = {
      updated_at: 'c.updated_at',
      created_at: 'c.created_at',
      title: 'c.title',
      learners_count: 'learners_count',
    };
    const sortField = validSortFields[sortBy] || 'c.updated_at';
    qb.orderBy(sortField, sortDir);

    qb.skip((page - 1) * pageSize).take(pageSize);

    const total = await qb.getCount();
    const { raw } = await qb.getRawAndEntities();
    const items = raw.map((r: any) => ({
      id: r.c_id ?? r.id,
      title: r.c_title ?? r.title,
      slug: r.c_slug ?? r.slug,
      short_description: r.c_short_description ?? r.short_description,
      category: r.c_category ?? r.category,
      thumbnail_url: r.c_thumbnail_url ?? r.thumbnail_url,
      level: r.c_level ?? r.level,
      language: r.c_language ?? r.language,
      price: r.c_price ?? r.price,
      has_certificate: r.c_has_certificate ?? r.has_certificate,
      estimated_hours: r.c_estimated_hours ?? r.estimated_hours,
      tags: r.c_tags ?? r.tags,
      status: r.c_status ?? r.status,
      published_at: r.c_published_at ?? r.published_at,
      publish_scheduled_at: r.c_publish_scheduled_at ?? r.publish_scheduled_at,
      created_at: r.c_created_at ?? r.created_at,
      updated_at: r.c_updated_at ?? r.updated_at,
      learners_count: Number(r.learners_count ?? 0),
      modules_count: Number(r.modules_count ?? 0),
      lessons_count: Number(r.lessons_count ?? 0),
      creator_name: r.creator_name ?? null,
    }));

    return {
      items,
      page,
      page_size: pageSize,
      total,
    };
  }

  async reviewCourseByAdmin(
    subjectUserId: number,
    courseId: number,
    decision: ReviewCourseDecision,
    note?: string | null
  ): Promise<void> {
    const admin = await isUserAdmin(subjectUserId);
    if (!admin) throw new Error('Bạn không có quyền thực hiện thao tác này.');

    const courseRepo = AppDataSource.getRepository(Course);
    const course = await courseRepo.findOne({ where: { id: courseId } as any });
    if (!course || (course as any).deleted_at) throw new Error('Không tìm thấy khóa học.');
    if (String(course.status) !== 'pending_review') {
      throw new Error('Khóa học không ở trạng thái chờ duyệt.');
    }
    if (decision === 'approve') {
      await this.ensureCourseReadyForPublish(courseId);
    }
    const fromStatus = String(course.status) as CourseStatus;

    if (decision === 'approve') {
      course.status = 'published';
      course.published_at = new Date();
      (course as any).publish_scheduled_at = null;
      await this.logCourseReviewEvent({
        courseId,
        actorUserId: subjectUserId,
        fromStatus,
        toStatus: 'published',
        decision: 'approve',
        note,
      });
    } else if (decision === 'reject') {
      if (!String(note || '').trim()) {
        throw new Error('Bạn phải nhập lý do khi từ chối khóa học.');
      }
      course.status = 'draft';
      course.published_at = null;
      (course as any).publish_scheduled_at = null;
      await this.logCourseReviewEvent({
        courseId,
        actorUserId: subjectUserId,
        fromStatus,
        toStatus: 'draft',
        decision: 'reject',
        note,
      });
    } else {
      throw new Error('Quyết định duyệt không hợp lệ.');
    }

    await courseRepo.save(course);
    await this.logCourseAudit(subjectUserId, 'course_reviewed', courseId, {
      decision,
      note: note || null,
      course_owner_id: Number((course as any).created_by),
    });
  }

  async getCourseReviewTimelineByAdmin(subjectUserId: number, courseId: number): Promise<{ course_id: number; items: any[] }> {
    const admin = await isUserAdmin(subjectUserId);
    if (!admin) throw new Error('Bạn không có quyền thực hiện thao tác này.');
    await ensureCourseWorkflowSchema();
    const rows = await AppDataSource.query(
      `
      SELECT id, course_id, actor_user_id, from_status, to_status, decision, note, created_at
      FROM course_review_events
      WHERE course_id = ?
      ORDER BY created_at DESC, id DESC
      `,
      [courseId],
    );
    return {
      course_id: courseId,
      items: (rows || []).map((r: any) => ({
        id: Number(r.id),
        course_id: Number(r.course_id),
        actor_user_id: Number(r.actor_user_id),
        from_status: r.from_status ?? null,
        to_status: r.to_status,
        decision: r.decision,
        note: r.note ?? null,
        created_at: new Date(r.created_at).toISOString(),
      })),
    };
  }

  async getMyCourseReviewTimeline(subjectUserId: number, courseId: number): Promise<{ course_id: number; items: any[] }> {
    await ensureUserIsCourseManager(subjectUserId);
    await this.ensureOwnCourse(subjectUserId, courseId);
    await ensureCourseWorkflowSchema();
    const rows = await AppDataSource.query(
      `
      SELECT id, course_id, actor_user_id, from_status, to_status, decision, note, created_at
      FROM course_review_events
      WHERE course_id = ?
      ORDER BY created_at DESC, id DESC
      `,
      [courseId],
    );
    return {
      course_id: courseId,
      items: (rows || []).map((r: any) => ({
        id: Number(r.id),
        course_id: Number(r.course_id),
        actor_user_id: Number(r.actor_user_id),
        from_status: r.from_status ?? null,
        to_status: r.to_status,
        decision: r.decision,
        note: r.note ?? null,
        created_at: new Date(r.created_at).toISOString(),
      })),
    };
  }

  async listPendingLessonResourcesByAdmin(
    subjectUserId: number,
    query: PendingLessonResourceQuery
  ): Promise<PendingLessonResourceListResult> {
    const admin = await isUserAdmin(subjectUserId);
    if (!admin) throw new Error('Bạn không có quyền thực hiện thao tác này.');
    await ensureCourseWorkflowSchema();

    const page = Math.max(1, Number(query.page || 1));
    const pageSize = Math.min(50, Math.max(1, Number(query.page_size || 20)));
    const q = String(query.q || '').trim();
    const kind = String(query.kind || 'all').toLowerCase();
    const courseIdFilter = Number((query as any).course_id || 0);

    let where = `r.review_status = 'pending'`;
    const params: any[] = [];
    if (courseIdFilter > 0) {
      where += ` AND c.id = ?`;
      params.push(courseIdFilter);
    }
    if (kind && kind !== 'all') {
      where += ` AND r.resource_kind = ?`;
      params.push(kind);
    }
    if (q) {
      where += ` AND (r.filename LIKE ? OR c.title LIKE ? OR l.title LIKE ?)`;
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }

    const totalRows = await AppDataSource.query(
      `
      SELECT COUNT(*) AS total
      FROM lesson_resources r
      INNER JOIN lessons l ON l.id = r.lesson_id
      INNER JOIN modules m ON m.id = l.module_id
      INNER JOIN courses c ON c.id = m.course_id
      WHERE ${where} AND c.deleted_at IS NULL
      `,
      params
    );
    const total = Number(totalRows?.[0]?.total || 0);

    const rows = await AppDataSource.query(
      `
      SELECT
        r.id, r.lesson_id, r.resource_type, r.resource_kind, r.url, r.filename, r.mime_type, r.size_bytes, r.preview_url,
        r.review_status, r.review_reason, r.reviewed_by, r.reviewed_at, r.created_at,
        c.id AS course_id, c.title AS course_title, l.title AS lesson_title, c.created_by AS teacher_id,
        last_evt.decision AS last_review_decision,
        last_evt.note AS last_review_note,
        last_evt.created_at AS last_reviewed_at,
        CASE
          WHEN last_evt.decision = 'resubmit' OR (last_evt.from_status = 'rejected' AND last_evt.to_status = 'pending')
          THEN 1
          ELSE 0
        END AS is_resubmitted,
        prev_reject.note AS previous_rejected_reason
      FROM lesson_resources r
      INNER JOIN lessons l ON l.id = r.lesson_id
      INNER JOIN modules m ON m.id = l.module_id
      INNER JOIN courses c ON c.id = m.course_id
      LEFT JOIN (
        SELECT e1.resource_id, e1.decision, e1.note, e1.from_status, e1.to_status, e1.created_at
        FROM lesson_resource_review_events e1
        INNER JOIN (
          SELECT resource_id, MAX(id) AS last_id
          FROM lesson_resource_review_events
          GROUP BY resource_id
        ) latest ON latest.last_id = e1.id
      ) last_evt ON last_evt.resource_id = r.id
      LEFT JOIN (
        SELECT e2.resource_id, e2.note
        FROM lesson_resource_review_events e2
        INNER JOIN (
          SELECT resource_id, MAX(id) AS last_reject_id
          FROM lesson_resource_review_events
          WHERE decision = 'reject'
          GROUP BY resource_id
        ) rej ON rej.last_reject_id = e2.id
      ) prev_reject ON prev_reject.resource_id = r.id
      WHERE ${where} AND c.deleted_at IS NULL
      ORDER BY
        CASE
          WHEN (last_evt.decision = 'resubmit' OR (last_evt.from_status = 'rejected' AND last_evt.to_status = 'pending')) THEN 0
          ELSE 1
        END ASC,
        COALESCE(last_evt.created_at, r.created_at) DESC,
        r.id DESC
      LIMIT ? OFFSET ?
      `,
      [...params, pageSize, (page - 1) * pageSize]
    );

    return {
      items: (rows || []).map((r: any) => ({
        id: Number(r.id),
        lesson_id: Number(r.lesson_id),
        resource_type: String(r.resource_type || 'file') as any,
        resource_kind: (r.resource_kind ?? classifyResourceKind({ mime_type: r.mime_type, filename: r.filename, url: r.url })) as any,
        url: r.url ? getSignedDeliveryUrl(r.url) : r.url,
        filename: r.filename ?? null,
        mime_type: r.mime_type ?? null,
        size_bytes: r.size_bytes != null ? Number(r.size_bytes) : null,
        preview_url: r.preview_url ? getSignedDeliveryUrl(r.preview_url) : null,
        review_status: (r.review_status ?? 'pending') as any,
        review_reason: r.review_reason ?? null,
        reviewed_by: r.reviewed_by != null ? Number(r.reviewed_by) : null,
        reviewed_at: r.reviewed_at ? new Date(r.reviewed_at).toISOString() : null,
        created_at: new Date(r.created_at).toISOString(),
        course_id: Number(r.course_id),
        course_title: String(r.course_title || ''),
        lesson_title: String(r.lesson_title || ''),
        teacher_id: Number(r.teacher_id),
        is_resubmitted: Number(r.is_resubmitted || 0) === 1,
        last_review_decision: r.last_review_decision ?? null,
        last_review_note: r.last_review_note ?? null,
        last_reviewed_at: r.last_reviewed_at ? new Date(r.last_reviewed_at).toISOString() : null,
        previous_rejected_reason: r.previous_rejected_reason ?? null,
      })),
      page,
      page_size: pageSize,
      total,
    };
  }

  async listMyRejectedLessonResources(subjectUserId: number, courseId: number): Promise<TeacherRejectedResourceListResult> {
    await ensureUserIsCourseManager(subjectUserId);
    await this.ensureOwnCourse(subjectUserId, courseId);
    await ensureCourseWorkflowSchema();

    const rows = await AppDataSource.query(
      `
      SELECT
        r.id, r.lesson_id, r.resource_type, r.resource_kind, r.url, r.filename, r.mime_type, r.size_bytes, r.preview_url,
        r.review_status, r.review_reason, r.reviewed_by, r.reviewed_at, r.created_at,
        c.id AS course_id, c.title AS course_title,
        m.id AS module_id, m.title AS module_title,
        l.id AS lesson_id, l.title AS lesson_title, l.lesson_type,
        rej_evt.note AS review_event_note, rej_evt.created_at AS review_event_at
      FROM lesson_resources r
      INNER JOIN lessons l ON l.id = r.lesson_id
      INNER JOIN modules m ON m.id = l.module_id
      INNER JOIN courses c ON c.id = m.course_id
      LEFT JOIN (
        SELECT e.resource_id, e.note, e.created_at
        FROM lesson_resource_review_events e
        INNER JOIN (
          SELECT resource_id, MAX(id) AS last_reject_id
          FROM lesson_resource_review_events
          WHERE decision = 'reject'
          GROUP BY resource_id
        ) t ON t.last_reject_id = e.id
      ) rej_evt ON rej_evt.resource_id = r.id
      WHERE c.id = ? AND c.created_by = ? AND c.deleted_at IS NULL AND r.review_status = 'rejected'
      ORDER BY COALESCE(r.reviewed_at, rej_evt.created_at, r.created_at) DESC, r.id DESC
      `,
      [courseId, subjectUserId]
    );

    return {
      course_id: courseId,
      items: (rows || []).map((r: any) => ({
        id: Number(r.id),
        lesson_id: Number(r.lesson_id),
        resource_type: String(r.resource_type || 'file') as any,
        resource_kind: (r.resource_kind ?? classifyResourceKind({ mime_type: r.mime_type, filename: r.filename, url: r.url })) as any,
        url: r.url ? getSignedDeliveryUrl(r.url) : r.url,
        filename: r.filename ?? null,
        mime_type: r.mime_type ?? null,
        size_bytes: r.size_bytes != null ? Number(r.size_bytes) : null,
        preview_url: r.preview_url ? getSignedDeliveryUrl(r.preview_url) : null,
        review_status: (r.review_status ?? 'rejected') as any,
        review_reason: r.review_reason ?? null,
        reviewed_by: r.reviewed_by != null ? Number(r.reviewed_by) : null,
        reviewed_at: r.reviewed_at ? new Date(r.reviewed_at).toISOString() : null,
        created_at: new Date(r.created_at).toISOString(),
        course_id: Number(r.course_id),
        course_title: String(r.course_title || ''),
        module_id: Number(r.module_id),
        module_title: String(r.module_title || ''),
        lesson_title: String(r.lesson_title || ''),
        lesson_type: String(r.lesson_type || 'text') as any,
        review_event_note: r.review_event_note ?? null,
        review_event_at: r.review_event_at ? new Date(r.review_event_at).toISOString() : null,
      })),
    };
  }

  async listMyPendingLessonResources(subjectUserId: number, courseId: number): Promise<TeacherPendingResourceListResult> {
    await ensureUserIsCourseManager(subjectUserId);
    await this.ensureOwnCourse(subjectUserId, courseId);
    await ensureCourseWorkflowSchema();

    const rows = await AppDataSource.query(
      `
      SELECT
        r.id, r.lesson_id, r.resource_type, r.resource_kind, r.url, r.filename, r.mime_type, r.size_bytes, r.preview_url,
        r.review_status, r.review_reason, r.reviewed_by, r.reviewed_at, r.created_at,
        c.id AS course_id, c.title AS course_title,
        m.id AS module_id, m.title AS module_title,
        l.id AS lesson_id, l.title AS lesson_title, l.lesson_type,
        last_evt.decision AS last_review_decision,
        last_evt.note AS last_review_note,
        last_evt.created_at AS last_reviewed_at,
        CASE
          WHEN last_evt.decision = 'resubmit' OR (last_evt.from_status = 'rejected' AND last_evt.to_status = 'pending')
          THEN 1
          ELSE 0
        END AS is_resubmitted,
        prev_reject.note AS previous_rejected_reason
      FROM lesson_resources r
      INNER JOIN lessons l ON l.id = r.lesson_id
      INNER JOIN modules m ON m.id = l.module_id
      INNER JOIN courses c ON c.id = m.course_id
      LEFT JOIN (
        SELECT e1.resource_id, e1.decision, e1.note, e1.from_status, e1.to_status, e1.created_at
        FROM lesson_resource_review_events e1
        INNER JOIN (
          SELECT resource_id, MAX(id) AS last_id
          FROM lesson_resource_review_events
          GROUP BY resource_id
        ) latest ON latest.last_id = e1.id
      ) last_evt ON last_evt.resource_id = r.id
      LEFT JOIN (
        SELECT e2.resource_id, e2.note
        FROM lesson_resource_review_events e2
        INNER JOIN (
          SELECT resource_id, MAX(id) AS last_reject_id
          FROM lesson_resource_review_events
          WHERE decision = 'reject'
          GROUP BY resource_id
        ) rej ON rej.last_reject_id = e2.id
      ) prev_reject ON prev_reject.resource_id = r.id
      WHERE c.id = ? AND c.created_by = ? AND c.deleted_at IS NULL AND r.review_status = 'pending'
      ORDER BY
        CASE
          WHEN (last_evt.decision = 'resubmit' OR (last_evt.from_status = 'rejected' AND last_evt.to_status = 'pending')) THEN 0
          ELSE 1
        END ASC,
        COALESCE(last_evt.created_at, r.created_at) DESC,
        r.id DESC
      `,
      [courseId, subjectUserId]
    );

    return {
      course_id: courseId,
      items: (rows || []).map((r: any) => ({
        id: Number(r.id),
        lesson_id: Number(r.lesson_id),
        resource_type: String(r.resource_type || 'file') as any,
        resource_kind: (r.resource_kind ?? classifyResourceKind({ mime_type: r.mime_type, filename: r.filename, url: r.url })) as any,
        url: r.url ? getSignedDeliveryUrl(r.url) : r.url,
        filename: r.filename ?? null,
        mime_type: r.mime_type ?? null,
        size_bytes: r.size_bytes != null ? Number(r.size_bytes) : null,
        preview_url: r.preview_url ? getSignedDeliveryUrl(r.preview_url) : null,
        review_status: (r.review_status ?? 'pending') as any,
        review_reason: r.review_reason ?? null,
        reviewed_by: r.reviewed_by != null ? Number(r.reviewed_by) : null,
        reviewed_at: r.reviewed_at ? new Date(r.reviewed_at).toISOString() : null,
        created_at: new Date(r.created_at).toISOString(),
        course_id: Number(r.course_id),
        course_title: String(r.course_title || ''),
        module_id: Number(r.module_id),
        module_title: String(r.module_title || ''),
        lesson_title: String(r.lesson_title || ''),
        lesson_type: String(r.lesson_type || 'text') as any,
        is_resubmitted: Number(r.is_resubmitted || 0) === 1,
        last_review_decision: r.last_review_decision ?? null,
        last_review_note: r.last_review_note ?? null,
        last_reviewed_at: r.last_reviewed_at ? new Date(r.last_reviewed_at).toISOString() : null,
        previous_rejected_reason: r.previous_rejected_reason ?? null,
      })),
    };
  }

  async listMyApprovedLessonResources(subjectUserId: number, courseId: number): Promise<TeacherApprovedResourceListResult> {
    await ensureUserIsCourseManager(subjectUserId);
    await this.ensureOwnCourse(subjectUserId, courseId);
    await ensureCourseWorkflowSchema();

    const rows = await AppDataSource.query(
      `
      SELECT
        r.id, r.lesson_id, r.resource_kind, r.filename,
        c.id AS course_id,
        m.id AS module_id, m.title AS module_title,
        l.id AS lesson_id, l.title AS lesson_title, l.lesson_type,
        r.reviewed_at
      FROM lesson_resources r
      INNER JOIN lessons l ON l.id = r.lesson_id
      INNER JOIN modules m ON m.id = l.module_id
      INNER JOIN courses c ON c.id = m.course_id
      WHERE c.id = ? AND c.created_by = ? AND c.deleted_at IS NULL AND r.review_status = 'approved'
      ORDER BY r.reviewed_at DESC, r.id DESC
      `,
      [courseId, subjectUserId]
    );

    return {
      course_id: courseId,
      items: (rows || []).map((r: any) => ({
        id: Number(r.id),
        module_id: Number(r.module_id),
        module_title: String(r.module_title || ''),
        lesson_id: Number(r.lesson_id),
        lesson_title: String(r.lesson_title || ''),
        lesson_type: String(r.lesson_type || 'text') as any,
        resource_kind: (r.resource_kind ?? 'other') as any,
        filename: r.filename ?? null,
        reviewed_at: r.reviewed_at ? new Date(r.reviewed_at).toISOString() : null,
      })),
    };
  }

  async reviewLessonResourceByAdmin(
    subjectUserId: number,
    resourceId: number,
    decision: LessonResourceReviewDecision,
    note?: string | null
  ): Promise<void> {
    const admin = await isUserAdmin(subjectUserId);
    if (!admin) throw new Error('Bạn không có quyền thực hiện thao tác này.');
    await ensureCourseWorkflowSchema();

    const resourceRepo = AppDataSource.getRepository(LessonResource);
    const resource = await resourceRepo.findOne({ where: { id: resourceId } as any });
    if (!resource) throw new Error('Không tìm thấy tài nguyên.');

    const fromStatus = String((resource as any).review_status || 'pending') as 'pending' | 'approved' | 'rejected';
    const reviewDecision = String((resource as any).review_decision || 'add');
    const toStatus = decision === 'approve' ? 'approved' : 'rejected';

    if (decision === 'approve' && reviewDecision === 'delete') {
      await this.logLessonResourceReviewEvent({
        resourceId,
        actorUserId: subjectUserId,
        fromStatus,
        toStatus: 'approved',
        decision: 'approve',
        note: note || 'Admin đã duyệt yêu cầu xóa tài nguyên',
      });
      await resourceRepo.delete({ id: resourceId } as any);
      return;
    }

    if (decision === 'reject' && reviewDecision === 'delete') {
      await resourceRepo.update(
        { id: resourceId } as any,
        {
          review_status: 'approved',
          review_decision: 'add',
          review_reason: null,
          reviewed_by: null,
          reviewed_at: null,
        } as any
      );
      await this.logLessonResourceReviewEvent({
        resourceId,
        actorUserId: subjectUserId,
        fromStatus,
        toStatus: 'approved',
        decision: 'reject',
        note: note || 'Admin đã từ chối yêu cầu xóa - khôi phục tài nguyên',
      });
      return;
    }

    await resourceRepo.update(
      { id: resourceId } as any,
      {
        review_status: toStatus,
        review_reason: decision === 'reject' ? (note || null) : null,
        reviewed_by: subjectUserId,
        reviewed_at: new Date(),
      } as any
    );
    await this.logLessonResourceReviewEvent({
      resourceId,
      actorUserId: subjectUserId,
      fromStatus,
      toStatus,
      decision: decision === 'approve' ? 'approve' : 'reject',
      note: note || null,
    });

    const courseRows = await AppDataSource.query(
      `
      SELECT c.id AS course_id, c.status AS course_status
      FROM lesson_resources r
      INNER JOIN lessons l ON l.id = r.lesson_id
      INNER JOIN modules m ON m.id = l.module_id
      INNER JOIN courses c ON c.id = m.course_id
      WHERE r.id = ?
      LIMIT 1
      `,
      [resourceId]
    );
    const courseId = Number(courseRows?.[0]?.course_id || 0);
    const courseStatus = String(courseRows?.[0]?.course_status || '');
    if (!courseId || courseStatus !== 'pending_review') return;

    const unresolvedRows = await AppDataSource.query(
      `
      SELECT COUNT(1) AS total
      FROM lesson_resources r
      INNER JOIN lessons l ON l.id = r.lesson_id
      INNER JOIN modules m ON m.id = l.module_id
      WHERE m.course_id = ? AND r.review_status IN ('pending', 'rejected')
      `,
      [courseId]
    );
    const unresolvedCount = Number(unresolvedRows?.[0]?.total || 0);
    if (unresolvedCount > 0) return;

    const courseRepo = AppDataSource.getRepository(Course);
    await courseRepo.update(
      { id: courseId } as any,
      { status: 'published' } as any,
    );
    await this.logCourseReviewEvent({
      courseId,
      actorUserId: subjectUserId,
      fromStatus: 'pending_review',
      toStatus: 'published',
      decision: 'approve',
      note: 'Tự động mở khóa khóa học sau khi đã duyệt xong toàn bộ cập nhật.',
    });
  }

  async getLessonResourceReviewTimelineByAdmin(
    subjectUserId: number,
    resourceId: number
  ): Promise<LessonResourceReviewTimelineResult> {
    const admin = await isUserAdmin(subjectUserId);
    if (!admin) throw new Error('Bạn không có quyền thực hiện thao tác này.');
    await ensureCourseWorkflowSchema();

    const rows = await AppDataSource.query(
      `
      SELECT id, resource_id, actor_user_id, from_status, to_status, decision, note, created_at
      FROM lesson_resource_review_events
      WHERE resource_id = ?
      ORDER BY created_at DESC, id DESC
      `,
      [resourceId],
    );
    return {
      resource_id: resourceId,
      items: (rows || []).map((r: any) => ({
        id: Number(r.id),
        resource_id: Number(r.resource_id),
        actor_user_id: Number(r.actor_user_id),
        from_status: r.from_status ?? null,
        to_status: r.to_status,
        decision: r.decision,
        note: r.note ?? null,
        created_at: new Date(r.created_at).toISOString(),
      })),
    };
  }

  async softDeleteMyCourse(subjectUserId: number, courseId: number): Promise<void> {
    await ensureUserIsCourseManager(subjectUserId);
    const courseRepo = AppDataSource.getRepository(Course);
    const enrollmentRepo = AppDataSource.getRepository(CourseEnrollment);
    const course = await courseRepo.findOne({ where: { id: courseId, created_by: subjectUserId } as any });
    if (!course || (course as any).deleted_at) throw new Error('Không tìm thấy khóa học.');

    const enrollmentCount = await enrollmentRepo.count({ where: { course_id: courseId } as any });
    if (enrollmentCount > 0) {
      throw new Error(`Khóa học có ${enrollmentCount} học viên đã đăng ký. Không thể xóa. Vui lòng hủy đăng ký trước.`);
    }

    await courseRepo.softRemove(course);
  }

  async hardDeleteMyCourse(subjectUserId: number, courseId: number): Promise<void> {
    await ensureUserIsCourseManager(subjectUserId);
    const courseRepo = AppDataSource.getRepository(Course);
    const enrollmentRepo = AppDataSource.getRepository(CourseEnrollment);
    const moduleRepo = AppDataSource.getRepository(Module);
    const lessonRepo = AppDataSource.getRepository(Lesson);
    const resourceRepo = AppDataSource.getRepository(LessonResource);

    const course = await courseRepo.findOne({ where: { id: courseId, created_by: subjectUserId } as any });
    if (!course) throw new Error('Không tìm thấy khóa học.');
    if ((course as any).deleted_at) throw new Error('Khóa học đã bị xóa mềm. Không thể xóa vĩnh viễn.');

    const enrollmentCount = await enrollmentRepo.count({ where: { course_id: courseId } as any });
    if (enrollmentCount > 0) {
      throw new Error(`Khóa học có ${enrollmentCount} học viên đã đăng ký. Không thể xóa. Vui lòng hủy đăng ký trước.`);
    }

    await AppDataSource.transaction(async (manager) => {
      const modules = await moduleRepo.find({ where: { course_id: courseId } as any });
      const lessonIds = modules.map((m: any) => m.id);

      if (lessonIds.length > 0) {
        await manager.getRepository(LessonResource).delete({ lesson_id: In(lessonIds) } as any);
        await manager.getRepository(Lesson).delete({ module_id: In(modules.map((m: any) => m.id)) } as any);
      }

      await manager.getRepository(Module).delete({ course_id: courseId } as any);
      await manager.getRepository(Course).delete({ id: courseId } as any);
    });
  }

  private async ensureOwnCourse(subjectUserId: number, courseId: number) {
    const courseRepo = AppDataSource.getRepository(Course);
    const course = await courseRepo.findOne({ where: { id: courseId, created_by: subjectUserId } as any });
    if (!course || (course as any).deleted_at) throw new Error('Không tìm thấy khóa học.');
    return course;
  }

  private async ensureCourseOwnedOrAdmin(subjectUserId: number, courseId: number) {
    const admin = await isUserAdmin(subjectUserId);
    if (admin) {
      const courseRepo = AppDataSource.getRepository(Course);
      const course = await courseRepo.findOne({ where: { id: courseId } as any });
      if (!course || (course as any).deleted_at) throw new Error('Không tìm thấy khóa học.');
      return course;
    }
    return this.ensureOwnCourse(subjectUserId, courseId);
  }

  async getMyCourseContentTree(subjectUserId: number, courseId: number): Promise<CourseContentTree> {
    await ensureUserIsCourseManager(subjectUserId);
    await this.ensureCourseOwnedOrAdmin(subjectUserId, courseId);

    const moduleRepo = AppDataSource.getRepository(Module);
    const lessonRepo = AppDataSource.getRepository(Lesson);
    const resourceRepo = AppDataSource.getRepository(LessonResource);
    const quizRepo = AppDataSource.getRepository(Quiz);
    const quizQuestionRepo = AppDataSource.getRepository(QuizQuestion);
    const assignmentRepo = AppDataSource.getRepository(Assignment);

    const modules = await moduleRepo.find({
      where: { course_id: courseId } as any,
      order: { order_index: 'ASC', id: 'ASC' } as any,
    });

    const moduleIds = (modules as any[]).map((m) => m.id);
    const lessons = moduleIds.length
      ? await lessonRepo
          .createQueryBuilder('l')
          .where('l.module_id IN (:...moduleIds)', { moduleIds })
          .orderBy('l.order_index', 'ASC')
          .addOrderBy('l.id', 'ASC')
          .getMany()
      : [];

    const lessonIds = (lessons as any[]).map((l) => Number((l as any).id)).filter((id) => Number.isFinite(id));
    const resources = lessonIds.length
      ? await resourceRepo.createQueryBuilder('r').where('r.lesson_id IN (:...lessonIds)', { lessonIds }).getMany()
      : [];
    const resourcesByLesson = new Map<number, any[]>();
    for (const r of resources as any[]) {
      const lid = Number((r as any).lesson_id);
      const arr = resourcesByLesson.get(lid) || [];
      arr.push(r);
      resourcesByLesson.set(lid, arr);
    }

    const quizzes = lessonIds.length ? await quizRepo.find({ where: { lesson_id: In(lessonIds) } as any }) : [];
    const quizByLesson = new Map<number, any>();
    for (const q of quizzes as any[]) quizByLesson.set(Number((q as any).lesson_id), q);
    const quizIds = (quizzes as any[]).map((q) => Number((q as any).id)).filter((id) => Number.isFinite(id));
    const quizQuestions = quizIds.length
      ? await quizQuestionRepo.find({
          where: { quiz_id: In(quizIds) } as any,
          relations: ['bankQuestion', 'bankQuestion.options'],
        })
      : [];
    const quizQuestionsByQuizId = new Map<number, any[]>();
    for (const qq of quizQuestions as any[]) {
      const qid = Number((qq as any).quiz_id);
      const arr = quizQuestionsByQuizId.get(qid) || [];
      arr.push(qq);
      quizQuestionsByQuizId.set(qid, arr);
    }

    const assignments = lessonIds.length
      ? await assignmentRepo.find({ where: { lesson_id: In(lessonIds) } as any, order: { id: 'DESC' } as any })
      : [];
    const assignmentByLesson = new Map<number, any>();
    for (const a of assignments as any[]) {
      const lid = Number((a as any).lesson_id);
      if (!assignmentByLesson.has(lid)) assignmentByLesson.set(lid, a);
    }

    const attachFlagsTree = await this.loadLessonAttachmentFlags((lessons as any[]).map((l) => Number(l.id)));
    const lessonByModule = new Map<number, CourseLessonItem[]>();
    for (const l of lessons as any[]) {
      const lid = Number(l.id);
      const arr = lessonByModule.get(l.module_id) || [];
      const lessonType = String((l as any).lesson_type || 'text');
      const lessonResources = resourcesByLesson.get(lid) || [];
      let qualityIssue: string | null = null;

      if (lessonType === 'quiz') {
        const MIN_QUIZ_QUESTIONS = 3;
        const quiz = quizByLesson.get(lid);
        if (!quiz) {
          qualityIssue = 'Bài quiz chưa có bộ câu hỏi.';
        } else {
          const qRows = quizQuestionsByQuizId.get(Number((quiz as any).id)) || [];
          if (qRows.length < MIN_QUIZ_QUESTIONS) {
            qualityIssue = `Quiz cần ít nhất ${MIN_QUIZ_QUESTIONS} câu hỏi.`;
          } else {
            for (let idx = 0; idx < qRows.length; idx += 1) {
              const row = qRows[idx];
              const qText = String((row as any)?.bankQuestion?.question_text || '').trim();
              if (!qText) {
                qualityIssue = `Câu ${idx + 1} đang trống nội dung.`;
                break;
              }
              const optsRaw = Array.isArray((row as any)?.bankQuestion?.options) ? (row as any).bankQuestion.options : [];
              const opts = optsRaw.map((o: any) => ({
                text: String(o?.option_text || '').trim(),
                isCorrect: Boolean(o?.is_correct),
              }));
              if (opts.length < 2) {
                qualityIssue = `Câu ${idx + 1} chưa đủ lựa chọn.`;
                break;
              }
              if (opts.some((o: any) => !o.text)) {
                qualityIssue = `Câu ${idx + 1} có đáp án rỗng.`;
                break;
              }
              const normalizedSet = new Set(opts.map((o: any) => normalizeTextForCompare(o.text)));
              if (normalizedSet.size !== opts.length) {
                qualityIssue = `Câu ${idx + 1} có đáp án bị trùng.`;
                break;
              }
              const correctCount = opts.filter((o: any) => o.isCorrect).length;
              if (correctCount !== 1) {
                qualityIssue = `Câu ${idx + 1} cần đúng 1 đáp án chính xác.`;
                break;
              }
            }
          }
        }
      } else if (lessonType === 'assignment') {
        const MIN_FILE_PROMPT_DESC_LENGTH = 20;
        const assignment = assignmentByLesson.get(lid);
        if (!assignment) {
          qualityIssue = 'Bài tập chưa được cấu hình.';
        } else {
          const title = String((assignment as any).title || '').trim();
          const description = stripHtmlToText(String((assignment as any).description || ''));
          const instructions = stripHtmlToText(String((assignment as any).instructions || ''));
          const formats = safeJsonParse<any[]>((assignment as any).submission_format, []);
          const hasSubmissionCriteria = instructions.length > 0 || (Array.isArray(formats) && formats.length > 0);
          const kind = String((assignment as any).assignment_kind || 'file_prompt') === 'short_answer' ? 'short_answer' : 'file_prompt';
          if (!title) qualityIssue = 'Bài tập thiếu tiêu đề.';
          else if (!description && kind !== 'short_answer') qualityIssue = 'Bài tập thiếu mô tả yêu cầu.';
          else if (!hasSubmissionCriteria) qualityIssue = 'Bài tập thiếu tiêu chí nộp bài.';
          else if (kind === 'short_answer') {
            const shortQuestions = safeJsonParse<any[]>((assignment as any).short_answer_questions, []);
            const validShortQuestions = shortQuestions.filter((q: any) => String(q?.question_text || '').trim().length > 0);
            if (validShortQuestions.length < 1) {
              qualityIssue = 'Bài tập trả lời ngắn cần ít nhất 1 câu hỏi.';
            }
          } else if (description.length < MIN_FILE_PROMPT_DESC_LENGTH) {
            qualityIssue = `Bài tập tự luận cần mô tả rõ hơn (>= ${MIN_FILE_PROMPT_DESC_LENGTH} ký tự).`;
          }
        }
      } else {
        const MIN_RICH_TEXT_CONTENT_LENGTH = 30;
        const hasVideo = lessonResources.some((r) => {
          const kind = classifyResourceKind({
            mime_type: (r as any).mime_type,
            filename: (r as any).filename,
            url: (r as any).url,
          });
          const mime = String((r as any).mime_type || '').toLowerCase();
          return kind === 'video' || kind === 'youtube' || mime.startsWith('video/');
        });
        const hasHtmlContent = lessonResources.some((r) => {
          const mime = String((r as any).mime_type || '').toLowerCase();
          const size = Number((r as any).size_bytes ?? 0);
          return mime.includes('text/html') && size >= MIN_RICH_TEXT_CONTENT_LENGTH;
        });
        const hasAttachment = lessonResources.some((r) => {
          const kind = classifyResourceKind({
            mime_type: (r as any).mime_type,
            filename: (r as any).filename,
            url: (r as any).url,
          });
          return kind === 'pdf' || kind === 'word' || kind === 'other';
        });
        if (!hasVideo && !hasHtmlContent && !hasAttachment) {
          qualityIssue = 'Bài học chưa có nội dung hợp lệ (video/rich text/tài liệu).';
        }
      }

      arr.push({
        id: l.id,
        module_id: l.module_id,
        title: l.title,
        description: l.description ?? null,
        lesson_type: (l.lesson_type || 'text') as LessonType,
        order_index: l.order_index,
        open_at: l.open_at ? new Date(l.open_at).toISOString() : null,
        is_published: Boolean(l.is_published),
        has_quiz: attachFlagsTree.hasQuiz.has(lid),
        has_assignment: attachFlagsTree.hasAssignment.has(lid),
        quality_status: qualityIssue ? 'needs_fix' : 'ok',
        quality_issue: qualityIssue,
      });
      lessonByModule.set(l.module_id, arr);
    }

    const moduleItems: CourseModuleItem[] = (modules as any[]).map((m) => ({
      id: m.id,
      course_id: m.course_id,
      title: m.title,
      description: m.description ?? null,
      order_index: m.order_index,
      open_at: m.open_at ? new Date(m.open_at).toISOString() : null,
      is_published: Boolean(m.is_published),
      lessons: lessonByModule.get(m.id) || [],
    }));

    return {
      course_id: courseId,
      modules: moduleItems,
    };
  }

  async createModule(subjectUserId: number, courseId: number, request: CreateModuleRequest): Promise<{ id: number }> {
    await ensureUserIsCourseManager(subjectUserId);
    const ownCourse = await this.ensureOwnCourse(subjectUserId, courseId);
    this.ensureCourseEditableForTeacher(ownCourse);

    const moduleRepo = AppDataSource.getRepository(Module);
    const last = await moduleRepo.findOne({ where: { course_id: courseId } as any, order: { order_index: 'DESC' } as any });
    const nextOrder = last ? Number((last as any).order_index) + 1 : 1;

    const mod = moduleRepo.create({
      course_id: courseId,
      title: request.title,
      description: request.description ?? null,
      order_index: nextOrder,
      is_published: true,
      open_at: parseNullableDateTime((request as any)?.open_at),
    } as any);
    const saved = await moduleRepo.save(mod as any);
    return { id: (saved as any).id };
  }

  async updateModule(subjectUserId: number, courseId: number, moduleId: number, request: UpdateModuleRequest): Promise<void> {
    await ensureUserIsCourseManager(subjectUserId);
    const ownCourse = await this.ensureOwnCourse(subjectUserId, courseId);
    this.ensureCourseEditableForTeacher(ownCourse);

    const moduleRepo = AppDataSource.getRepository(Module);
    const mod = await moduleRepo.findOne({ where: { id: moduleId, course_id: courseId } as any });
    if (!mod) throw new Error('Không tìm thấy module.');
    if (request.title != null) (mod as any).title = request.title;
    if ('description' in request) (mod as any).description = request.description ?? null;
    if ('open_at' in request) (mod as any).open_at = parseNullableDateTime((request as any)?.open_at);
    if ('is_published' in request) (mod as any).is_published = Boolean((request as any).is_published);
    await moduleRepo.save(mod as any);
  }

  async deleteModule(subjectUserId: number, courseId: number, moduleId: number): Promise<void> {
    await ensureUserIsCourseManager(subjectUserId);
    const ownCourse = await this.ensureOwnCourse(subjectUserId, courseId);
    this.ensureCourseEditableForTeacher(ownCourse);
    const moduleRepo = AppDataSource.getRepository(Module);
    const mod = await moduleRepo.findOne({ where: { id: moduleId, course_id: courseId } as any });
    if (!mod) throw new Error('Không tìm thấy module.');

    await AppDataSource.transaction(async (manager) => {
      await manager.getRepository(Lesson).delete({ module_id: moduleId } as any);
      await manager.getRepository(Module).delete({ id: moduleId } as any);
    });
  }

  async createLesson(subjectUserId: number, courseId: number, moduleId: number, request: CreateLessonRequest): Promise<{ id: number }> {
    await ensureUserIsCourseManager(subjectUserId);
    const ownCourse = await this.ensureOwnCourse(subjectUserId, courseId);
    this.ensureCourseEditableForTeacher(ownCourse);

    const moduleRepo = AppDataSource.getRepository(Module);
    const mod = await moduleRepo.findOne({ where: { id: moduleId, course_id: courseId } as any });
    if (!mod) throw new Error('Không tìm thấy module.');

    const lessonRepo = AppDataSource.getRepository(Lesson);
    const last = await lessonRepo.findOne({ where: { module_id: moduleId } as any, order: { order_index: 'DESC' } as any });
    const nextOrder = last ? Number((last as any).order_index) + 1 : 1;

    const lt = request.lesson_type || 'text';
    const lesson = lessonRepo.create({
      module_id: moduleId,
      title: request.title,
      description: request.description ?? null,
      lesson_type: lt,
      open_at: parseNullableDateTime((request as any)?.open_at) ?? null,
      order_index: nextOrder,
      is_published: true,
      is_free_preview: false,
      duration_minutes: null,
    } as any);

    const saved = await lessonRepo.save(lesson as any);
    return { id: (saved as any).id };
  }

  async updateLesson(subjectUserId: number, courseId: number, lessonId: number, request: UpdateLessonRequest): Promise<void> {
    await ensureUserIsCourseManager(subjectUserId);
    const ownCourse = await this.ensureOwnCourse(subjectUserId, courseId);
    await this.ensureCanEditRejectedResourceWhilePendingReview(ownCourse, { lessonId });

    const lessonRepo = AppDataSource.getRepository(Lesson);
    const moduleRepo = AppDataSource.getRepository(Module);
    const lesson = await lessonRepo.findOne({ where: { id: lessonId } as any });
    if (!lesson) throw new Error('Không tìm thấy bài học.');

    const mod = await moduleRepo.findOne({ where: { id: (lesson as any).module_id, course_id: courseId } as any });
    if (!mod) throw new Error('Không tìm thấy bài học.');

    if (request.title != null) (lesson as any).title = request.title;
    if ('description' in request) (lesson as any).description = request.description ?? null;
    if (request.lesson_type != null) {
      (lesson as any).lesson_type = request.lesson_type;
    }
    if ('open_at' in request) (lesson as any).open_at = parseNullableDateTime((request as any)?.open_at) ?? null;
    if ('is_published' in request) (lesson as any).is_published = Boolean((request as any).is_published);
    await lessonRepo.save(lesson as any);
  }

  async deleteLesson(subjectUserId: number, courseId: number, lessonId: number): Promise<void> {
    await ensureUserIsCourseManager(subjectUserId);
    const ownCourse = await this.ensureOwnCourse(subjectUserId, courseId);
    this.ensureCourseEditableForTeacher(ownCourse);

    const lessonRepo = AppDataSource.getRepository(Lesson);
    const moduleRepo = AppDataSource.getRepository(Module);
    const lesson = await lessonRepo.findOne({ where: { id: lessonId } as any });
    if (!lesson) throw new Error('Không tìm thấy bài học.');
    const mod = await moduleRepo.findOne({ where: { id: (lesson as any).module_id, course_id: courseId } as any });
    if (!mod) throw new Error('Không tìm thấy bài học.');
    await AppDataSource.transaction(async (manager) => {
      const quizRepo = manager.getRepository(Quiz);
      const qqRepo = manager.getRepository(QuizQuestion);
      const qOptRepo = manager.getRepository(QuestionOption);
      const attemptRepo = manager.getRepository(QuizAttempt);
      const respRepo = manager.getRepository(QuizResponse);
      const roRepo = manager.getRepository(QuizResponseOption);
      const assignmentRepo = manager.getRepository(Assignment);
      const resourceRepo = manager.getRepository(LessonResource);
      const progressRepo = manager.getRepository(LessonProgress);
      const completionRepo = manager.getRepository(LessonCompletion);
      const lessonRepoTx = manager.getRepository(Lesson);

      const quiz = await quizRepo.findOne({ where: { lesson_id: lessonId } as any });
      if (quiz) {
        const quizId = Number((quiz as any).id);
        const maps = await qqRepo.find({ where: { quiz_id: quizId } as any });
        const qqIds = (maps as any[]).map((m) => Number((m as any).id)).filter((id) => id > 0);

        const attempts = await attemptRepo.find({ where: { quiz_id: quizId } as any });
        const attemptIds = (attempts as any[]).map((a) => Number((a as any).id)).filter((id) => id > 0);

        if (attemptIds.length) {
          const responses = await respRepo.find({ where: { attempt_id: In(attemptIds) } as any });
          const responseIds = (responses as any[]).map((r) => Number((r as any).id)).filter((id) => id > 0);
          if (responseIds.length) {
            await roRepo.delete({ response_id: In(responseIds) } as any);
          }
          await respRepo.delete({ attempt_id: In(attemptIds) } as any);
          await attemptRepo.delete({ id: In(attemptIds) } as any);
        }

        if (qqIds.length) {
          await qOptRepo.delete({ quiz_question_id: In(qqIds) } as any);
        }
        await qqRepo.delete({ quiz_id: quizId } as any);
        await quizRepo.delete({ id: quizId } as any);
      }

      await assignmentRepo.delete({ lesson_id: lessonId } as any);
      await resourceRepo.delete({ lesson_id: lessonId } as any);
      await progressRepo.delete({ lesson_id: lessonId } as any);
      await completionRepo.delete({ lesson_id: lessonId } as any);
      await lessonRepoTx.delete({ id: lessonId } as any);
    });
  }

  async reorderCourseContent(subjectUserId: number, courseId: number, request: ReorderCourseContentRequest): Promise<void> {
    await ensureUserIsCourseManager(subjectUserId);
    const ownCourse = await this.ensureOwnCourse(subjectUserId, courseId);
    this.ensureCourseEditableForTeacher(ownCourse);

    await AppDataSource.transaction(async (manager) => {
      const moduleRepo = manager.getRepository(Module);
      const lessonRepo = manager.getRepository(Lesson);

      if (Array.isArray(request.modules) && request.modules.length) {
        const ids = request.modules.map((m) => m.id);
        const dbModules = await moduleRepo.findByIds(ids as any);
        for (const m of dbModules as any[]) {
          if (m.course_id !== courseId) throw new Error('Module không hợp lệ.');
        }
        for (const m of request.modules) {
          await moduleRepo.update({ id: m.id } as any, { order_index: m.order_index } as any);
        }
      }

      if (Array.isArray(request.lessons) && request.lessons.length) {
        const lessonIds = request.lessons.map((l) => l.id);
        const dbLessons = await lessonRepo.findByIds(lessonIds as any);

        const moduleIds = Array.from(new Set(request.lessons.map((l) => l.module_id)));
        const dbTargetModules = moduleIds.length ? await moduleRepo.findByIds(moduleIds as any) : [];
        const validModuleSet = new Set<number>();
        for (const m of dbTargetModules as any[]) {
          if (m.course_id !== courseId) throw new Error('Module đích không hợp lệ.');
          validModuleSet.add(m.id);
        }

        for (const l of dbLessons as any[]) {
          const ownerMod = await moduleRepo.findOne({ where: { id: l.module_id, course_id: courseId } as any });
          if (!ownerMod) throw new Error('Bài học không hợp lệ.');
        }

        for (const l of request.lessons) {
          if (!validModuleSet.has(l.module_id)) throw new Error('Module đích không hợp lệ.');
          await lessonRepo.update(
            { id: l.id } as any,
            { module_id: l.module_id, order_index: l.order_index } as any
          );
        }
      }
    });
  }

  async listLessonResources(subjectUserId: number, courseId: number, lessonId: number): Promise<LessonResourceItem[]> {
    await this.ensureCanViewCourseResources(subjectUserId, courseId);
    await this.ensureCanAccessLesson(subjectUserId, courseId, lessonId);

    const lessonRepo = AppDataSource.getRepository(Lesson);
    const moduleRepo = AppDataSource.getRepository(Module);
    const resourceRepo = AppDataSource.getRepository(LessonResource);

    const lesson = await lessonRepo.findOne({ where: { id: lessonId } as any });
    if (!lesson) throw new Error('Không tìm thấy bài học.');
    const mod = await moduleRepo.findOne({ where: { id: (lesson as any).module_id, course_id: courseId } as any });
    if (!mod) throw new Error('Không tìm thấy bài học.');

    const isManager = await isUserCourseManager(subjectUserId);
    const isAdmin = await isUserAdmin(subjectUserId);

    const where: any = { lesson_id: lessonId };
    if (!isManager && !isAdmin) {
      where.review_status = 'approved';
    }

    const resources = await resourceRepo.find({
      where,
      order: { created_at: 'DESC', id: 'DESC' } as any,
    });

    const resourceIds = (resources as any[]).map((r) => Number(r.id)).filter((id) => Number.isFinite(id));
    const lastEventByResource = new Map<number, any>();
    const lastRejectByResource = new Map<number, any>();
    if (resourceIds.length) {
      const lastRows = await AppDataSource.query(
        `
        SELECT e.resource_id, e.decision, e.note, e.from_status, e.to_status, e.created_at
        FROM lesson_resource_review_events e
        INNER JOIN (
          SELECT resource_id, MAX(id) AS max_id
          FROM lesson_resource_review_events
          WHERE resource_id IN (${resourceIds.map(() => '?').join(',')})
          GROUP BY resource_id
        ) latest ON latest.max_id = e.id
        `,
        resourceIds
      );
      for (const row of lastRows || []) lastEventByResource.set(Number(row.resource_id), row);

      const rejectRows = await AppDataSource.query(
        `
        SELECT e.resource_id, e.note, e.created_at
        FROM lesson_resource_review_events e
        INNER JOIN (
          SELECT resource_id, MAX(id) AS max_reject_id
          FROM lesson_resource_review_events
          WHERE decision = 'reject' AND resource_id IN (${resourceIds.map(() => '?').join(',')})
          GROUP BY resource_id
        ) latest_reject ON latest_reject.max_reject_id = e.id
        `,
        resourceIds
      );
      for (const row of rejectRows || []) lastRejectByResource.set(Number(row.resource_id), row);
    }

    return (resources as any[]).map((r) => ({
      ...((): any => {
        const lastEvt = lastEventByResource.get(Number(r.id));
        const lastReject = lastRejectByResource.get(Number(r.id));
        const isResubmitted = !!lastEvt && (lastEvt.decision === 'resubmit' || (lastEvt.from_status === 'rejected' && lastEvt.to_status === 'pending'));
        return {
          is_resubmitted: isResubmitted,
          last_review_decision: lastEvt?.decision ?? null,
          last_review_note: lastEvt?.note ?? null,
          last_reviewed_at: lastEvt?.created_at ? new Date(lastEvt.created_at).toISOString() : null,
          previous_rejected_reason: lastReject?.note ?? null,
        };
      })(),
      id: r.id,
      lesson_id: r.lesson_id,
      resource_type: ((r as any).resource_kind === 'video' || (r as any).resource_kind === 'youtube' || ((r as any).mime_type || '').toLowerCase().startsWith('video/')) ? 'video' : 'file',
      resource_kind: r.resource_kind ?? classifyResourceKind({ mime_type: r.mime_type, filename: r.filename, url: r.url }),
      url:
        r.url && !String(r.url).startsWith('internal://')
          ? getSignedDeliveryUrl(r.url)
          : r.url,
      filename: r.filename ?? null,
      mime_type: r.mime_type ?? null,
      size_bytes: r.size_bytes ?? null,
      preview_url: (r as any).preview_url ? getSignedDeliveryUrl((r as any).preview_url) : null,
      review_status: (r as any).review_status ?? 'pending',
      review_reason: (r as any).review_reason ?? null,
      reviewed_by: (r as any).reviewed_by != null ? Number((r as any).reviewed_by) : null,
      reviewed_at: (r as any).reviewed_at ? new Date((r as any).reviewed_at).toISOString() : null,
      created_at: new Date(r.created_at).toISOString(),
    }));
  }

  async createLessonFileResource(
    subjectUserId: number,
    courseId: number,
    lessonId: number,
    file: { filename: string; mime_type: string; size_bytes: number; url: string }
  ): Promise<{ id: number }> {
    await ensureUserIsCourseManager(subjectUserId);
    const ownCourse = await this.ensureOwnCourse(subjectUserId, courseId);
    await this.ensureCanEditRejectedResourceWhilePendingReview(ownCourse, { lessonId });

    const lessonRepo = AppDataSource.getRepository(Lesson);
    const moduleRepo = AppDataSource.getRepository(Module);
    const resourceRepo = AppDataSource.getRepository(LessonResource);
    const reviewEventRepo = AppDataSource.getRepository(LessonResourceReviewEvent);

    const lesson = await lessonRepo.findOne({ where: { id: lessonId } as any });
    if (!lesson) throw new Error('Không tìm thấy bài học.');
    const mod = await moduleRepo.findOne({ where: { id: (lesson as any).module_id, course_id: courseId } as any });
    if (!mod) throw new Error('Không tìm thấy bài học.');

    const filename = String(file.filename || '').trim();
    const mimeType = String(file.mime_type || '').toLowerCase().trim();
    if (!filename) throw new Error('Tên file không hợp lệ.');
    if (!mimeType) throw new Error('MIME type không hợp lệ.');

    const resourceKind = classifyResourceKind({ mime_type: mimeType, filename, url: file.url });
    const ext = getFilenameExtension(filename);
    const allowedVideoExt = ['mp4', 'webm', 'mov', 'm4v', 'avi', 'mkv', 'ogg'];
    const isPdf = resourceKind === 'pdf';
    const isWord = resourceKind === 'word';
    const isVideo = resourceKind === 'video';
    const isHtml = mimeType === 'text/html' && ext === 'html';

    if (isPdf) {
      if (mimeType !== 'application/pdf' || ext !== 'pdf') {
        throw new Error('File PDF không hợp lệ.');
      }
    } else if (isWord) {
      const validWordMime =
        mimeType === 'application/msword' ||
        mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      if (!validWordMime || !['doc', 'docx'].includes(ext)) {
        throw new Error('File Word không hợp lệ.');
      }
    } else if (isVideo) {
      if (!mimeType.startsWith('video/') || !allowedVideoExt.includes(ext)) {
        throw new Error('File video không hợp lệ.');
      }
    } else if (isHtml) {
      // Rich text lesson notes are uploaded as .html files.
    } else {
      throw new Error('Chỉ hỗ trợ tài nguyên PDF, Word, HTML hoặc video.');
    }

    const isImage = file.mime_type && file.mime_type.startsWith('image/');

    const existingResources = await resourceRepo.find({
      where: { lesson_id: lessonId } as any,
      order: { id: 'DESC' } as any,
    });
    const isStructuredMarker = (row: any) => String((row as any)?.url || '').startsWith(`internal://lesson/${lessonId}/`);
    const pickRejectedFirst = (rows: any[]) => rows.find((r) => String((r as any).review_status || '') === 'rejected') || rows[0] || null;

    let targetToUpdate: any = null;
    if (isHtml) {
      const htmlRows = (existingResources as any[]).filter(
        (r) => !isStructuredMarker(r) && String((r as any).mime_type || '').toLowerCase().includes('text/html')
      );
      targetToUpdate = pickRejectedFirst(htmlRows);
    } else if (isWord || isPdf) {
      const sameKindRows = (existingResources as any[]).filter(
        (r) => !isStructuredMarker(r) && String((r as any).resource_kind || 'other') === resourceKind
      );
      targetToUpdate = pickRejectedFirst(sameKindRows);
    }

    if (targetToUpdate) {
      const fromStatus = String((targetToUpdate as any).review_status || 'pending') as 'pending' | 'approved' | 'rejected';
      await resourceRepo.update(
        { id: Number((targetToUpdate as any).id) } as any,
        {
          url: file.url,
          filename,
          mime_type: mimeType,
          size_bytes: file.size_bytes,
          preview_url: isImage ? file.url : null,
          resource_kind: resourceKind,
          review_status: 'pending',
          review_decision: 'update',
          review_reason: null,
          reviewed_by: null,
          reviewed_at: null,
        } as any
      );
      await reviewEventRepo.save(
        reviewEventRepo.create({
          resource_id: Number((targetToUpdate as any).id),
          actor_user_id: subjectUserId,
          from_status: fromStatus,
          to_status: 'pending',
          decision: fromStatus === 'rejected' ? 'resubmit' : 'submit',
          note: null,
        } as any)
      );
      return { id: Number((targetToUpdate as any).id) };
    }

    const entity = resourceRepo.create({
      lesson_id: lessonId,
      resource_type: 'file',
      url: file.url,
      filename,
      mime_type: mimeType,
      size_bytes: file.size_bytes,
      preview_url: isImage ? file.url : null,
      resource_kind: resourceKind,
      review_status: 'pending',
      review_decision: 'add',
      review_reason: null,
      reviewed_by: null,
      reviewed_at: null,
    } as any);
    const saved = await resourceRepo.save(entity as any);
    await reviewEventRepo.save(
      reviewEventRepo.create({
        resource_id: Number((saved as any).id),
        actor_user_id: subjectUserId,
        from_status: null,
        to_status: 'pending',
        decision: 'submit',
        note: null,
      } as any)
    );
    // Trigger STT for uploaded videos
    const isVideoFile = mimeType.startsWith('video/') || resourceKind === 'video';
    if (this.aiSummaryService && isVideoFile) {
      await (this.aiSummaryService as any).upsertUploadedVideoTranscriptCache(lessonId, file.url);
    }
    return { id: (saved as any).id };
  }

  async updateLessonResourcePreview(
    subjectUserId: number,
    courseId: number,
    resourceId: number,
    file: { filename: string; mime_type: string; size_bytes: number; url: string }
  ): Promise<void> {
    await ensureUserIsCourseManager(subjectUserId);
    const ownCourse = await this.ensureOwnCourse(subjectUserId, courseId);
    await this.ensureCanEditRejectedResourceWhilePendingReview(ownCourse, { resourceId });

    const resourceRepo = AppDataSource.getRepository(LessonResource);
    const lessonRepo = AppDataSource.getRepository(Lesson);
    const moduleRepo = AppDataSource.getRepository(Module);

    const resource = await resourceRepo.findOne({ where: { id: resourceId } as any });
    if (!resource) throw new Error('Không tìm thấy tài nguyên.');

    const lesson = await lessonRepo.findOne({ where: { id: (resource as any).lesson_id } as any });
    if (!lesson) throw new Error('Không tìm thấy tài nguyên.');
    const mod = await moduleRepo.findOne({ where: { id: (lesson as any).module_id, course_id: courseId } as any });
    if (!mod) throw new Error('Không tìm thấy tài nguyên.');

    const isImage = file.mime_type && file.mime_type.startsWith('image/');
    if (!isImage) throw new Error('Thumbnail phải là file ảnh.');

    await resourceRepo.update({ id: resourceId } as any, { preview_url: file.url } as any);
  }

  async deleteLessonResource(subjectUserId: number, courseId: number, resourceId: number): Promise<void> {
    await ensureUserIsCourseManager(subjectUserId);
    const ownCourse = await this.ensureOwnCourse(subjectUserId, courseId);
    await this.ensureCanEditRejectedResourceWhilePendingReview(ownCourse, { resourceId });

    const resourceRepo = AppDataSource.getRepository(LessonResource);
    const reviewEventRepo = AppDataSource.getRepository(LessonResourceReviewEvent);
    const lessonRepo = AppDataSource.getRepository(Lesson);
    const moduleRepo = AppDataSource.getRepository(Module);

    const resource = await resourceRepo.findOne({ where: { id: resourceId } as any });
    if (!resource) throw new Error('Không tìm thấy tài nguyên.');

    const lesson = await lessonRepo.findOne({ where: { id: (resource as any).lesson_id } as any });
    if (!lesson) throw new Error('Không tìm thấy tài nguyên.');
    const mod = await moduleRepo.findOne({ where: { id: (lesson as any).module_id, course_id: courseId } as any });
    if (!mod) throw new Error('Không tìm thấy tài nguyên.');

    const courseStatus = String((ownCourse as any)?.status || '');
    const currentReviewStatus = String((resource as any).review_status || 'approved');

    if (courseStatus === 'published') {
      const fromStatus = currentReviewStatus as 'pending' | 'approved' | 'rejected';
      await resourceRepo.update(
        { id: resourceId } as any,
        {
          review_status: 'pending',
          review_decision: 'delete',
          review_reason: null,
          reviewed_by: null,
          reviewed_at: null,
        } as any
      );
      await reviewEventRepo.save(
        reviewEventRepo.create({
          resource_id: resourceId,
          actor_user_id: subjectUserId,
          from_status: fromStatus,
          to_status: 'pending',
          decision: 'submit',
          note: 'Yêu cầu xóa tài nguyên - đang chờ admin duyệt',
        } as any)
      );
      return;
    }

    await resourceRepo.delete({ id: resourceId } as any);
  }

  async getLessonResourceViewUrl(
    subjectUserId: number,
    courseId: number,
    resourceId: number
  ): Promise<{ url: string; mime_type: string | null; filename: string | null }> {
    await this.ensureCanViewCourseResources(subjectUserId, courseId);

    const resourceRepo = AppDataSource.getRepository(LessonResource);
    const lessonRepo = AppDataSource.getRepository(Lesson);
    const moduleRepo = AppDataSource.getRepository(Module);

    const resource = await resourceRepo.findOne({ where: { id: resourceId } as any });
    if (!resource) throw new Error('Không tìm thấy tài nguyên.');

    const lesson = await lessonRepo.findOne({ where: { id: (resource as any).lesson_id } as any });
    if (!lesson) throw new Error('Không tìm thấy tài nguyên.');
    const mod = await moduleRepo.findOne({ where: { id: (lesson as any).module_id, course_id: courseId } as any });
    if (!mod) throw new Error('Không tìm thấy tài nguyên.');

    const isManager = await isUserCourseManager(subjectUserId);
    if (!isManager && String((resource as any).review_status || 'pending') !== 'approved') {
      throw new Error('Tài nguyên này đang chờ duyệt hoặc đã bị từ chối.');
    }

    await this.ensureCanAccessLesson(subjectUserId, courseId, (lesson as any).id);

    const url = (resource as any).url;
    const signedUrl = getSignedDeliveryUrl(url);
    return {
      url: signedUrl,
      mime_type: (resource as any).mime_type ?? null,
      filename: (resource as any).filename ?? null,
    };
  }

  /**
   * Course resources (lesson files/videos) phải được phép cho:
   * - học viên đã enroll course
   * - hoặc người quản lý khóa học (teacher/admin/course_manager) và là owner của khóa
   */
  private async ensureCanViewCourseResources(subjectUserId: number, courseId: number) {
    const isManager = await isUserCourseManager(subjectUserId);
    if (isManager) {
      await this.ensureCourseOwnedOrAdmin(subjectUserId, courseId);
      return;
    }

    const enrollmentRepo = AppDataSource.getRepository(CourseEnrollment);
    const enrollment = await enrollmentRepo.findOne({
      where: { user_id: subjectUserId, course_id: courseId } as any,
    });
    if (!enrollment) {
      throw new Error('Bạn chưa đăng ký khóa học này.');
    }
  }

  async createLessonYoutubeResource(
    subjectUserId: number,
    courseId: number,
    lessonId: number,
    request: { youtube_url: string; title?: string | null }
  ): Promise<{ id: number }> {
    await ensureUserIsCourseManager(subjectUserId);
    const ownCourse = await this.ensureOwnCourse(subjectUserId, courseId);
    await this.ensureCanEditRejectedResourceWhilePendingReview(ownCourse, { lessonId });

    const lessonRepo = AppDataSource.getRepository(Lesson);
    const moduleRepo = AppDataSource.getRepository(Module);
    const resourceRepo = AppDataSource.getRepository(LessonResource);

    const lesson = await lessonRepo.findOne({ where: { id: lessonId } as any });
    if (!lesson) throw new Error('Không tìm thấy bài học.');
    const mod = await moduleRepo.findOne({ where: { id: (lesson as any).module_id, course_id: courseId } as any });
    if (!mod) throw new Error('Không tìm thấy bài học.');

    const rawUrl = String(request.youtube_url || '').trim();
    if (!rawUrl) throw new Error('Vui lòng nhập link YouTube.');
    const videoId = parseYoutubeVideoId(rawUrl);
    if (!videoId) throw new Error('Link YouTube không hợp lệ.');
    const embedUrl = buildYoutubeEmbedUrl(videoId);

    const entity = resourceRepo.create({
      lesson_id: lessonId,
      resource_type: 'video',
      url: embedUrl,
      filename: request.title ? String(request.title) : null,
      mime_type: null,
      size_bytes: null,
      preview_url: null,
      resource_kind: 'youtube',
      review_status: 'pending',
      review_decision: 'add',
      review_reason: null,
      reviewed_by: null,
      reviewed_at: null,
    } as any);
    const saved = await resourceRepo.save(entity as any);
    await AppDataSource.getRepository(LessonResourceReviewEvent).save(
      AppDataSource.getRepository(LessonResourceReviewEvent).create({
        resource_id: Number((saved as any).id),
        actor_user_id: subjectUserId,
        from_status: null,
        to_status: 'pending',
        decision: 'submit',
        note: `youtube:${videoId}`,
      } as any)
    );
    // Pre-extract transcript right after teacher adds YouTube resource, so learner summary job can reuse cache.
    if (this.aiSummaryService) {
      await (this.aiSummaryService as any).upsertYoutubeTranscriptCache(lessonId, videoId, embedUrl);
    }
    return { id: Number((saved as any).id) };
  }

  async getManualQuizForLesson(
    subjectUserId: number,
    courseId: number,
    lessonId: number
  ): Promise<ManualQuizDetailResult | null> {
    await ensureUserIsCourseManager(subjectUserId);
    await this.ensureCourseOwnedOrAdmin(subjectUserId, courseId);

    const lessonRepo = AppDataSource.getRepository(Lesson);
    const moduleRepo = AppDataSource.getRepository(Module);
    const quizRepo = AppDataSource.getRepository(Quiz);
    const qqRepo = AppDataSource.getRepository(QuizQuestion);

    const lesson = await lessonRepo.findOne({ where: { id: lessonId } as any });
    if (!lesson) throw new Error('Không tìm thấy bài học.');
    const mod = await moduleRepo.findOne({ where: { id: (lesson as any).module_id, course_id: courseId } as any });
    if (!mod) throw new Error('Không tìm thấy bài học.');

    const quiz = await quizRepo.findOne({ where: { lesson_id: lessonId } as any });
    if (!quiz) return null;

    const maps = await qqRepo.find({
      where: { quiz_id: (quiz as any).id } as any,
      order: { order_index: 'ASC' } as any,
      relations: ['bankQuestion', 'bankQuestion.options'],
    });

    const questions = (maps as any[]).map((m) => {
      const bq = m.bankQuestion;
      const opts = (bq?.options || []) as any[];
      const sortedOpts = [...opts].sort(
        (a, b) => Number(a.order_index ?? 0) - Number(b.order_index ?? 0)
      );
      return {
        order_index: Number(m.order_index),
        points: Number(m.points ?? bq?.points ?? 1),
        question_type: String(bq?.question_type || 'multiple_choice'),
        question_text: String(bq?.question_text || ''),
        explanation: bq?.explanation ?? null,
        difficulty: String(bq?.difficulty || 'medium'),
        options: sortedOpts.map((o: any) => ({
          option_text: String(o.option_text || ''),
          is_correct: Boolean(o.is_correct),
          order_index: Number(o.order_index ?? 0),
        })),
      };
    });

    return {
      quiz_id: Number((quiz as any).id),
      lesson_id: lessonId,
      title: String((quiz as any).title || ''),
      description: (quiz as any).description ?? null,
      time_limit_minutes:
        (quiz as any).time_limit_minutes != null ? Number((quiz as any).time_limit_minutes) : null,
      passing_score: (quiz as any).passing_score != null ? Number((quiz as any).passing_score) : null,
      max_attempts: Number((quiz as any).max_attempts ?? 1),
      shuffle_questions: Boolean((quiz as any).shuffle_questions),
      shuffle_options: Boolean((quiz as any).shuffle_options),
      show_results_immediately: (quiz as any).show_results_immediately !== false,
      show_correct_answers: (quiz as any).show_correct_answers !== false,
      questions,
    };
  }

  async upsertManualQuizForLesson(
    subjectUserId: number,
    courseId: number,
    lessonId: number,
    request: ManualQuizUpsertRequest
  ): Promise<{ quiz_id: number }> {
    await ensureUserIsCourseManager(subjectUserId);
    const ownCourse = await this.ensureOwnCourse(subjectUserId, courseId);
    await this.ensureCanEditRejectedResourceWhilePendingReview(ownCourse, { lessonId, markerPrefix: 'quiz' });

    const title = String(request?.title || '').trim();
    if (!title) throw new Error('Vui lòng nhập tiêu đề quiz.');
    const validated = validateManualQuizQuestions(request.questions);

    const lessonRepo = AppDataSource.getRepository(Lesson);
    const moduleRepo = AppDataSource.getRepository(Module);

    const lesson = await lessonRepo.findOne({ where: { id: lessonId } as any });
    if (!lesson) throw new Error('Không tìm thấy bài học.');
    const mod = await moduleRepo.findOne({ where: { id: (lesson as any).module_id, course_id: courseId } as any });
    if (!mod) throw new Error('Không tìm thấy bài học.');

    const result = await AppDataSource.transaction(async (manager) => {
      const qBankRepo = manager.getRepository(QuestionBank);
      const bqRepo = manager.getRepository(BankQuestion);
      const optRepo = manager.getRepository(BankQuestionOption);
      const quizRepo = manager.getRepository(Quiz);
      const qqRepo = manager.getRepository(QuizQuestion);
      const attemptRepo = manager.getRepository(QuizAttempt);
      const qOptRepo = manager.getRepository(QuestionOption);

      let bankId: number | null = null;
      let quiz = await quizRepo.findOne({ where: { lesson_id: lessonId } as any });

      if (quiz) {
        const nAttempts = await attemptRepo.count({ where: { quiz_id: (quiz as any).id } as any });
        if (nAttempts > 0) {
          throw new Error('Đã có học viên làm bài — không thể thay đổi danh sách câu hỏi.');
        }
        const maps = await qqRepo.find({ where: { quiz_id: (quiz as any).id } as any });
        if (maps.length) {
          const first = await qqRepo.findOne({
            where: { quiz_id: (quiz as any).id } as any,
            relations: ['bankQuestion'],
          });
          bankId = first?.bankQuestion ? Number((first.bankQuestion as any).bank_id) : null;
          const qqIds = (maps as any[]).map((m) => Number(m.id));
          const bqIds = (maps as any[]).map((m) => Number(m.bank_question_id));
          await qOptRepo.delete({ quiz_question_id: In(qqIds) } as any);
          await qqRepo.delete({ quiz_id: (quiz as any).id } as any);
          for (const bid of bqIds) {
            await optRepo.delete({ question_id: bid } as any);
            await bqRepo.delete({ id: bid } as any);
          }
        } else {
          await qqRepo.delete({ quiz_id: (quiz as any).id } as any);
        }
      }

      if (bankId == null) {
        const reusableInternalBank = await qBankRepo.findOne({
          where: {
            course_id: courseId,
            created_by: subjectUserId,
            name: AUTO_QUIZ_BANK_NAME,
          } as any,
          order: { id: 'DESC' } as any,
        });
        if (reusableInternalBank) {
          bankId = Number((reusableInternalBank as any).id);
        } else {
          const bank = qBankRepo.create({
            course_id: courseId,
            name: AUTO_QUIZ_BANK_NAME,
            description: 'Ngân hàng nội bộ tự sinh cho quiz trong lesson studio.',
            created_by: subjectUserId,
            is_shared: false,
            is_active: false,
          } as any);
          const savedBank = await qBankRepo.save(bank as any);
          bankId = Number((savedBank as any).id);
        }
      }

      const tl = request.time_limit_minutes != null ? Number(request.time_limit_minutes) : null;
      const ps = request.passing_score != null ? Number(request.passing_score) : null;
      const maxAtt = request.max_attempts != null ? Math.max(1, Math.floor(Number(request.max_attempts))) : 1;

      if (!quiz) {
        const q = quizRepo.create({
          lesson_id: lessonId,
          title,
          description: request.description != null ? String(request.description) : null,
          time_limit_minutes: tl != null && Number.isFinite(tl) ? tl : null,
          passing_score: ps != null && Number.isFinite(ps) ? ps : null,
          max_attempts: maxAtt,
          shuffle_questions: Boolean(request.shuffle_questions),
          shuffle_options: Boolean(request.shuffle_options),
          show_results_immediately: request.show_results_immediately !== false,
          show_correct_answers: request.show_correct_answers !== false,
          random_question_count: null,
        } as any);
        quiz = (await quizRepo.save(q as any)) as any;
      } else {
        (quiz as any).title = title;
        (quiz as any).description = request.description != null ? String(request.description) : null;
        (quiz as any).time_limit_minutes = tl != null && Number.isFinite(tl) ? tl : null;
        (quiz as any).passing_score = ps != null && Number.isFinite(ps) ? ps : null;
        (quiz as any).max_attempts = maxAtt;
        (quiz as any).shuffle_questions = Boolean(request.shuffle_questions);
        (quiz as any).shuffle_options = Boolean(request.shuffle_options);
        (quiz as any).show_results_immediately = request.show_results_immediately !== false;
        (quiz as any).show_correct_answers = request.show_correct_answers !== false;
        await quizRepo.save(quiz as any);
      }

      const quizId = Number((quiz as any).id);
      let order = 1;
      for (const qdef of validated) {
        const optEntities = qdef.options.map((o, i) =>
          optRepo.create({
            option_text: o.option_text,
            is_correct: o.is_correct,
            order_index: i + 1,
            explanation: null,
          } as any)
        );
        const bq = bqRepo.create({
          bank_id: bankId,
          question_type: qdef.question_type,
          question_text: qdef.question_text,
          explanation: qdef.explanation ?? null,
          difficulty: qdef.difficulty || 'medium',
          category: null,
          tags: null,
          points: qdef.points,
          created_by: subjectUserId,
          is_ai_generated: false,
          options: optEntities,
        } as any);
        const savedBq = await bqRepo.save(bq as any);
        const bqId = Number((savedBq as any).id);
        const bqReloaded = await bqRepo.findOne({
          where: { id: bqId } as any,
          relations: ['options'],
        });
        const bankOpts = [...((bqReloaded as any)?.options || [])].sort(
          (a: any, b: any) => Number(a.order_index ?? 0) - Number(b.order_index ?? 0)
        );

        const qq = qqRepo.create({
          quiz_id: quizId,
          bank_question_id: bqId,
          order_index: order,
          points: qdef.points,
        } as any);
        const savedQq = await qqRepo.save(qq as any);
        const qqRowId = Number((savedQq as any).id);

        for (const bo of bankOpts) {
          await qOptRepo.save(
            qOptRepo.create({
              quiz_question_id: qqRowId,
              option_text: String((bo as any).option_text || ''),
              is_correct: Boolean((bo as any).is_correct),
              order_index: Number((bo as any).order_index ?? 0),
              explanation: (bo as any).explanation ?? null,
            } as any)
          );
        }
        order += 1;
      }

      return { quiz_id: quizId };
    });
    await this.upsertStructuredLessonReviewResource({
      lessonId,
      actorUserId: subjectUserId,
      kind: 'quiz',
      title: title || 'Quiz nội dung',
    });
    return result;
  }

  async generateManualQuizQuestionsWithAi(
    subjectUserId: number,
    courseId: number,
    lessonId: number,
    request: ManualQuizAiGenerateRequest
  ): Promise<ManualQuizAiGenerateResult> {
    await ensureUserIsCourseManager(subjectUserId);
    await this.ensureOwnCourse(subjectUserId, courseId);

    const lessonRepo = AppDataSource.getRepository(Lesson);
    const moduleRepo = AppDataSource.getRepository(Module);
    const settingRepo = AppDataSource.getRepository(OpenRouterSetting);
    const keyRepo = AppDataSource.getRepository(OpenRouterKey);

    const lesson = await lessonRepo.findOne({ where: { id: lessonId } as any });
    if (!lesson) throw new Error('Không tìm thấy bài học.');
    const mod = await moduleRepo.findOne({ where: { id: (lesson as any).module_id, course_id: courseId } as any });
    if (!mod) throw new Error('Không tìm thấy bài học.');

    const topic = String(request?.topic || '').trim();
    if (!topic) throw new Error('Vui lòng nhập chủ đề để AI tạo quiz.');

    const questionCount = Math.max(1, Math.min(20, Number(request?.question_count) || 5));
    const difficulty = request?.difficulty === 'easy' || request?.difficulty === 'hard' ? request.difficulty : 'medium';
    const questionType =
      request?.question_type === 'true_false' || request?.question_type === 'mixed'
        ? request.question_type
        : 'multiple_choice';

    const settings = await settingRepo.findOne({ where: {} });
    const defaultModel =
      String(settings?.default_model || '').trim() ||
      (Array.isArray(settings?.models) && settings?.models.length ? String(settings.models[0]) : '') ||
      'openai/gpt-4o-mini';

    const modelCandidatesRaw: string[] = Array.isArray(settings?.models) ? settings!.models!.map(String) : [];
    let modelCandidates: string[] = [defaultModel, ...modelCandidatesRaw].map(String).filter(Boolean);
    modelCandidates = Array.from(new Set(modelCandidates));
    if (!modelCandidates.length) modelCandidates = [defaultModel];

    const now = new Date();
    const availableKeys = await keyRepo.find({
      where: { is_active: true } as any,
      order: { last_used_at: 'ASC', id: 'ASC' } as any,
    });
    const picked = availableKeys.find((k) => !k.cooldown_until || new Date(k.cooldown_until) <= now);
    if (!picked) {
      throw new Error('Không có OpenRouter key khả dụng. Hãy kiểm tra tab Admin > Keys.');
    }

    const openRouterKey = decryptOpenRouterKey(String((picked as any).key_encrypted || ''));
    if (!openRouterKey) {
      throw new Error('Không thể giải mã OpenRouter key. Hãy cập nhật lại key trong Admin.');
    }

      const systemPrompt =
      'Bạn là trợ lý tạo câu hỏi trắc nghiệm cho LMS. Trả về DUY NHẤT 1 JSON object hợp lệ. Không markdown, không code block, không giải thích, không chữ nào khác ngoài JSON. Bắt buộc dùng cú pháp JSON chuẩn: `"key": value` (không được viết `"key:"value"`).';
    const userPrompt = [
      'Tạo bộ câu hỏi quiz theo yêu cầu sau và trả về JSON object có dạng:',
      '{ "questions": [{ "question_text": string, "question_type": "multiple_choice"|"true_false", "explanation": string|null, "points": number, "difficulty": "easy"|"medium"|"hard", "options": [{ "option_text": string, "is_correct": boolean }] }] }',
      `Số câu: ${questionCount}`,
      `Chủ đề: ${topic}`,
      `Độ khó ưu tiên: ${difficulty}`,
      `Loại câu hỏi: ${questionType}`,
      'Ràng buộc:',
      '- Mỗi câu phải có ít nhất 2 options.',
      '- Mỗi câu phải có ít nhất 1 đáp án đúng.',
      '- Nếu question_type=true_false, options phải là "Đúng" và "Sai".',
      '- Nội dung bằng tiếng Việt, ngắn gọn, rõ nghĩa.',
      request?.extra_instructions ? `Yêu cầu bổ sung: ${String(request.extra_instructions)}` : '',
      request?.attachment_text
        ? `Nội dung tham chiếu từ file "${String(request.attachment_name || 'attachment')}":\n${String(
            request.attachment_text
          )
            .slice(0, 12000)
            .trim()}`
        : '',
    ]
      .filter(Boolean)
      .join('\n');

    let lastError: any = null;
    console.log(`[OpenRouter] 📋 Chọn key: KeyID=${(picked as any).id}, Model candidates: [${modelCandidates.join(', ')}]`);
    console.log(`[OpenRouter] 🤖 Default model: ${defaultModel}`);

    for (const modelTry of modelCandidates) {
      console.log(`[OpenRouter] 🔄 Thử model: ${modelTry}`);
      try {
        const startTime = Date.now();
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openRouterKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: modelTry,
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.6,
          }),
        });
        const elapsedMs = Date.now() - startTime;
        console.log(`[OpenRouter] ⏱️  Response time: ${elapsedMs}ms, Status: ${response.status}`);

        if (!response.ok) {
          const raw = await response.text().catch(() => '');

          // 429 thường là rate limit theo model/provider upstream.
          if (response.status === 429) {
            const cooldownMinutes = 10;
            (picked as any).last_error_at = new Date();
            (picked as any).error_count = Number((picked as any).error_count || 0) + 1;
            (picked as any).last_test_status = 'rate_limited';
            (picked as any).last_test_message = String(raw || 'HTTP 429').slice(0, 255);
            (picked as any).cooldown_until = new Date(Date.now() + cooldownMinutes * 60 * 1000);
            await keyRepo.save(picked as any);

            console.error(`[OpenRouter] ⚠️  Rate limited (429) với model ${modelTry}. Key cooldown ${cooldownMinutes} phút.`);
            lastError = new Error(`OpenRouter 429 (model ${modelTry}): ${raw?.slice(0, 160) || 'rate limited'}`);
            continue;
          }

          console.error(`[OpenRouter] ❌ HTTP ${response.status} với model ${modelTry}: ${raw?.slice(0, 200)}`);
          (picked as any).last_error_at = new Date();
          (picked as any).error_count = Number((picked as any).error_count || 0) + 1;
          (picked as any).last_test_status = 'unknown_error';
          (picked as any).last_test_message = `HTTP ${response.status}`.slice(0, 255);
          await keyRepo.save(picked as any);

          lastError = new Error(`OpenRouter lỗi HTTP ${response.status}: ${raw?.slice(0, 160) || 'Unknown error'}`);
          continue;
        }

        const data: any = await response.json();
        console.log(`[OpenRouter] ✅ Thành công với model: ${modelTry}, Actual model: ${data?.model || 'N/A'}`);
        const choice0 = data?.choices?.[0] ?? null;
        const contentRaw = choice0?.message?.content;
        const textRaw = choice0?.text;
        const contentString =
          typeof contentRaw === "string"
            ? contentRaw
            : contentRaw != null
              ? JSON.stringify(contentRaw)
              : typeof textRaw === "string"
                ? textRaw
                : "";

        if (!contentString || !contentString.trim()) {
          throw new Error(
            `OpenRouter không trả về nội dung. choice0=${JSON.stringify(choice0).slice(0, 400)}`
          );
        }

      const repairJsonLikeText = (input: string): string => {
        let t = String(input || '');
        // Fix common issues like: {"questions:[{ ... }] -> {"questions":[{ ... }]
        t = t.replace(/"(\w+)":?\[/g, (_m, key) => `"${key}":[`);
        t = t.replace(/"(\w+):\[/g, (_m, key) => `"${key}":[`);

        // Fix: "question_type:"multiple_choice" -> "question_type":"multiple_choice"
        t = t.replace(/"(\w+):"([^"]*)"/g, (_m, k, v) => `"${k}":"${v}"`);

        // Fix numeric/boolean/null when value not quoted: "points:2" -> "points":2
        t = t.replace(/"(\w+):(true|false|null|\d+(?:\.\d+)?)"/g, (_m, k, v) => `"${k}":${v}`);
        return t;
      };

      const tryParseJsonObject = (rawText: string): any | null => {
        let t = String(rawText || '').trim();
        // Remove markdown/code fences if AI still wraps the JSON
        t = t.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
        t = repairJsonLikeText(t);

        // First try: whole string
        try { return JSON.parse(t); } catch { /* continue */ }
        // Fallback: extract {...} region
        const first = t.indexOf('{');
        const last = t.lastIndexOf('}');
        if (first !== -1 && last !== -1 && last > first) {
          const sub = t.slice(first, last + 1);
          try {
            return JSON.parse(sub);
          } catch {
            return null;
          }
        }
        return null;
      };

      const parsed = tryParseJsonObject(String(contentString));
      if (!parsed) {
        throw new Error(`AI trả về dữ liệu không đúng JSON. Raw=${String(contentString).slice(0, 400)}`);
      }

        const rawQuestions = Array.isArray(parsed?.questions) ? parsed.questions : [];
        const validated = validateManualQuizQuestions(rawQuestions as ManualQuizQuestionInput[]);
        const trimmed = validated.slice(0, questionCount);

        (picked as any).last_used_at = new Date();
        await keyRepo.save(picked as any);

        return {
          model: modelTry,
          questions: trimmed,
        };
      } catch (error: any) {
        (picked as any).last_error_at = new Date();
        (picked as any).error_count = Number((picked as any).error_count || 0) + 1;
        (picked as any).last_test_status = 'network_error';
        (picked as any).last_test_message = String(error?.message || error).slice(0, 255);
        await keyRepo.save(picked as any);
        lastError = error;
      }
    }

    throw new Error(String(lastError?.message || lastError || 'OpenRouter AI generation failed.'));
  }

  async getLearnerQuizForLesson(
    subjectUserId: number,
    courseId: number,
    lessonId: number
  ): Promise<LearnerQuizTakePayload | null> {
    await this.ensureEnrolledLearner(subjectUserId, courseId);
    await this.ensureCanAccessLesson(subjectUserId, courseId, lessonId);

    const lessonRepo = AppDataSource.getRepository(Lesson);
    const lesson = await lessonRepo.findOne({ where: { id: lessonId } as any });
    if (!lesson) return null;

    const quizRepo = AppDataSource.getRepository(Quiz);
    const quiz = await quizRepo.findOne({ where: { lesson_id: lessonId } as any });
    if (!quiz) return null;

    const lt = String((lesson as any).lesson_type || '');
    if (lt !== 'quiz') {
      const completionRepo = AppDataSource.getRepository(LessonCompletion);
      const done = await completionRepo.findOne({
        where: { user_id: subjectUserId, lesson_id: lessonId } as any,
      });
      if (!done) throw new Error('Vui lòng hoàn thành bài học trước khi làm Quizz.');
    }

    const qqRepo = AppDataSource.getRepository(QuizQuestion);
    const qOptRepo = AppDataSource.getRepository(QuestionOption);
    const attemptRepo = AppDataSource.getRepository(QuizAttempt);

    const maps = await qqRepo.find({
      where: { quiz_id: (quiz as any).id } as any,
      order: { order_index: 'ASC' } as any,
      relations: ['bankQuestion'],
    });
    if (!maps.length) return null;

    const attemptsUsed = await attemptRepo.count({
      where: { quiz_id: (quiz as any).id, user_id: subjectUserId } as any,
    });

    let questions: LearnerQuizTakePayload['questions'] = [];
    const correctOptionIdsByQqId = new Map<number, number[]>();
    for (const m of maps as any[]) {
      const bq = m.bankQuestion;
      if (!bq) continue;
      const rawOpts = await qOptRepo.find({
        where: { quiz_question_id: Number(m.id) } as any,
        order: { order_index: 'ASC' } as any,
      });
      if (!rawOpts.length) continue;
      correctOptionIdsByQqId.set(
        Number(m.id),
        (rawOpts as any[]).filter((o) => Boolean((o as any).is_correct)).map((o) => Number((o as any).id))
      );

      let opts = (rawOpts as any[]).map((o) => ({
        id: Number(o.id),
        option_text: String(o.option_text || ''),
      }));
      if ((quiz as any).shuffle_options) opts = shuffleArray(opts);

      questions.push({
        quiz_question_id: Number(m.id),
        question_text: String(bq.question_text || ''),
        question_type: String(bq.question_type || 'multiple_choice'),
        points: Number(m.points ?? bq.points ?? 1),
        options: opts,
      });
    }

    if ((quiz as any).shuffle_questions) {
      questions = shuffleArray(questions);
    }

    if (!questions.length) return null;

    const recentAttemptsRaw = await attemptRepo.find({
      where: { quiz_id: (quiz as any).id, user_id: subjectUserId } as any,
      order: { attempt_number: 'DESC' } as any,
      take: 5,
    });
    const recentAttemptIds = (recentAttemptsRaw as any[]).map((a) => Number(a.id)).filter((x) => x > 0);

    const respRepo = AppDataSource.getRepository(QuizResponse);
    const roRepo = AppDataSource.getRepository(QuizResponseOption);
    const responses = recentAttemptIds.length
      ? await respRepo.find({
          where: { attempt_id: In(recentAttemptIds) } as any,
          order: { id: 'ASC' } as any,
        })
      : [];

    const responseIds = (responses as any[]).map((r) => Number((r as any).id)).filter((x) => x > 0);
    const roRows = responseIds.length
      ? await roRepo.find({
          where: { response_id: In(responseIds) } as any,
        })
      : [];
    const optionIds = [...new Set((roRows as any[]).map((x) => Number((x as any).option_id)).filter((x) => x > 0))];
    const optionRows = optionIds.length
      ? await qOptRepo.find({
          where: { id: In(optionIds) } as any,
        })
      : [];
    const optionTextById = new Map<number, string>(
      (optionRows as any[]).map((o) => [Number((o as any).id), String((o as any).option_text || '')])
    );
    const optionByResponseId = new Map<number, number>();
    for (const row of roRows as any[]) {
      const rid = Number((row as any).response_id);
      const oid = Number((row as any).option_id);
      if (!optionByResponseId.has(rid)) optionByResponseId.set(rid, oid);
    }

    const qTextByQqId = new Map<number, string>(questions.map((q) => [q.quiz_question_id, q.question_text]));
    const respByAttemptId = new Map<number, any[]>();
    for (const r of responses as any[]) {
      const aid = Number((r as any).attempt_id);
      const arr = respByAttemptId.get(aid) || [];
      arr.push(r);
      respByAttemptId.set(aid, arr);
    }

    const recent_attempts: LearnerQuizTakePayload['recent_attempts'] = (recentAttemptsRaw as any[]).map((a) => {
      const aid = Number((a as any).id);
      const resps = respByAttemptId.get(aid) || [];
      const answers = resps.map((r) => {
        const qqId = Number((r as any).quiz_question_id);
        const selectedOptionId = optionByResponseId.get(Number((r as any).id)) ?? null;
        return {
          quiz_question_id: qqId,
          question_text: String(qTextByQqId.get(qqId) ?? ''),
          selected_option_id: selectedOptionId,
          selected_option_text:
            selectedOptionId != null ? String(optionTextById.get(selectedOptionId) ?? '') : null,
          correct_option_ids: correctOptionIdsByQqId.get(qqId) || [],
        };
      });
      return {
        attempt_id: aid,
        attempt_number: Number((a as any).attempt_number),
        submitted_at: (a as any).submitted_at ? new Date((a as any).submitted_at).toISOString() : null,
        score_percent: (a as any).score != null ? Number((a as any).score) : null,
        is_passed: (a as any).is_passed != null ? Boolean((a as any).is_passed) : null,
        status: String((a as any).status ?? ''),
        answers,
      };
    });

    return {
      quiz_id: Number((quiz as any).id),
      lesson_id: lessonId,
      title: String((quiz as any).title || ''),
      description: (quiz as any).description ?? null,
      time_limit_minutes:
        (quiz as any).time_limit_minutes != null ? Number((quiz as any).time_limit_minutes) : null,
      passing_score: (quiz as any).passing_score != null ? Number((quiz as any).passing_score) : null,
      max_attempts: Number((quiz as any).max_attempts ?? 1),
      attempts_used: Number(attemptsUsed),
      show_results_immediately: (quiz as any).show_results_immediately !== false,
      show_correct_answers: (quiz as any).show_correct_answers !== false,
      recent_attempts,
      questions,
    };
  }

  async submitLearnerQuiz(
    subjectUserId: number,
    courseId: number,
    lessonId: number,
    request: LearnerQuizSubmitRequest
  ): Promise<LearnerQuizSubmitResult> {
    await this.ensureEnrolledLearner(subjectUserId, courseId);
    await this.ensureCanAccessLesson(subjectUserId, courseId, lessonId);

    const answers = Array.isArray(request?.answers) ? request.answers : [];
    if (!answers.length) throw new Error('Vui lòng gửi câu trả lời.');

    const lessonRepo = AppDataSource.getRepository(Lesson);
    const lesson = await lessonRepo.findOne({ where: { id: lessonId } as any });
    if (!lesson) throw new Error('Không tìm thấy bài học.');

    const quizRepo = AppDataSource.getRepository(Quiz);
    const quiz = await quizRepo.findOne({ where: { lesson_id: lessonId } as any });
    if (!quiz) throw new Error('Không tìm thấy quiz.');

    const lt = String((lesson as any).lesson_type || '');
    if (lt !== 'quiz') {
      const completionRepo = AppDataSource.getRepository(LessonCompletion);
      const done = await completionRepo.findOne({
        where: { user_id: subjectUserId, lesson_id: lessonId } as any,
      });
      if (!done) throw new Error('Vui lòng hoàn thành bài học trước khi nộp Quizz.');
    }

    const qqRepo = AppDataSource.getRepository(QuizQuestion);
    const qOptRepo = AppDataSource.getRepository(QuestionOption);
    const attemptRepo = AppDataSource.getRepository(QuizAttempt);

    const maps = await qqRepo.find({ where: { quiz_id: (quiz as any).id } as any });
    if (!(maps as any[]).length) throw new Error('Quiz chưa có câu hỏi.');
    const maxPts = (maps as any[]).reduce((s, m) => s + Number(m.points ?? 1), 0);

    const answerByQq = new Map<number, number>();
    for (const a of answers) {
      answerByQq.set(Number((a as any).quiz_question_id), Number((a as any).selected_option_id));
    }
    for (const m of maps as any[]) {
      const qid = Number(m.id);
      if (!answerByQq.has(qid) || !Number.isFinite(answerByQq.get(qid)!)) {
        throw new Error('Vui lòng chọn đáp án cho mọi câu hỏi.');
      }
    }

    const last = await attemptRepo.findOne({
      where: { quiz_id: (quiz as any).id, user_id: subjectUserId } as any,
      order: { attempt_number: 'DESC' } as any,
    });
    const nextNum = last ? Number((last as any).attempt_number) + 1 : 1;
    if (nextNum > Number((quiz as any).max_attempts ?? 1)) {
      throw new Error('Bạn đã hết số lần làm bài.');
    }

    let earned = 0;
    const details: LearnerQuizSubmitResult['details'] = [];

    return await AppDataSource.transaction(async (manager) => {
      const attRepo = manager.getRepository(QuizAttempt);
      const qOptRepoT = manager.getRepository(QuestionOption);
      const respRepo = manager.getRepository(QuizResponse);
      const roRepo = manager.getRepository(QuizResponseOption);
      const progressRepo = manager.getRepository(LessonProgress);

      const attemptEnt = await attRepo.save(
        attRepo.create({
          quiz_id: (quiz as any).id,
          user_id: subjectUserId,
          attempt_number: nextNum,
          started_at: new Date(),
          submitted_at: new Date(),
          time_spent_seconds: null,
          score: null,
          is_passed: null,
          status: 'in_progress',
        } as any)
      );
      const attemptId = Number((attemptEnt as any).id);

      for (const m of maps as any[]) {
        const qqId = Number(m.id);
        const selId = Number(answerByQq.get(qqId));
        const pts = Number(m.points ?? 1);
        const opt = await qOptRepoT.findOne({ where: { id: selId, quiz_question_id: qqId } as any });
        const isCorrect = Boolean(opt?.is_correct);
        if (isCorrect) earned += pts;

        const resp = await respRepo.save(
          respRepo.create({
            attempt_id: attemptId,
            quiz_question_id: qqId,
            is_correct: isCorrect,
            points_earned: isCorrect ? pts : 0,
          } as any)
        );
        const respId = Number((resp as any).id);
        if (opt) {
          await roRepo.save(
            roRepo.create({
              response_id: respId,
              option_id: selId,
            } as any)
          );
        }

        const allOpts = await qOptRepoT.find({
          where: { quiz_question_id: qqId } as any,
          order: { order_index: 'ASC' } as any,
        });
        details.push({
          quiz_question_id: qqId,
          is_correct: isCorrect,
          points_earned: isCorrect ? pts : 0,
          correct_option_ids: (allOpts as any[]).filter((o) => o.is_correct).map((o) => Number(o.id)),
          selected_option_id: opt ? selId : null,
        });
      }

      const pct = maxPts > 0 ? Math.round((earned / maxPts) * 10000) / 100 : 0;
      const passThreshold = (quiz as any).passing_score != null ? Number((quiz as any).passing_score) : null;
      const isPassed = passThreshold == null ? true : pct + 1e-9 >= passThreshold;
      const maxAttempts = Number((quiz as any).max_attempts ?? 1);
      const isLastAttempt = nextNum >= maxAttempts;

      await attRepo.update(
        { id: attemptId } as any,
        {
          score: pct,
          is_passed: isPassed,
          status: 'graded',
        } as any
      );

      // Complete lesson if passed OR this is the last attempt (exhausted all tries)
      if (isPassed || isLastAttempt) {
        const { orderedLessons } = await this.loadOrderedLessonsForCourse(courseId);
        const idx = orderedLessons.findIndex((l) => Number((l as any).id) === Number(lessonId));
        if (idx >= 0) {
          const rules = await this.getTimeRulesForCourse(courseId);
          const required = this.computeRequiredSecondsForLesson(orderedLessons[idx], rules);
          const existing = await progressRepo.findOne({
            where: { user_id: subjectUserId, course_id: courseId, lesson_id: lessonId } as any,
          });
          const entity = existing
            ? existing
            : progressRepo.create({
                user_id: subjectUserId,
                course_id: courseId,
                lesson_id: lessonId,
                time_spent_seconds: 0,
              } as any);
          (entity as any).time_spent_seconds = Math.max(
            Number((entity as any).time_spent_seconds || 0),
            required
          );
          await progressRepo.save(entity as any);
        }
        // Auto-complete the quiz lesson when passed or last attempt - do NOT ignore errors
        try {
          await this.completeLesson(subjectUserId, courseId, lessonId);
        } catch (err) {
          // Log error for debugging but still consider quiz as completed
          console.error('[Quiz Complete] Failed to auto-complete lesson:', err);
        }
      }

      return {
        attempt_id: attemptId,
        attempt_number: nextNum,
        score_percent: pct,
        earned_points: earned,
        max_points: maxPts,
        is_passed: isPassed,
        show_correct_answers: (quiz as any).show_correct_answers !== false,
        details,
      };
    });
  }

  async listQuizLearnerScoresForLesson(
    subjectUserId: number,
    courseId: number,
    lessonId: number
  ): Promise<QuizLearnerScoresResult> {
    await ensureUserIsCourseManager(subjectUserId);
    await this.ensureOwnCourse(subjectUserId, courseId);

    const lessonRepo = AppDataSource.getRepository(Lesson);
    const lesson = await lessonRepo.findOne({ where: { id: lessonId } as any });
    if (!lesson) throw new Error('Không tìm thấy bài học.');

    const moduleRepo = AppDataSource.getRepository(Module);
    const mod = await moduleRepo.findOne({ where: { id: (lesson as any).module_id } as any });
    if (!mod || Number((mod as any).course_id) !== courseId) {
      throw new Error('Bài học không thuộc khóa học này.');
    }

    const quizRepo = AppDataSource.getRepository(Quiz);
    const quiz = await quizRepo.findOne({ where: { lesson_id: lessonId } as any });
    if (!quiz) {
      return { quiz: null, learners: [] };
    }

    const enrollRepo = AppDataSource.getRepository(CourseEnrollment);
    const enrollments = await enrollRepo.find({
      where: { course_id: courseId, status: In(['active', 'completed']) } as any,
    });
    const userIds = [...new Set((enrollments as any[]).map((e) => Number(e.user_id)))].filter((x) => x > 0);
    if (userIds.length === 0) {
      return {
        quiz: {
          id: Number((quiz as any).id),
          title: String((quiz as any).title ?? ''),
          passing_score: (quiz as any).passing_score != null ? Number((quiz as any).passing_score) : null,
          max_attempts: Number((quiz as any).max_attempts ?? 1),
        },
        learners: [],
      };
    }

    const userRepo = AppDataSource.getRepository(User);
    const users = await userRepo.find({ where: { id: In(userIds) } as any });
    const userById = new Map<number, any>((users as any[]).map((u) => [Number(u.id), u]));

    const attemptRepo = AppDataSource.getRepository(QuizAttempt);
    const attempts = await attemptRepo.find({
      where: { quiz_id: (quiz as any).id, user_id: In(userIds) } as any,
      order: { user_id: 'ASC', attempt_number: 'ASC' } as any,
    });

    const groups = new Map<number, QuizLearnerAttemptRow[]>();
    for (const uid of userIds) groups.set(uid, []);
    for (const a of attempts as any[]) {
      const uid = Number(a.user_id);
      const arr = groups.get(uid) || [];
      arr.push({
        attempt_id: Number(a.id),
        attempt_number: Number(a.attempt_number),
        score: a.score != null ? Number(a.score) : null,
        is_passed: a.is_passed != null ? Boolean(a.is_passed) : null,
        submitted_at: a.submitted_at ? new Date(a.submitted_at).toISOString() : null,
        status: String(a.status ?? ''),
      });
      groups.set(uid, arr);
    }

    const learners: QuizLearnerScoresRow[] = userIds.map((uid) => {
      const u = userById.get(uid);
      return {
        user_id: uid,
        email: String(u?.email ?? ''),
        full_name: String(u?.full_name ?? ''),
        attempts: groups.get(uid) || [],
      };
    });

    learners.sort((a, b) => a.full_name.localeCompare(b.full_name, 'vi'));

    return {
      quiz: {
        id: Number((quiz as any).id),
        title: String((quiz as any).title ?? ''),
        passing_score: (quiz as any).passing_score != null ? Number((quiz as any).passing_score) : null,
        max_attempts: Number((quiz as any).max_attempts ?? 1),
      },
      learners,
    };
  }

  async getQuizAttemptDetailForTeacher(
    subjectUserId: number,
    courseId: number,
    lessonId: number,
    attemptId: number
  ): Promise<QuizAttemptDetailResult> {
    await ensureUserIsCourseManager(subjectUserId);
    await this.ensureOwnCourse(subjectUserId, courseId);

    const lessonRepo = AppDataSource.getRepository(Lesson);
    const lesson = await lessonRepo.findOne({ where: { id: lessonId } as any });
    if (!lesson) throw new Error('Không tìm thấy bài học.');

    const moduleRepo = AppDataSource.getRepository(Module);
    const mod = await moduleRepo.findOne({ where: { id: (lesson as any).module_id } as any });
    if (!mod || Number((mod as any).course_id) !== courseId) {
      throw new Error('Bài học không thuộc khóa học này.');
    }

    const quizRepo = AppDataSource.getRepository(Quiz);
    const quiz = await quizRepo.findOne({ where: { lesson_id: lessonId } as any });
    if (!quiz) throw new Error('Bài học chưa có quiz.');

    const attemptRepo = AppDataSource.getRepository(QuizAttempt);
    const attempt = await attemptRepo.findOne({
      where: { id: attemptId, quiz_id: Number((quiz as any).id) } as any,
    });
    if (!attempt) throw new Error('Không tìm thấy lần làm quiz.');

    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: Number((attempt as any).user_id) } as any });

    const qqRepo = AppDataSource.getRepository(QuizQuestion);
    const questions = await qqRepo.find({
      where: { quiz_id: Number((quiz as any).id) } as any,
      order: { order_index: 'ASC' } as any,
    });
    const questionIds = (questions as any[]).map((q) => Number(q.id)).filter((x) => x > 0);

    const qoRepo = AppDataSource.getRepository(QuestionOption);
    const options = questionIds.length
      ? await qoRepo.find({
          where: { quiz_question_id: In(questionIds) } as any,
          order: { quiz_question_id: 'ASC', order_index: 'ASC' } as any,
        })
      : [];
    const optionsByQuestion = new Map<number, any[]>();
    for (const qid of questionIds) optionsByQuestion.set(qid, []);
    for (const opt of options as any[]) {
      const qid = Number(opt.quiz_question_id);
      const arr = optionsByQuestion.get(qid) || [];
      arr.push(opt);
      optionsByQuestion.set(qid, arr);
    }

    const responseRepo = AppDataSource.getRepository(QuizResponse);
    const responses = await responseRepo.find({
      where: { attempt_id: Number((attempt as any).id) } as any,
    });
    const responseByQuestion = new Map<number, any>();
    const responseIds: number[] = [];
    for (const r of responses as any[]) {
      responseByQuestion.set(Number(r.quiz_question_id), r);
      responseIds.push(Number(r.id));
    }

    const selectedOptionByResponse = new Map<number, number>();
    if (responseIds.length) {
      const roRepo = AppDataSource.getRepository(QuizResponseOption);
      const roRows = await roRepo.find({ where: { response_id: In(responseIds) } as any });
      for (const row of roRows as any[]) {
        const rid = Number(row.response_id);
        if (!selectedOptionByResponse.has(rid)) {
          selectedOptionByResponse.set(rid, Number(row.option_id));
        }
      }
    }

    const detailedQuestions: QuizAttemptDetailResult['questions'] = (questions as any[]).map((q) => {
      const qid = Number(q.id);
      const response = responseByQuestion.get(qid);
      const selectedOptionId = response ? selectedOptionByResponse.get(Number(response.id)) ?? null : null;
      const opts = optionsByQuestion.get(qid) || [];
      return {
        quiz_question_id: qid,
        order_index: Number(q.order_index ?? 0),
        question_text: String(q.question_text ?? ''),
        points: Number(q.points ?? 1),
        selected_option_id: selectedOptionId,
        selected_option_text:
          selectedOptionId != null
            ? String((opts.find((o: any) => Number(o.id) === Number(selectedOptionId)) as any)?.option_text ?? '')
            : null,
        is_correct: response?.is_correct != null ? Boolean(response.is_correct) : null,
        options: (opts as any[]).map((o) => ({
          id: Number(o.id),
          option_text: String(o.option_text ?? ''),
          is_correct: Boolean(o.is_correct),
          is_selected: selectedOptionId != null && Number(o.id) === Number(selectedOptionId),
        })),
      };
    });

    return {
      attempt_id: Number((attempt as any).id),
      attempt_number: Number((attempt as any).attempt_number),
      user_id: Number((attempt as any).user_id),
      user_full_name: String((user as any)?.full_name ?? ''),
      user_email: String((user as any)?.email ?? ''),
      score: (attempt as any).score != null ? Number((attempt as any).score) : null,
      is_passed: (attempt as any).is_passed != null ? Boolean((attempt as any).is_passed) : null,
      submitted_at: (attempt as any).submitted_at ? new Date((attempt as any).submitted_at).toISOString() : null,
      status: String((attempt as any).status ?? ''),
      show_correct_answers: (quiz as any).show_correct_answers !== false,
      questions: detailedQuestions,
    };
  }

  async getMyLearningActivity(subjectUserId: number): Promise<LearningActivityResult> {
    const completionRepo = AppDataSource.getRepository(LessonCompletion);

    const today = new Date();
    const dailyActivity: LearningActivityDayPoint[] = [];

    console.log('[DEBUG] getMyLearningActivity - userId:', subjectUserId);
    console.log('[DEBUG] today:', today.toISOString());

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const startOfDay = new Date(dateStr + 'T00:00:00.000Z');
      const endOfDay = new Date(dateStr + 'T23:59:59.999Z');

      console.log('[DEBUG] Checking date:', dateStr, 'range:', startOfDay.toISOString(), '-', endOfDay.toISOString());

      const count = await completionRepo
        .createQueryBuilder('lc')
        .where('lc.user_id = :userId', { userId: subjectUserId })
        .andWhere('lc.completed_at >= :start', { start: startOfDay })
        .andWhere('lc.completed_at <= :end', { end: endOfDay })
        .getCount();

      console.log('[DEBUG] Count for', dateStr, ':', count);

      dailyActivity.push({
        date: dateStr,
        lessons_completed: count,
      });
    }

    return { daily_activity: dailyActivity };
  }

  async createCourseReview(
    userId: number,
    courseId: number,
    rating: number,
    comment: string | null
  ): Promise<CourseReviewItem> {
    const reviewRepo = AppDataSource.getRepository(CourseReview);
    const courseRepo = AppDataSource.getRepository(Course);
    const enrollmentRepo = AppDataSource.getRepository(CourseEnrollment);
    const now = new Date();

    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5.');
    }

    // Check if course exists and is effectively published
    const course = await courseRepo
      .createQueryBuilder('c')
      .where('c.id = :courseId', { courseId })
      .andWhere('c.deleted_at IS NULL')
      .andWhere(
        `(c.status = :published OR (c.status = :draft AND c.publish_scheduled_at IS NOT NULL AND c.publish_scheduled_at <= :now))`,
        { published: 'published', draft: 'draft', now }
      )
      .getOne();

    if (!course) {
      throw new Error('Course not found.');
    }

    // Check if user is enrolled
    const enrollment = await enrollmentRepo.findOne({
      where: { user_id: userId, course_id: courseId },
    });

    if (!enrollment) {
      throw new Error('You must be enrolled in this course to leave a review.');
    }

    // Check if user already reviewed this course
    const existingReview = await reviewRepo.findOne({
      where: { user_id: userId, course_id: courseId },
    });

    if (existingReview) {
      throw new Error('You have already reviewed this course. Use update instead.');
    }

    const review = reviewRepo.create({
      user_id: userId,
      course_id: courseId,
      rating,
      comment: comment?.trim() || null,
      is_visible: true,
    });

    await reviewRepo.save(review);

    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: userId } });

    return {
      id: review.id,
      user_id: userId,
      user_full_name: String((user as any)?.full_name ?? ''),
      user_avatar: (user as any)?.avatar_url ?? null,
      rating: review.rating,
      comment: review.comment,
      created_at: new Date(review.created_at).toISOString(),
    };
  }

  async listCourseReviews(
    courseId: number,
    page: number,
    pageSize: number
  ): Promise<CourseReviewListResult> {
    const reviewRepo = AppDataSource.getRepository(CourseReview);
    const actualPage = Math.max(1, Number(page || 1));
    const actualPageSize = Math.min(50, Math.max(1, Number(pageSize || 10)));

    // Get total and avg rating
    const statsQb = reviewRepo
      .createQueryBuilder('cr')
      .select('COUNT(*)', 'cnt')
      .addSelect('AVG(cr.rating)', 'avg_rating')
      .where('cr.course_id = :courseId', { courseId })
      .andWhere('cr.is_visible = true');

    const stats = await statsQb.getRawOne();

    const total = Number(stats?.cnt ?? 0);
    const avgRating = stats?.avg_rating != null ? Number(stats.avg_rating) : null;

    // Get paginated reviews with user info
    const reviews = await reviewRepo
      .createQueryBuilder('cr')
      .innerJoinAndSelect('cr.user', 'u')
      .where('cr.course_id = :courseId', { courseId })
      .andWhere('cr.is_visible = true')
      .orderBy('cr.created_at', 'DESC')
      .skip((actualPage - 1) * actualPageSize)
      .take(actualPageSize)
      .getMany();

    const items: CourseReviewItem[] = reviews.map((r) => ({
      id: r.id,
      user_id: r.user_id,
      user_full_name: String((r.user as any)?.full_name ?? ''),
      user_avatar: (r.user as any)?.avatar_url ?? null,
      rating: r.rating,
      comment: r.comment,
      created_at: new Date(r.created_at).toISOString(),
    }));

    return {
      items,
      page: actualPage,
      page_size: actualPageSize,
      total,
      avg_rating: avgRating,
      rating_count: total,
    };
  }

  async updateCourseReview(
    reviewId: number,
    userId: number,
    rating: number,
    comment: string | null
  ): Promise<CourseReviewItem> {
    const reviewRepo = AppDataSource.getRepository(CourseReview);

    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5.');
    }

    const review = await reviewRepo.findOne({ where: { id: reviewId } });

    if (!review) {
      throw new Error('Review not found.');
    }

    if (review.user_id !== userId) {
      throw new Error('You can only update your own review.');
    }

    review.rating = rating;
    review.comment = comment?.trim() || null;

    await reviewRepo.save(review);

    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: review.user_id } });

    return {
      id: review.id,
      user_id: review.user_id,
      user_full_name: String((user as any)?.full_name ?? ''),
      user_avatar: (user as any)?.avatar_url ?? null,
      rating: review.rating,
      comment: review.comment,
      created_at: new Date(review.created_at).toISOString(),
    };
  }

  async deleteCourseReview(reviewId: number, userId: number): Promise<void> {
    const reviewRepo = AppDataSource.getRepository(CourseReview);

    const review = await reviewRepo.findOne({ where: { id: reviewId } });

    if (!review) {
      throw new Error('Review not found.');
    }

    if (review.user_id !== userId) {
      throw new Error('You can only delete your own review.');
    }

    await reviewRepo.remove(review);
  }

  /** Learner: get quiz questions for chatbot context (without correct answers) */
  async getQuizQuestionsForLearner(
    subjectUserId: number,
    courseId: number,
    lessonId: number
  ): Promise<{ lesson_id: number; quiz_id: number | null; questions: any[] }> {
    await this.ensureEnrolledLearner(subjectUserId, courseId);
    await this.ensureCanAccessLesson(subjectUserId, courseId, lessonId);

    const lessonRepo = AppDataSource.getRepository(Lesson);
    const lesson = await lessonRepo.findOne({ where: { id: lessonId } as any });
    if (!lesson) throw new Error('Lesson not found');

    const quizRepo = AppDataSource.getRepository(Quiz);
    const quiz = await quizRepo.findOne({ where: { lesson_id: lessonId } as any });

    if (!quiz) {
      return { lesson_id: lessonId, quiz_id: null, questions: [] };
    }

    const qqRepo = AppDataSource.getRepository(QuizQuestion);
    const qOptRepo = AppDataSource.getRepository(QuestionOption);

    const questions = await qqRepo.find({
      where: { quiz_id: (quiz as any).id } as any,
      order: { order_index: 'ASC' } as any,
      relations: ['bankQuestion'],
    });

    const resultQuestions: any[] = [];
    for (const m of questions as any[]) {
      const bq = m.bankQuestion;
      if (!bq) continue;

      const rawOpts = await qOptRepo.find({
        where: { quiz_question_id: Number(m.id) } as any,
        order: { order_index: 'ASC' } as any,
      });

      resultQuestions.push({
        id: Number(m.id),
        question_text: String(bq.question_text || ''),
        options: rawOpts.map((opt: any) => ({
          id: Number(opt.id),
          option_text: String(opt.option_text || ''),
          order_index: Number(opt.order_index ?? 0),
        })),
      });
    }

    return {
      lesson_id: lessonId,
      quiz_id: (quiz as any).id ? Number((quiz as any).id) : null,
      questions: resultQuestions,
    };
  }

  /** Learner: get assignment content for chatbot context */
  async getAssignmentContentForLearner(
    subjectUserId: number,
    courseId: number,
    lessonId: number
  ): Promise<{
    description: string | null;
    short_answer_questions: any[];
    attachments: any[];
  } | null> {
    await this.ensureEnrolledLearner(subjectUserId, courseId);
    await this.ensureCanAccessLesson(subjectUserId, courseId, lessonId);

    const lessonRepo = AppDataSource.getRepository(Lesson);
    const lesson = await lessonRepo.findOne({ where: { id: lessonId } as any });
    if (!lesson) return null;

    const assignmentRepo = AppDataSource.getRepository(Assignment);
    const assignment = await assignmentRepo.findOne({ where: { lesson_id: lessonId } as any });
    if (!assignment) return null;

    // Parse JSON fields - attachments and short_answer_questions are stored as JSON
    const rawAttachments = (assignment as any).attachments;
    const rawQuestions = (assignment as any).short_answer_questions;

    let attachments: any[] = [];
    let shortAnswerQuestions: any[] = [];

    try {
      if (rawAttachments) {
        if (typeof rawAttachments === 'string') {
          attachments = JSON.parse(rawAttachments);
        } else if (Array.isArray(rawAttachments)) {
          attachments = rawAttachments;
        }
      }
    } catch (e) { /* ignore */ }

    try {
      if (rawQuestions) {
        if (typeof rawQuestions === 'string') {
          shortAnswerQuestions = JSON.parse(rawQuestions);
        } else if (Array.isArray(rawQuestions)) {
          shortAnswerQuestions = rawQuestions;
        }
      }
    } catch (e) { /* ignore */ }

    return {
      description: String((assignment as any).description || ''),
      short_answer_questions: shortAnswerQuestions.map((q: any, idx: number) => ({
        id: q.id || idx + 1,
        question_text: String(q.question_text || q.question || ''),
        order_index: Number(q.order_index ?? idx),
      })),
      attachments: attachments.map((a: any, idx: number) => ({
        id: a.id || idx + 1,
        filename: String(a.filename || a.name || ''),
        file_url: String(a.file_url || a.url || ''),
      })),
    };
  }

  /** Learner: get transcript for chatbot context */
  async getLessonTranscriptForLearner(
    subjectUserId: number,
    courseId: number,
    lessonId: number
  ): Promise<{ transcript: string | null; segments: any[] }> {
    await this.ensureEnrolledLearner(subjectUserId, courseId);
    await this.ensureCanAccessLesson(subjectUserId, courseId, lessonId);

    const lessonRepo = AppDataSource.getRepository(Lesson);
    const lesson = await lessonRepo.findOne({ where: { id: lessonId } as any });
    if (!lesson) throw new Error('Lesson not found');

    const transcriptRepo = AppDataSource.getRepository(LessonTranscriptCache);
    const lessonType = String((lesson as any).lesson_type || '');

    let transcriptText: string | null = null;
    let segments: any[] = [];

    if (lessonType === 'video') {
      // Try to get YouTube transcript
      const youtubeRows = await transcriptRepo.find({
        where: {
          lesson_id: lessonId,
          source_type: In(['youtube_stt', 'youtube_timedtext', 'youtube']),
        } as any,
        order: { updated_at: 'DESC' } as any,
      });

      const hasSegments = (x: any) =>
        Boolean(x && Array.isArray((x as any).transcript_segments_json) && (x as any).transcript_segments_json.length > 0);

      const youtubeCache = youtubeRows.find((x: any) => String((x as any).source_type || '') === 'youtube_stt' && hasSegments(x))
        || youtubeRows.find((x: any) => String((x as any).source_type || '') === 'youtube_timedtext' && hasSegments(x))
        || youtubeRows.find((x: any) => String((x as any).source_type || '') === 'youtube' && hasSegments(x))
        || youtubeRows.find((x: any) => String((x as any).source_type || '') === 'youtube_stt')
        || youtubeRows.find((x: any) => String((x as any).source_type || '') === 'youtube_timedtext')
        || youtubeRows[0]
        || null;

      if (youtubeCache && Array.isArray((youtubeCache as any).transcript_segments_json)) {
        segments = (youtubeCache as any).transcript_segments_json;
        transcriptText = segments.map((s: any) => s.text).join(' ');
      } else {
        // Try uploaded video transcript
        const uploadedRows = await transcriptRepo.find({
          where: {
            lesson_id: lessonId,
            source_type: 'uploaded_video',
          } as any,
          order: { updated_at: 'DESC' } as any,
        });

        const uploadedCache = uploadedRows.find((x: any) => hasSegments(x)) || uploadedRows[0] || null;
        if (uploadedCache && Array.isArray((uploadedCache as any).transcript_segments_json)) {
          segments = (uploadedCache as any).transcript_segments_json;
          transcriptText = segments.map((s: any) => s.text).join(' ');
        }
      }
    }

    return {
      transcript: transcriptText,
      segments: segments.map((s: any) => ({
        start_sec: s.start_sec,
        end_sec: s.end_sec,
        text: s.text,
      })),
    };
  }

  async getLessonTranscriptChunkForLearner(
    subjectUserId: number,
    courseId: number,
    lessonId: number,
    fromSec: number,
    toSec: number
  ): Promise<{ transcript: string | null; segments: any[] }> {
    await this.ensureEnrolledLearner(subjectUserId, courseId);
    await this.ensureCanAccessLesson(subjectUserId, courseId, lessonId);

    const lessonRepo = AppDataSource.getRepository(Lesson);
    const lesson = await lessonRepo.findOne({ where: { id: lessonId } as any });
    if (!lesson) throw new Error('Lesson not found');

    const transcriptRepo = AppDataSource.getRepository(LessonTranscriptCache);
    const lessonType = String((lesson as any).lesson_type || '');

    let segments: any[] = [];

    if (lessonType === 'video') {
      // Get all segments
      const youtubeRows = await transcriptRepo.find({
        where: {
          lesson_id: lessonId,
          source_type: In(['youtube_stt', 'youtube_timedtext', 'youtube']),
        } as any,
        order: { updated_at: 'DESC' } as any,
      });

      const hasSegments = (x: any) =>
        Boolean(x && Array.isArray((x as any).transcript_segments_json) && (x as any).transcript_segments_json.length > 0);

      const youtubeCache = youtubeRows.find((x: any) => String((x as any).source_type || '') === 'youtube_stt' && hasSegments(x))
        || youtubeRows.find((x: any) => String((x as any).source_type || '') === 'youtube_timedtext' && hasSegments(x))
        || youtubeRows.find((x: any) => String((x as any).source_type || '') === 'youtube' && hasSegments(x))
        || null;

      if (youtubeCache && Array.isArray((youtubeCache as any).transcript_segments_json)) {
        segments = (youtubeCache as any).transcript_segments_json;
      } else {
        // Try uploaded video transcript
        const uploadedRows = await transcriptRepo.find({
          where: {
            lesson_id: lessonId,
            source_type: 'uploaded_video',
          } as any,
          order: { updated_at: 'DESC' } as any,
        });

        const uploadedCache = uploadedRows.find((x: any) => hasSegments(x)) || uploadedRows[0] || null;
        if (uploadedCache && Array.isArray((uploadedCache as any).transcript_segments_json)) {
          segments = (uploadedCache as any).transcript_segments_json;
        }
      }
    }

    // Filter segments within the time range
    const filteredSegments = segments.filter((s: any) => {
      const start = Number(s.start_sec);
      const end = Number(s.end_sec);
      return (start >= fromSec && start <= toSec) || (end >= fromSec && end <= toSec) || (start <= fromSec && end >= toSec);
    });

    const transcriptText = filteredSegments.map((s: any) => s.text).join(' ');

    return {
      transcript: transcriptText,
      segments: filteredSegments.map((s: any) => ({
        start_sec: s.start_sec,
        end_sec: s.end_sec,
        text: s.text,
      })),
    };
  }
}