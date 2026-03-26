import { Length, validate, IsOptional, IsNumber, Min, IsEnum, Max } from 'class-validator';
import { ValidationResult } from '../../../shared/validation';
import { CourseSortBy, CourseStatus, LessonType, SortDir } from '../types';

class RequestDto {
  async validate(): Promise<ValidationResult> {
    try {
      const validationErrors = await validate(this, { forbidUnknownValues: false });
      if (validationErrors && validationErrors.length > 0) {
        return { ok: false, errors: validationErrors };
      }
      return { ok: true, errors: [] };
    } catch {
      return { ok: false, errors: [] };
    }
  }
}

export class CreateCourseBody extends RequestDto {
  @Length(1, 255)
  title: string;

  short_description?: string | null;
  full_description?: string | null;
  level?: string | null;
  language?: string | null;
  thumbnail_url?: string | null;
  publish_scheduled_at?: string | null;
  learning_objectives?: string[] | null;
  prerequisites?: string[] | null;

  constructor(body: any) {
    super();
    this.title = String(body?.title || '');
    this.short_description = body?.short_description != null ? String(body.short_description) : null;
    this.full_description = body?.full_description != null ? String(body.full_description) : null;
    this.level = body?.level != null ? String(body.level) : null;
    this.language = body?.language != null ? String(body.language) : null;
    this.thumbnail_url = body?.thumbnail_url != null ? String(body.thumbnail_url) : null;
    this.publish_scheduled_at = body?.publish_scheduled_at != null ? String(body.publish_scheduled_at) : null;
    this.learning_objectives = Array.isArray(body?.learning_objectives)
      ? body.learning_objectives.map((x: any) => String(x))
      : null;
    this.prerequisites = Array.isArray(body?.prerequisites)
      ? body.prerequisites.map((x: any) => String(x))
      : null;
  }
}

export class UpdateCourseBody extends RequestDto {
  title?: string;
  short_description?: string | null;
  full_description?: string | null;
  level?: string | null;
  language?: string | null;
  thumbnail_url?: string | null;
  publish_scheduled_at?: string | null;
  learning_objectives?: string[] | null;
  prerequisites?: string[] | null;

  constructor(body: any) {
    super();
    if (body?.title != null) this.title = String(body.title);
    if ('short_description' in (body || {})) this.short_description = body.short_description != null ? String(body.short_description) : null;
    if ('full_description' in (body || {})) this.full_description = body.full_description != null ? String(body.full_description) : null;
    if ('level' in (body || {})) this.level = body.level != null ? String(body.level) : null;
    if ('language' in (body || {})) this.language = body.language != null ? String(body.language) : null;
    if ('thumbnail_url' in (body || {})) this.thumbnail_url = body.thumbnail_url != null ? String(body.thumbnail_url) : null;
    if ('publish_scheduled_at' in (body || {})) this.publish_scheduled_at = body.publish_scheduled_at != null ? String(body.publish_scheduled_at) : null;
    if ('learning_objectives' in (body || {})) {
      this.learning_objectives = Array.isArray(body?.learning_objectives)
        ? body.learning_objectives.map((x: any) => String(x))
        : null;
    }
    if ('prerequisites' in (body || {})) {
      this.prerequisites = Array.isArray(body?.prerequisites)
        ? body.prerequisites.map((x: any) => String(x))
        : null;
    }
  }
}

export class ListMyCoursesQuery extends RequestDto {
  status?: CourseStatus | 'all';
  q?: string;
  page?: number;
  page_size?: number;
  sort_by?: CourseSortBy;
  sort_dir?: SortDir;

  constructor(query: any) {
    super();
    if (query?.status != null) this.status = String(query.status) as any;
    if (query?.q != null) this.q = String(query.q);
    if (query?.page != null) this.page = Number(query.page);
    if (query?.page_size != null) this.page_size = Number(query.page_size);
    if (query?.sort_by != null) this.sort_by = String(query.sort_by) as any;
    if (query?.sort_dir != null) this.sort_dir = String(query.sort_dir).toLowerCase() as any;
  }
}

export class ListPublishedCoursesQuery extends RequestDto {
  q?: string;
  level?: string;
  language?: string;
  page?: number;
  page_size?: number;
  sort_by?: 'title' | 'created_at' | 'learners_count';
  sort_dir?: SortDir;

  constructor(query: any) {
    super();
    if (query?.q != null) this.q = String(query.q);
    if (query?.level != null) this.level = String(query.level);
    if (query?.language != null) this.language = String(query.language);
    if (query?.page != null) this.page = Number(query.page);
    if (query?.page_size != null) this.page_size = Number(query.page_size);
    if (query?.sort_by != null) this.sort_by = String(query.sort_by) as any;
    if (query?.sort_dir != null) this.sort_dir = String(query.sort_dir).toLowerCase() as any;
  }
}

export class SetCourseStatusBody extends RequestDto {
  @Length(1, 20)
  status: CourseStatus;

  constructor(body: any) {
    super();
    this.status = String(body?.status || '') as CourseStatus;
  }
}

export class CreateModuleBody extends RequestDto {
  @Length(1, 255)
  title: string;
  description?: string | null;
  open_at?: string | null;

  constructor(body: any) {
    super();
    this.title = String(body?.title || '');
    this.description = body?.description != null ? String(body.description) : null;
    this.open_at = body?.open_at != null && String(body.open_at).trim() ? String(body.open_at) : null;
  }
}

export class UpdateModuleBody extends RequestDto {
  title?: string;
  description?: string | null;
  open_at?: string | null;

  constructor(body: any) {
    super();
    if (body?.title != null) this.title = String(body.title);
    if ('description' in (body || {})) this.description = body?.description != null ? String(body.description) : null;
    if ('open_at' in (body || {})) this.open_at = body.open_at != null && String(body.open_at).trim() ? String(body.open_at) : null;
  }
}

export class CreateLessonBody extends RequestDto {
  @Length(1, 255)
  title: string;
  description?: string | null;
  @Length(1, 20)
  lesson_type: LessonType;
  open_at?: string | null;

  constructor(body: any) {
    super();
    this.title = String(body?.title || '');
    this.description = body?.description != null ? String(body.description) : null;
    this.lesson_type = String(body?.lesson_type || 'text') as LessonType;
    this.open_at = body?.open_at != null && String(body.open_at).trim() ? String(body.open_at) : null;
  }
}

export class UpdateLessonBody extends RequestDto {
  title?: string;
  description?: string | null;
  lesson_type?: LessonType;
  open_at?: string | null;

  constructor(body: any) {
    super();
    if (body?.title != null) this.title = String(body.title);
    if ('description' in (body || {})) this.description = body?.description != null ? String(body.description) : null;
    if (body?.lesson_type != null) this.lesson_type = String(body.lesson_type) as LessonType;
    if ('open_at' in (body || {})) this.open_at = body.open_at != null && String(body.open_at).trim() ? String(body.open_at) : null;
  }
}

export class ReorderContentBody extends RequestDto {
  modules: { id: number; order_index: number }[];
  lessons: { id: number; module_id: number; order_index: number }[];

  constructor(body: any) {
    super();
    this.modules = Array.isArray(body?.modules)
      ? body.modules.map((x: any) => ({ id: Number(x?.id), order_index: Number(x?.order_index) }))
      : [];
    this.lessons = Array.isArray(body?.lessons)
      ? body.lessons.map((x: any) => ({
          id: Number(x?.id),
          module_id: Number(x?.module_id),
          order_index: Number(x?.order_index),
        }))
      : [];
  }
}

export class CreateLessonYoutubeResourceBody extends RequestDto {
  @Length(5, 500)
  youtube_url: string;
  title?: string | null;

  constructor(body: any) {
    super();
    this.youtube_url = String(body?.youtube_url || '');
    this.title = body?.title != null ? String(body.title) : null;
  }
}

export class LearnerLessonProgressBody extends RequestDto {
  @IsNumber()
  @Min(1)
  delta_seconds: number;

  constructor(body: any) {
    super();
    this.delta_seconds = Number(body?.delta_seconds);
  }
}

export class UpdateCourseCompletionRulesBody extends RequestDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  video_min_seconds?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  video_min_percent?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  text_min_seconds?: number;

  constructor(body: any) {
    super();
    if (body?.video_min_seconds != null) this.video_min_seconds = Number(body.video_min_seconds);
    if (body?.video_min_percent != null) this.video_min_percent = Number(body.video_min_percent);
    if (body?.text_min_seconds != null) this.text_min_seconds = Number(body.text_min_seconds);
  }
}