import { Length, IsOptional, IsNumber, IsEnum, IsDateString } from 'class-validator';
import { RequestDto } from '../../../shared/request-dto';

export class CreateLiveSessionBody extends RequestDto {
  @IsNumber()
  courseId: number;

  @Length(1, 255)
  title: string;

  @IsOptional()
  description?: string | null;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string | null;

  constructor(body: any) {
    super();
    this.courseId = body?.courseId != null ? Number(body.courseId) : 0;
    this.title = String(body?.title || '');
    this.description = body?.description != null ? String(body.description) : null;
    this.scheduledAt = body?.scheduledAt != null && String(body.scheduledAt).trim()
      ? String(body.scheduledAt)
      : null;
  }
}

export class UpdateLiveSessionBody extends RequestDto {
  @IsOptional()
  @Length(1, 255)
  title?: string;

  @IsOptional()
  description?: string | null;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string | null;

  constructor(body: any) {
    super();
    if (body?.title != null) this.title = String(body.title);
    if ('description' in (body || {})) {
      this.description = body.description != null ? String(body.description) : null;
    }
    if ('scheduledAt' in (body || {})) {
      this.scheduledAt = body.scheduledAt != null && String(body.scheduledAt).trim()
        ? String(body.scheduledAt)
        : null;
    }
  }
}

export class ListLiveSessionQuery extends RequestDto {
  @IsOptional()
  @IsNumber()
  courseId?: number;

  @IsOptional()
  @IsNumber()
  hostId?: number;

  @IsOptional()
  @IsEnum(['scheduled', 'live', 'ended'])
  status?: 'scheduled' | 'live' | 'ended';

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  page_size?: number;

  constructor(query: any) {
    super();
    if (query?.courseId != null) this.courseId = Number(query.courseId);
    if (query?.hostId != null) this.hostId = Number(query.hostId);
    if (query?.status != null) this.status = String(query.status) as any;
    if (query?.page != null) this.page = Number(query.page);
    if (query?.page_size != null) this.page_size = Number(query.page_size);
  }
}
