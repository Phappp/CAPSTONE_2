import { In } from 'typeorm';
import AppDataSource from '../../../../../lib/database';
import { getSignedDeliveryUrl } from '../../../lib/cloudinary';
import Course from '../../../../../internal/model/course';
import CourseInstructor from '../../../../../internal/model/course_instructor';
import CourseEnrollment from '../../../../../internal/model/course_enrollment';
import Module from '../../../../../internal/model/modules';
import Lesson from '../../../../../internal/model/lesson';
import LessonResource from '../../../../../internal/model/lesson_resource';
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

import {
  CourseDashboardStats,
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
  CoursePrerequisiteGraph,
  CoursePrerequisiteGraphNode,
  CoursePrerequisiteGraphEdge,
  ManualQuizDetailResult,
  ManualQuizUpsertRequest,
  ManualQuizQuestionInput,
  LearnerQuizTakePayload,
  LearnerQuizSubmitRequest,
  LearnerQuizSubmitResult,
  QuizLearnerScoresResult,
  QuizLearnerScoresRow,
  QuizLearnerAttemptRow,
} from '../types';

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
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

async function isUserCourseManager(userId: number): Promise<boolean> {
  const userRoleRepo = AppDataSource.getRepository(UserRole);
  const roleRepo = AppDataSource.getRepository(Role);
  const userRoles = await userRoleRepo.find({ where: { user_id: userId } });
  if (!userRoles.length) return false;

  const roleIds = userRoles.map((ur) => ur.role_id);
  const roles = await roleRepo.findByIds(roleIds);
  const names = roles.map((r) => r.name);
  return names.includes('course_manager') || names.includes('teacher') || names.includes('admin');
}

async function ensureUserIsCourseManager(userId: number) {
  const ok = await isUserCourseManager(userId);
  if (!ok) throw new Error('Bạn không có quyền thực hiện thao tác này.');
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
    thumbnail_url,
    level: String(row.level),
    language: String(row.language),
    learning_objectives: safeJsonParse<string[] | null>(row.learning_objectives ?? null, null),
    prerequisites: safeJsonParse<string[] | null>(row.prerequisites ?? null, null),
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
    total_duration_minutes: row.total_duration_minutes ? Number(row.total_duration_minutes) : null,
    // COUNT(*) from SQL drivers thường trả về string ("0"/"1"), nên ép kiểu số.
    is_enrolled: Number(row.is_enrolled ?? 0) > 0,
    can_enroll: row.can_enroll == null ? true : Boolean(row.can_enroll),
    instructors: safeJsonParse<any[]>(row.instructors, []),
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

export class CourseServiceImpl implements CourseService {
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
        published_at: r.c_published_at ?? r.published_at,
        learners_count: r.learners_count,
        modules_count: r.modules_count,
        lessons_count: r.lessons_count,
        total_duration_minutes: r.total_duration_minutes,
        is_enrolled: r.is_enrolled,
        can_enroll: subjectUserId ? canEnrollByPrerequisite : true,
        instructors: r.instructors,
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
      total_duration_minutes: raw.total_duration_minutes ? Number(raw.total_duration_minutes) : null,
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

    const attachFlags = await this.loadLessonAttachmentFlags((lessons as any[]).map((l) => Number(l.id)));
    const lessonByModule = new Map<number, CourseLessonItem[]>();
    for (const l of lessons as any[]) {
      const lid = Number(l.id);
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

  // Enrollment methods
  async enrollCourse(subjectUserId: number, courseId: number): Promise<EnrollmentResult> {
    const courseRepo = AppDataSource.getRepository(Course);
    const enrollmentRepo = AppDataSource.getRepository(CourseEnrollment);

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

    // Check if user is enrolled
    const enrollment = await enrollmentRepo.findOne({
      where: { user_id: subjectUserId, course_id: courseId } as any,
      relations: ['course'],
    });

    if (!enrollment) {
      throw new Error('Bạn chưa đăng ký khóa học này.');
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

    const attachFlagsLearning = await this.loadLessonAttachmentFlags((lessons as any[]).map((l) => Number(l.id)));
    const lessonByModule = new Map<number, CourseLessonItem[]>();
    for (const l of lessons as any[]) {
      const lid = Number(l.id);
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
      where: { user_id: subjectUserId, course_id: courseId } as any,
    });
    if (!enrollment) throw new Error('Bạn chưa đăng ký khóa học này.');
    return enrollment as any;
  }

  private async ensureCanAccessLesson(subjectUserId: number, courseId: number, lessonId: number): Promise<void> {
    const isManager = await isUserCourseManager(subjectUserId);
    if (isManager) {
      await this.ensureOwnCourse(subjectUserId, courseId);
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
    await this.ensureOwnCourse(subjectUserId, courseId);

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
    await this.ensureOwnCourse(subjectUserId, courseId);

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

    const course = courseRepo.create({
      title: request.title,
      slug,
      short_description: request.short_description ?? null,
      full_description: request.full_description ?? null,
      thumbnail_url: request.thumbnail_url ?? null,
      learning_objectives: request.learning_objectives ?? null,
      prerequisites: prerequisiteIds.length ? prerequisiteIds.map(String) : null,
      level: request.level ?? 'beginner',
      language: request.language ?? 'vi',
      status: shouldAutoPublish ? 'published' : 'draft',
      published_at: shouldAutoPublish ? scheduledAt : null,
      publish_scheduled_at: !shouldAutoPublish ? scheduledAt : null,
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
    await ensureUserIsCourseManager(subjectUserId);

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

    const items = raw.map((r: any) => {
      // raw contains both c_* columns and extra selects. TypeORM names may vary; map defensively.
      const row = {
        id: r.c_id ?? r.id,
        title: r.c_title ?? r.title,
        slug: r.c_slug ?? r.slug,
        short_description: r.c_short_description ?? r.short_description,
        thumbnail_url: r.c_thumbnail_url ?? r.thumbnail_url,
        level: r.c_level ?? r.level,
        language: r.c_language ?? r.language,
        status: r.c_status ?? r.status,
        published_at: r.c_published_at ?? r.published_at,
        created_at: r.c_created_at ?? r.created_at,
        updated_at: r.c_updated_at ?? r.updated_at,
        learners_count: r.learners_count,
        modules_count: r.modules_count,
        lessons_count: r.lessons_count,
      };
      return mapCourseRowToItem(row);
    });

    return {
      items,
      page,
      page_size: pageSize,
      total,
    };
  }

  async getMyCourseDashboardStats(subjectUserId: number): Promise<CourseDashboardStats> {
    await ensureUserIsCourseManager(subjectUserId);
    const courseRepo = AppDataSource.getRepository(Course);

    const total = await courseRepo.count({ where: { created_by: subjectUserId, deleted_at: null as any } });
    const draft = await courseRepo.count({ where: { created_by: subjectUserId, status: 'draft', deleted_at: null as any } });
    const published = await courseRepo.count({ where: { created_by: subjectUserId, status: 'published', deleted_at: null as any } });
    const archived = await courseRepo.count({ where: { created_by: subjectUserId, status: 'archived', deleted_at: null as any } });

    return { total, draft, published, archived };
  }

  async getMyCourseDetail(subjectUserId: number, courseId: number): Promise<CourseListItem> {
    await ensureUserIsCourseManager(subjectUserId);
    const courseRepo = AppDataSource.getRepository(Course);

    const qb = courseRepo.createQueryBuilder('c');
    qb.where('c.id = :id', { id: courseId });
    qb.andWhere('c.created_by = :uid', { uid: subjectUserId });
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
      thumbnail_url: raw.c_thumbnail_url ?? raw.thumbnail_url,
      level: raw.c_level ?? raw.level,
      language: raw.c_language ?? raw.language,
      learning_objectives: raw.c_learning_objectives ?? raw.learning_objectives,
      prerequisites: raw.c_prerequisites ?? raw.prerequisites,
      status: raw.c_status ?? raw.status,
      published_at: raw.c_published_at ?? raw.published_at,
      created_at: raw.c_created_at ?? raw.created_at,
      updated_at: raw.c_updated_at ?? raw.updated_at,
      learners_count: raw.learners_count,
      modules_count: raw.modules_count,
      lessons_count: raw.lessons_count,
    };
    return mapCourseRowToItem(row);
  }

  async getMyCourseManagerOverview(subjectUserId: number, courseId: number): Promise<CourseManagerOverview> {
    await ensureUserIsCourseManager(subjectUserId);
    await this.ensureOwnCourse(subjectUserId, courseId);

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
    const root = await this.ensureOwnCourse(subjectUserId, courseId);
    return this.buildPrerequisiteGraph(root as any, subjectUserId, 'published_or_own');
  }

  async listMyCoursePrerequisiteOptions(subjectUserId: number, courseId: number): Promise<CoursePrerequisiteOption[]> {
    await ensureUserIsCourseManager(subjectUserId);
    const ownCourse = await this.ensureOwnCourse(subjectUserId, courseId);
    const selectedSet = new Set<number>(parsePrerequisiteCourseIds((ownCourse as any).prerequisites));
    const courseRepo = AppDataSource.getRepository(Course);
    const now = new Date();

    const candidates = await courseRepo
      .createQueryBuilder('c')
      .where('c.deleted_at IS NULL')
      .andWhere('c.id <> :courseId', { courseId })
      .andWhere(
        `(c.status = :published OR (c.status = :draft AND c.publish_scheduled_at IS NOT NULL AND c.publish_scheduled_at <= :now) OR c.created_by = :uid)`,
        { published: 'published', draft: 'draft', now, uid: subjectUserId }
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

    if (request.title != null) {
      course.title = request.title;
    }
    if ('short_description' in request) course.short_description = request.short_description ?? null;
    if ('full_description' in request) course.full_description = request.full_description ?? null;
    if ('thumbnail_url' in request) course.thumbnail_url = request.thumbnail_url ?? null;
    if ('learning_objectives' in request) course.learning_objectives = request.learning_objectives ?? null;
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
        course.status = 'published';
        course.published_at = scheduledAt;
        (course as any).publish_scheduled_at = null;
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

    if (status === 'published') {
      course.status = 'published';
      course.published_at = course.published_at ?? new Date();
      (course as any).publish_scheduled_at = null;
    } else if (status === 'draft') {
      course.status = 'draft';
      course.published_at = null;
      (course as any).publish_scheduled_at = null;
    } else if (status === 'archived') {
      course.status = 'archived';
      (course as any).publish_scheduled_at = null;
    } else {
      throw new Error('Trạng thái không hợp lệ.');
    }

    await courseRepo.save(course);
  }

  async softDeleteMyCourse(subjectUserId: number, courseId: number): Promise<void> {
    await ensureUserIsCourseManager(subjectUserId);
    const courseRepo = AppDataSource.getRepository(Course);
    const course = await courseRepo.findOne({ where: { id: courseId, created_by: subjectUserId } as any });
    if (!course || (course as any).deleted_at) throw new Error('Không tìm thấy khóa học.');
    await courseRepo.softRemove(course);
  }

  private async ensureOwnCourse(subjectUserId: number, courseId: number) {
    const courseRepo = AppDataSource.getRepository(Course);
    const course = await courseRepo.findOne({ where: { id: courseId, created_by: subjectUserId } as any });
    if (!course || (course as any).deleted_at) throw new Error('Không tìm thấy khóa học.');
    return course;
  }

  async getMyCourseContentTree(subjectUserId: number, courseId: number): Promise<CourseContentTree> {
    await ensureUserIsCourseManager(subjectUserId);
    await this.ensureOwnCourse(subjectUserId, courseId);

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

    const attachFlagsTree = await this.loadLessonAttachmentFlags((lessons as any[]).map((l) => Number(l.id)));
    const lessonByModule = new Map<number, CourseLessonItem[]>();
    for (const l of lessons as any[]) {
      const lid = Number(l.id);
      const arr = lessonByModule.get(l.module_id) || [];
      arr.push({
        id: l.id,
        module_id: l.module_id,
        title: l.title,
        description: l.description ?? null,
        lesson_type: (l.lesson_type || 'text') as LessonType,
        order_index: l.order_index,
        open_at: l.open_at ? new Date(l.open_at).toISOString() : null,
        has_quiz: attachFlagsTree.hasQuiz.has(lid),
        has_assignment: attachFlagsTree.hasAssignment.has(lid),
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
      lessons: lessonByModule.get(m.id) || [],
    }));

    return {
      course_id: courseId,
      modules: moduleItems,
    };
  }

  async createModule(subjectUserId: number, courseId: number, request: CreateModuleRequest): Promise<{ id: number }> {
    await ensureUserIsCourseManager(subjectUserId);
    await this.ensureOwnCourse(subjectUserId, courseId);

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
    await this.ensureOwnCourse(subjectUserId, courseId);

    const moduleRepo = AppDataSource.getRepository(Module);
    const mod = await moduleRepo.findOne({ where: { id: moduleId, course_id: courseId } as any });
    if (!mod) throw new Error('Không tìm thấy module.');
    if (request.title != null) (mod as any).title = request.title;
    if ('description' in request) (mod as any).description = request.description ?? null;
    if ('open_at' in request) (mod as any).open_at = parseNullableDateTime((request as any)?.open_at);
    await moduleRepo.save(mod as any);
  }

  async deleteModule(subjectUserId: number, courseId: number, moduleId: number): Promise<void> {
    await ensureUserIsCourseManager(subjectUserId);
    await this.ensureOwnCourse(subjectUserId, courseId);
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
    await this.ensureOwnCourse(subjectUserId, courseId);

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
    await this.ensureOwnCourse(subjectUserId, courseId);

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
    await lessonRepo.save(lesson as any);
  }

  async deleteLesson(subjectUserId: number, courseId: number, lessonId: number): Promise<void> {
    await ensureUserIsCourseManager(subjectUserId);
    await this.ensureOwnCourse(subjectUserId, courseId);

    const lessonRepo = AppDataSource.getRepository(Lesson);
    const moduleRepo = AppDataSource.getRepository(Module);
    const lesson = await lessonRepo.findOne({ where: { id: lessonId } as any });
    if (!lesson) throw new Error('Không tìm thấy bài học.');
    const mod = await moduleRepo.findOne({ where: { id: (lesson as any).module_id, course_id: courseId } as any });
    if (!mod) throw new Error('Không tìm thấy bài học.');
    await lessonRepo.delete({ id: lessonId } as any);
  }

  async reorderCourseContent(subjectUserId: number, courseId: number, request: ReorderCourseContentRequest): Promise<void> {
    await ensureUserIsCourseManager(subjectUserId);
    await this.ensureOwnCourse(subjectUserId, courseId);

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

    const resources = await resourceRepo.find({
      where: { lesson_id: lessonId } as any,
      order: { created_at: 'DESC', id: 'DESC' } as any,
    });

    return (resources as any[]).map((r) => ({
      id: r.id,
      lesson_id: r.lesson_id,
      resource_type: r.resource_type,
      url: r.url ? getSignedDeliveryUrl(r.url) : r.url,
      filename: r.filename ?? null,
      mime_type: r.mime_type ?? null,
      size_bytes: r.size_bytes ?? null,
      preview_url: (r as any).preview_url ? getSignedDeliveryUrl((r as any).preview_url) : null,
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
    await this.ensureOwnCourse(subjectUserId, courseId);

    const lessonRepo = AppDataSource.getRepository(Lesson);
    const moduleRepo = AppDataSource.getRepository(Module);
    const resourceRepo = AppDataSource.getRepository(LessonResource);

    const lesson = await lessonRepo.findOne({ where: { id: lessonId } as any });
    if (!lesson) throw new Error('Không tìm thấy bài học.');
    const mod = await moduleRepo.findOne({ where: { id: (lesson as any).module_id, course_id: courseId } as any });
    if (!mod) throw new Error('Không tìm thấy bài học.');

    const isImage = file.mime_type && file.mime_type.startsWith('image/');

    const entity = resourceRepo.create({
      lesson_id: lessonId,
      resource_type: 'file',
      url: file.url,
      filename: file.filename,
      mime_type: file.mime_type,
      size_bytes: file.size_bytes,
      preview_url: isImage ? file.url : null,
    } as any);
    const saved = await resourceRepo.save(entity as any);
    return { id: (saved as any).id };
  }

  async updateLessonResourcePreview(
    subjectUserId: number,
    courseId: number,
    resourceId: number,
    file: { filename: string; mime_type: string; size_bytes: number; url: string }
  ): Promise<void> {
    await ensureUserIsCourseManager(subjectUserId);
    await this.ensureOwnCourse(subjectUserId, courseId);

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
    await this.ensureOwnCourse(subjectUserId, courseId);

    const resourceRepo = AppDataSource.getRepository(LessonResource);
    const lessonRepo = AppDataSource.getRepository(Lesson);
    const moduleRepo = AppDataSource.getRepository(Module);

    const resource = await resourceRepo.findOne({ where: { id: resourceId } as any });
    if (!resource) throw new Error('Không tìm thấy tài nguyên.');

    const lesson = await lessonRepo.findOne({ where: { id: (resource as any).lesson_id } as any });
    if (!lesson) throw new Error('Không tìm thấy tài nguyên.');
    const mod = await moduleRepo.findOne({ where: { id: (lesson as any).module_id, course_id: courseId } as any });
    if (!mod) throw new Error('Không tìm thấy tài nguyên.');

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
      await this.ensureOwnCourse(subjectUserId, courseId);
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
    await this.ensureOwnCourse(subjectUserId, courseId);

    const lessonRepo = AppDataSource.getRepository(Lesson);
    const moduleRepo = AppDataSource.getRepository(Module);
    const resourceRepo = AppDataSource.getRepository(LessonResource);

    const lesson = await lessonRepo.findOne({ where: { id: lessonId } as any });
    if (!lesson) throw new Error('Không tìm thấy bài học.');
    const mod = await moduleRepo.findOne({ where: { id: (lesson as any).module_id, course_id: courseId } as any });
    if (!mod) throw new Error('Không tìm thấy bài học.');

    const url = String(request.youtube_url || '').trim();
    if (!url) throw new Error('Vui lòng nhập link YouTube.');

    const entity = resourceRepo.create({
      lesson_id: lessonId,
      resource_type: 'video',
      url,
      filename: request.title ? String(request.title) : null,
      mime_type: null,
      size_bytes: null,
      preview_url: null,
    } as any);
    const saved = await resourceRepo.save(entity as any);
    return { id: Number((saved as any).id) };
  }

  async getManualQuizForLesson(
    subjectUserId: number,
    courseId: number,
    lessonId: number
  ): Promise<ManualQuizDetailResult | null> {
    await ensureUserIsCourseManager(subjectUserId);
    await this.ensureOwnCourse(subjectUserId, courseId);

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
    await this.ensureOwnCourse(subjectUserId, courseId);

    const title = String(request?.title || '').trim();
    if (!title) throw new Error('Vui lòng nhập tiêu đề quiz.');
    const validated = validateManualQuizQuestions(request.questions);

    const lessonRepo = AppDataSource.getRepository(Lesson);
    const moduleRepo = AppDataSource.getRepository(Module);

    const lesson = await lessonRepo.findOne({ where: { id: lessonId } as any });
    if (!lesson) throw new Error('Không tìm thấy bài học.');
    const mod = await moduleRepo.findOne({ where: { id: (lesson as any).module_id, course_id: courseId } as any });
    if (!mod) throw new Error('Không tìm thấy bài học.');

    return await AppDataSource.transaction(async (manager) => {
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
        const bank = qBankRepo.create({
          course_id: courseId,
          name: `Quiz thủ công — ${String((lesson as any).title || 'bài học')}`,
          description: null,
          created_by: subjectUserId,
          is_shared: false,
        } as any);
        const savedBank = await qBankRepo.save(bank as any);
        bankId = Number((savedBank as any).id);
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
    for (const m of maps as any[]) {
      const bq = m.bankQuestion;
      if (!bq) continue;
      const rawOpts = await qOptRepo.find({
        where: { quiz_question_id: Number(m.id) } as any,
        order: { order_index: 'ASC' } as any,
      });
      if (!rawOpts.length) continue;

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

      await attRepo.update(
        { id: attemptId } as any,
        {
          score: pct,
          is_passed: isPassed,
          status: 'graded',
        } as any
      );

      if (isPassed) {
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
        try {
          await this.completeLesson(subjectUserId, courseId, lessonId);
        } catch {
          // ignore
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
}