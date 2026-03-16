import AppDataSource from '../../../../../lib/database';
import { getSignedDeliveryUrl } from '../../../lib/cloudinary';
import Course from '../../../../../internal/model/course';
import CourseInstructor from '../../../../../internal/model/course_instructor';
import CourseEnrollment from '../../../../../internal/model/course_enrollment';
import Module from '../../../../../internal/model/modules';
import Lesson from '../../../../../internal/model/lesson';
import LessonResource from '../../../../../internal/model/lesson_resource';
import UserRole from '../../../../../internal/model/user_roles';
import Role from '../../../../../internal/model/role';

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

async function ensureUserIsCourseManager(userId: number) {
  const userRoleRepo = AppDataSource.getRepository(UserRole);
  const roleRepo = AppDataSource.getRepository(Role);
  const userRoles = await userRoleRepo.find({ where: { user_id: userId } });
  if (!userRoles.length) throw new Error('Bạn không có quyền thực hiện thao tác này.');

  const roleIds = userRoles.map((ur) => ur.role_id);
  const roles = await roleRepo.findByIds(roleIds);
  const names = roles.map((r) => r.name);
  const ok = names.includes('course_manager') || names.includes('teacher') || names.includes('admin');
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

export class CourseServiceImpl implements CourseService {
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
    await ensureUserIsCourseManager(subjectUserId);
    await this.ensureOwnCourse(subjectUserId, courseId);

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
      url: r.url,
      filename: r.filename ?? null,
      mime_type: r.mime_type ?? null,
      size_bytes: r.size_bytes ?? null,
      preview_url: (r as any).preview_url ?? null,
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

    const url = (resource as any).url;
    const signedUrl = getSignedDeliveryUrl(url);
    return {
      url: signedUrl,
      mime_type: (resource as any).mime_type ?? null,
      filename: (resource as any).filename ?? null,
    };
  }
}

