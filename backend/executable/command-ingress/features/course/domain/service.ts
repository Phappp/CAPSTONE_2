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
import UserRole from '../../../../../internal/model/user_roles';
import Role from '../../../../../internal/model/role';
import User from '../../../../../internal/model/user';

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
} from '../types';

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
  return {
    id: Number(row.id),
    title: String(row.title),
    slug: String(row.slug),
    short_description: row.short_description ?? null,
    thumbnail_url,
    level: String(row.level),
    language: String(row.language),
    status: row.status as CourseStatus,
    published_at: row.published_at ? new Date(row.published_at).toISOString() : null,
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
  
  return {
    id: Number(row.id),
    title: String(row.title),
    slug: String(row.slug),
    short_description: row.short_description ?? null,
    thumbnail_url,
    level: String(row.level),
    language: String(row.language),
    published_at: row.published_at ? new Date(row.published_at).toISOString() : null,
    learners_count: Number(row.learners_count ?? 0),
    modules_count: Number(row.modules_count ?? 0),
    lessons_count: Number(row.lessons_count ?? 0),
    total_duration_minutes: row.total_duration_minutes ? Number(row.total_duration_minutes) : null,
    is_enrolled: row.is_enrolled === 1,
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

export class CourseServiceImpl implements CourseService {
  // Public methods - Course catalog
  async listPublishedCourses(
    subjectUserId: number | undefined, 
    query: PublishedCourseListQuery
  ): Promise<PublishedCourseListResult> {
    const courseRepo = AppDataSource.getRepository(Course);

    const page = Number(query.page || 1);
    const pageSize = Math.min(50, Math.max(1, Number(query.page_size || 12)));
    const q = query.q ? String(query.q).trim() : '';

    const qb = courseRepo.createQueryBuilder('c');
    qb.where('c.status = :status', { status: 'published' });
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

    const items = raw.map((r: any) => {
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

    const qb = courseRepo.createQueryBuilder('c');
    qb.where('c.slug = :slug', { slug });
    qb.andWhere('c.status = :status', { status: 'published' });
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

    const lessonByModule = new Map<number, CourseLessonItem[]>();
    for (const l of lessons as any[]) {
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

  // Enrollment methods
  async enrollCourse(subjectUserId: number, courseId: number): Promise<EnrollmentResult> {
    const courseRepo = AppDataSource.getRepository(Course);
    const enrollmentRepo = AppDataSource.getRepository(CourseEnrollment);

    // Check if course exists and is published
    const course = await courseRepo.findOne({ 
      where: { id: courseId, status: 'published', deleted_at: null as any } 
    });
    
    if (!course) {
      throw new Error('Khóa học không tồn tại hoặc chưa được xuất bản.');
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

    const lessonByModule = new Map<number, CourseLessonItem[]>();
    for (const l of lessons as any[]) {
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

  private computeRequiredSecondsForLesson(lesson: Lesson): number {
    const t = String((lesson as any).lesson_type || 'text');
    if (t === 'video') {
      const dm = Number((lesson as any).duration_minutes);
      if (Number.isFinite(dm) && dm > 0) {
        const durSec = Math.round(dm * 60);
        return Math.max(60, Math.round(durSec * 0.7));
      }
      return 60;
    }
    if (t === 'text') return 30;
    // quiz/assignment: treat as at least a minimal engagement time for now.
    return 30;
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
    const { orderedLessons } = await this.loadOrderedLessonsForCourse(courseId);
    const idx = orderedLessons.findIndex((l) => Number((l as any).id) === Number(lessonId));
    if (idx < 0) throw new Error('Bài học không hợp lệ.');
    if (idx === 0) return;

    const prevId = Number((orderedLessons[idx - 1] as any).id);
    const completionRepo = AppDataSource.getRepository(LessonCompletion);
    const prevCompleted = await completionRepo.findOne({ where: { user_id: subjectUserId, lesson_id: prevId } as any });
    if (!prevCompleted) {
      throw new Error('Không thể truy cập bài học.');
    }
  }

  async getMyCourseProgress(subjectUserId: number, courseId: number): Promise<CourseProgressResult> {
    await this.ensureEnrolledLearner(subjectUserId, courseId);

    const { orderedLessons } = await this.loadOrderedLessonsForCourse(courseId);
    const total = orderedLessons.length;

    const completionRepo = AppDataSource.getRepository(LessonCompletion);
    const completedRows = total
      ? await completionRepo
          .createQueryBuilder('lc')
          .select(['lc.lesson_id'])
          .where('lc.user_id = :uid', { uid: subjectUserId })
          .andWhere('lc.lesson_id IN (:...lessonIds)', { lessonIds: orderedLessons.map((l) => (l as any).id) })
          .getRawMany()
      : [];
    const completedSet = new Set<number>(completedRows.map((r: any) => Number(r.lc_lesson_id ?? r.lesson_id)));

    const unlocked: number[] = [];
    let nextLocked: number | null = null;
    for (let i = 0; i < orderedLessons.length; i++) {
      const lessonId = Number((orderedLessons[i] as any).id);
      if (i === 0) {
        unlocked.push(lessonId);
        continue;
      }
      const prevId = Number((orderedLessons[i - 1] as any).id);
      if (completedSet.has(prevId)) {
        unlocked.push(lessonId);
      } else {
        nextLocked = lessonId;
        break;
      }
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

    const { orderedLessons } = await this.loadOrderedLessonsForCourse(courseId);
    const target = orderedLessons.find((l) => Number((l as any).id) === Number(lessonId));
    if (!target) throw new Error('Bài học không hợp lệ.');

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

    const required_seconds = this.computeRequiredSecondsForLesson(target);
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

    const { orderedLessons } = await this.loadOrderedLessonsForCourse(courseId);
    const idx = orderedLessons.findIndex((l) => Number((l as any).id) === Number(lessonId));
    if (idx < 0) throw new Error('Bài học không hợp lệ.');

    // Enforce unlock rule: previous lesson must be completed.
    if (idx > 0) {
      const completionRepo = AppDataSource.getRepository(LessonCompletion);
      const prevId = Number((orderedLessons[idx - 1] as any).id);
      const prevCompleted = await completionRepo.findOne({ where: { user_id: subjectUserId, lesson_id: prevId } as any });
      if (!prevCompleted) throw new Error('Không thể hoàn thành bài học.');
    }

    const completionRepo = AppDataSource.getRepository(LessonCompletion);
    const exists = await completionRepo.findOne({ where: { user_id: subjectUserId, lesson_id: lessonId } as any });
    if (exists) {
      const courseProgress = await this.getMyCourseProgress(subjectUserId, courseId);
      return { lesson_id: lessonId, completed: true, progress_percent: courseProgress.progress_percent };
    }

    const progressRepo = AppDataSource.getRepository(LessonProgress);
    const p = await progressRepo.findOne({ where: { user_id: subjectUserId, course_id: courseId, lesson_id: lessonId } as any });
    const timeSpent = Number((p as any)?.time_spent_seconds ?? 0);
    const required = this.computeRequiredSecondsForLesson(orderedLessons[idx]);
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

  // Instructor methods (existing code)
  async createCourse(subjectUserId: number, request: CreateCourseRequest): Promise<{ id: number }> {
    await ensureUserIsCourseManager(subjectUserId);

    const courseRepo = AppDataSource.getRepository(Course);
    const instructorRepo = AppDataSource.getRepository(CourseInstructor);

    const baseSlug = normalizeSlug(request.title);
    if (!baseSlug) throw new Error('Tiêu đề khóa học không hợp lệ.');

    // Ensure uniqueness with suffix if needed.
    let slug = baseSlug;
    let counter = 1;
    while (await courseRepo.findOne({ where: { slug } })) {
      counter += 1;
      slug = `${baseSlug}-${counter}`;
    }

    const course = courseRepo.create({
      title: request.title,
      slug,
      short_description: request.short_description ?? null,
      full_description: request.full_description ?? null,
      thumbnail_url: request.thumbnail_url ?? null,
      learning_objectives: request.learning_objectives ?? null,
      prerequisites: request.prerequisites ?? null,
      level: request.level ?? 'beginner',
      language: request.language ?? 'vi',
      status: 'draft',
      published_at: null,
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
      thumbnail_url: raw.c_thumbnail_url ?? raw.thumbnail_url,
      level: raw.c_level ?? raw.level,
      language: raw.c_language ?? raw.language,
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

  async updateMyCourse(subjectUserId: number, courseId: number, request: UpdateCourseRequest): Promise<void> {
    await ensureUserIsCourseManager(subjectUserId);
    const courseRepo = AppDataSource.getRepository(Course);

    const course = await courseRepo.findOne({ where: { id: courseId, created_by: subjectUserId } as any });
    if (!course || (course as any).deleted_at) throw new Error('Không tìm thấy khóa học.');

    if (request.title != null) {
      course.title = request.title;
    }
    if ('short_description' in request) course.short_description = request.short_description ?? null;
    if ('full_description' in request) course.full_description = request.full_description ?? null;
    if ('thumbnail_url' in request) course.thumbnail_url = request.thumbnail_url ?? null;
    if ('learning_objectives' in request) course.learning_objectives = request.learning_objectives ?? null;
    if ('prerequisites' in request) course.prerequisites = request.prerequisites ?? null;
    if ('level' in request && request.level) course.level = request.level;
    if ('language' in request && request.language) course.language = request.language;

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
    } else if (status === 'draft') {
      course.status = 'draft';
      course.published_at = null;
    } else if (status === 'archived') {
      course.status = 'archived';
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

    const lessonByModule = new Map<number, CourseLessonItem[]>();
    for (const l of lessons as any[]) {
      const arr = lessonByModule.get(l.module_id) || [];
      arr.push({
        id: l.id,
        module_id: l.module_id,
        title: l.title,
        description: l.description ?? null,
        lesson_type: (l.lesson_type || 'text') as LessonType,
        order_index: l.order_index,
      });
      lessonByModule.set(l.module_id, arr);
    }

    const moduleItems: CourseModuleItem[] = (modules as any[]).map((m) => ({
      id: m.id,
      course_id: m.course_id,
      title: m.title,
      description: m.description ?? null,
      order_index: m.order_index,
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

    const lesson = lessonRepo.create({
      module_id: moduleId,
      title: request.title,
      description: request.description ?? null,
      lesson_type: request.lesson_type || 'text',
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
    if (request.lesson_type != null) (lesson as any).lesson_type = request.lesson_type;
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
}