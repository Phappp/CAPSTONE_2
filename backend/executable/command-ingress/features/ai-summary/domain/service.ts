import { In } from 'typeorm';
import AppDataSource from '../../../../../lib/database';
import crypto from 'crypto';
import env from '../../../utils/env';
import { transcribeYoutubeViaSttService, transcribeVideoViaSttService, YoutubeSttSegment } from './youtube-stt';
import {
  AiSummaryService,
  LessonSummaryPayload,
  LessonSummarySegmentItem,
  LessonSummarySourceType,
} from '../types';
import LessonSummary from '../../../../../internal/model/lesson_summary';
import LessonSummarySegment from '../../../../../internal/model/lesson_summary_segment';
import Lesson from '../../../../../internal/model/lesson';
import LessonResource from '../../../../../internal/model/lesson_resource';
import LessonTranscriptCache from '../../../../../internal/model/lesson_transcript_cache';
import OpenRouterKey from '../../../../../internal/model/openrouter_key';
import OpenRouterSetting from '../../../../../internal/model/openrouter_setting';
import UserRole from '../../../../../internal/model/user_roles';
import Role from '../../../../../internal/model/role';
import Module from '../../../../../internal/model/modules';

type YoutubeTranscriptCue = { start_sec: number; end_sec: number; text: string };

function stripMarkdownJson(raw: string): string {
  let text = String(raw || '').trim();
  text = text.replace(/^```(?:json)?\s*/i, '');
  text = text.replace(/\s*```$/i, '');
  return text.trim();
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

function hashSummarySource(input: string): string {
  return crypto.createHash('sha256').update(String(input || '')).digest('hex');
}

function normalizeSummaryText(input: string): string {
  return String(input || '').replace(/\s+/g, ' ').trim();
}

function splitTextIntoChunks(text: string, maxChars = 2600): string[] {
  const normalized = normalizeSummaryText(text);
  if (!normalized) return [];
  if (normalized.length <= maxChars) return [normalized];
  const sentences = normalized.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let buffer = '';
  for (const sentence of sentences) {
    if (!sentence) continue;
    if (!buffer) {
      buffer = sentence;
      continue;
    }
    if ((buffer + ' ' + sentence).length > maxChars) {
      chunks.push(buffer);
      buffer = sentence;
      continue;
    }
    buffer += ` ${sentence}`;
  }
  if (buffer) chunks.push(buffer);
  return chunks.filter(Boolean);
}

function decodeHtmlEntities(input: string): string {
  return String(input || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function parseYoutubeTranscriptXml(xml: string): YoutubeTranscriptCue[] {
  const rows: YoutubeTranscriptCue[] = [];
  const pattern = /<text\b([^>]*)>([\s\S]*?)<\/text>/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(xml)) !== null) {
    const attrs = match[1];
    const content = match[2];
    const startMatch = /\bstart="([^"]*)"/.exec(attrs);
    const durMatch = /\bdur="([^"]*)"/.exec(attrs);
    const startSec = startMatch ? parseFloat(startMatch[1]) : 0;
    const durSec = durMatch ? parseFloat(durMatch[1]) : 0;
    const endSec = startSec + durSec;
    const text = decodeHtmlEntities(content).trim();
    if (text) rows.push({ start_sec: startSec, end_sec: endSec, text });
  }
  return rows;
}

function toIsoOrNull(input: Date | string | null | undefined): string | null {
  if (!input) return null;
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

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

async function isUserAdmin(userId: number): Promise<boolean> {
  const userRoleRepo = AppDataSource.getRepository(UserRole);
  const roleRepo = AppDataSource.getRepository(Role);
  const userRoles = await userRoleRepo.find({ where: { user_id: userId } });
  if (!userRoles.length) return false;
  const roleIds = userRoles.map((ur) => ur.role_id);
  const roles = await roleRepo.findByIds(roleIds);
  return roles.some((r) => String(r.name).toLowerCase() === 'admin');
}

async function isUserCourseManager(userId: number): Promise<boolean> {
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

export class AiSummaryServiceImpl implements AiSummaryService {
  private summaryJobsInFlight = new Set<number>();
  private youtubeSttJobsInFlight = new Set<number>();
  private uploadedVideoSttJobsInFlight = new Set<number>();
  private startupJobsScheduled = false;

  async scanPendingTranscripts(): Promise<{ queued: number; skipped: number }> {
    if (!env.YOUTUBE_STT_ENABLED) return { queued: 0, skipped: 0 };
    if (this.startupJobsScheduled) return { queued: 0, skipped: 0 };
    this.startupJobsScheduled = true;

    const cacheRepo = AppDataSource.getRepository(LessonTranscriptCache);
    const resourceRepo = AppDataSource.getRepository(LessonResource);

    const pending = await cacheRepo
      .createQueryBuilder('c')
      .where('c.source_type = :type', { type: 'uploaded_video' })
      .andWhere('c.transcript_text IS NULL') // Chưa có transcript thành công
      .andWhere(
        "(c.error_message LIKE 'Đang trích%' OR c.error_message LIKE '%thất bại%' OR c.error_message IS NULL)"
      )
      .getMany();

    let queued = 0, skipped = 0;
    for (const entry of pending as any[]) {
      const lessonId = Number(entry.lesson_id);
      if (this.uploadedVideoSttJobsInFlight.has(lessonId)) {
        skipped++;
        continue;
      }
      const video = await resourceRepo.findOne({
        where: { lesson_id: lessonId, resource_kind: 'video' } as any,
      });
      const videoUrl = String((video as any)?.url || '');
      if (!videoUrl || !videoUrl.startsWith('https://')) {
        skipped++;
        continue;
      }
      this.scheduleUploadedVideoSttJob({ lessonId, videoUrl });
      queued++;
    }
    return { queued, skipped };
  }

  private toLessonSummaryPayload(summary: any, segments: any[], sourceReady: boolean): LessonSummaryPayload {
    return {
      lesson_id: Number(summary?.lesson_id || 0),
      status: String(summary?.status || 'pending') as LessonSummaryPayload['status'],
      source_type: String(summary?.source_type || 'text') as LessonSummarySourceType,
      source_ready: Boolean(sourceReady),
      model: summary?.model ? String(summary.model) : null,
      source_hash: summary?.source_hash ? String(summary.source_hash) : null,
      overall_summary: summary?.overall_summary ? String(summary.overall_summary) : null,
      key_points: Array.isArray(summary?.key_points_json) ? summary.key_points_json.map(String) : [],
      error_message: summary?.error_message ? String(summary.error_message) : null,
      requested_at: toIsoOrNull(summary?.requested_at),
      started_at: toIsoOrNull(summary?.started_at),
      finished_at: toIsoOrNull(summary?.finished_at),
      updated_at: toIsoOrNull(summary?.updated_at),
      segments: (segments || []).map((s: any) => ({
        segment_index: Number(s?.segment_index || 0),
        start_sec: s?.start_sec != null ? Number(s.start_sec) : null,
        end_sec: s?.end_sec != null ? Number(s.end_sec) : null,
        raw_text: String(s?.raw_text || ''),
        summary_text: String(s?.summary_text || ''),
        keywords: Array.isArray(s?.keywords_json) ? s.keywords_json.map(String) : [],
      })) as LessonSummarySegmentItem[],
    };
  }

  private async getLessonSummarySourceReady(lessonId: number, summarySourceType?: string | null): Promise<boolean> {
    const lessonRepo = AppDataSource.getRepository(Lesson);
    const cacheRepo = AppDataSource.getRepository(LessonTranscriptCache);
    const resourceRepo = AppDataSource.getRepository(LessonResource);
    const lesson = await lessonRepo.findOne({ where: { id: lessonId } as any });
    if (!lesson) return false;

    const hasYoutube = await resourceRepo.findOne({
      where: { lesson_id: lessonId, resource_kind: 'youtube' } as any,
      order: { id: 'DESC' } as any,
    });
    const hasUploadedVideo = await resourceRepo.findOne({
      where: { lesson_id: lessonId, resource_kind: 'video' } as any,
      order: { id: 'DESC' } as any,
    });
    const sourceType = String(summarySourceType || '').toLowerCase();

    if (sourceType === 'uploaded_video' || hasUploadedVideo) {
      const caches = await cacheRepo.find({
        where: { lesson_id: lessonId, source_type: 'uploaded_video' } as any,
      });
      const hasSegments = (c: any) =>
        Boolean(c && Array.isArray((c as any).transcript_segments_json) && (c as any).transcript_segments_json.length > 0);
      return caches.some((c: any) => hasSegments(c));
    }

    if (sourceType === 'youtube' || hasYoutube) {
      const caches = await cacheRepo.find({
        where: { lesson_id: lessonId, source_type: In(['youtube_stt', 'youtube_timedtext']) } as any,
      });
      const hasSegments = (c: any) =>
        Boolean(c && Array.isArray((c as any).transcript_segments_json) && (c as any).transcript_segments_json.length > 0);
      const best = caches.find((c: any) => String((c as any).source_type || '') === 'youtube_stt' && hasSegments(c))
        || caches.find((c: any) => String((c as any).source_type || '') === 'youtube_timedtext' && hasSegments(c));
      return Boolean(best);
    }

    const content = normalizeSummaryText(stripHtmlToText(String((lesson as any).description || '')));
    return Boolean(content);
  }

  private extractTranscriptCuesFromCache(cache: any): YoutubeTranscriptCue[] {
    if (!cache || !Array.isArray((cache as any).transcript_segments_json)) return [];
    return ((cache as any).transcript_segments_json as any[])
      .map((x: any) => ({
        start_sec: Number(x?.start_sec || x?.start || 0),
        end_sec: Number(x?.end_sec || x?.end || 0),
        text: String(x?.text || ''),
      }))
      .filter((x: YoutubeTranscriptCue) => normalizeSummaryText(x.text).length > 0);
  }

  private async findBestYoutubeTranscriptCache(lessonId: number): Promise<any | null> {
    const cacheRepo = AppDataSource.getRepository(LessonTranscriptCache);
    const rows = await cacheRepo.find({
      where: {
        lesson_id: lessonId,
        source_type: In(['youtube_stt', 'youtube_timedtext', 'youtube']),
      } as any,
      order: { updated_at: 'DESC' } as any,
    });
    const hasSegments = (x: any) =>
      Boolean(x && Array.isArray((x as any).transcript_segments_json) && (x as any).transcript_segments_json.length > 0);
    return rows.find((x: any) => String((x as any).source_type || '') === 'youtube_stt' && hasSegments(x))
      || rows.find((x: any) => String((x as any).source_type || '') === 'youtube_timedtext' && hasSegments(x))
      || rows.find((x: any) => String((x as any).source_type || '') === 'youtube' && hasSegments(x))
      || rows.find((x: any) => String((x as any).source_type || '') === 'youtube_stt')
      || rows.find((x: any) => String((x as any).source_type || '') === 'youtube_timedtext')
      || rows[0]
      || null;
  }

  private async findBestUploadedVideoTranscriptCache(lessonId: number): Promise<any | null> {
    const cacheRepo = AppDataSource.getRepository(LessonTranscriptCache);
    const rows = await cacheRepo.find({
      where: {
        lesson_id: lessonId,
        source_type: 'uploaded_video',
      } as any,
      order: { updated_at: 'DESC' } as any,
    });
    const hasSegments = (x: any) =>
      Boolean(x && Array.isArray((x as any).transcript_segments_json) && (x as any).transcript_segments_json.length > 0);
    return rows.find((x: any) => hasSegments(x))
      || rows[0]
      || null;
  }

  private async upsertLessonTranscriptCache(input: {
    lessonId: number;
    sourceType: 'youtube_timedtext' | 'youtube_stt' | 'uploaded_video';
    cues: Array<{ start_sec: number; end_sec: number; text: string }>;
    provider?: string | null;
    errorMessage?: string | null;
    meta?: Record<string, any> | null;
  }): Promise<void> {
    const cacheRepo = AppDataSource.getRepository(LessonTranscriptCache);
    const sourceHash = hashSummarySource(JSON.stringify(input.cues.map((c) => ({ s: c.start_sec, e: c.end_sec, t: c.text }))));
    const transcriptText = normalizeSummaryText(input.cues.map((c) => c.text).join(' '));
    const existing = await cacheRepo.findOne({
      where: { lesson_id: input.lessonId, source_type: input.sourceType } as any,
    });
    const payload: Record<string, any> = {
      source_hash: input.cues.length ? sourceHash : null,
      transcript_text: input.cues.length ? transcriptText : null,
      transcript_segments_json: input.cues.length ? input.cues : null,
      transcript_fetched_at: new Date(),
      provider: input.provider ? String(input.provider) : null,
      error_message: input.errorMessage ? String(input.errorMessage) : null,
      meta_json: input.meta || null,
    };
    if (!existing) {
      await cacheRepo.save(cacheRepo.create({
        lesson_id: input.lessonId,
        source_type: input.sourceType,
        ...payload,
      } as any));
      return;
    }
    await cacheRepo.update({ id: Number((existing as any).id) } as any, payload as any);
  }

  private async fetchYoutubeTranscript(videoId: string): Promise<YoutubeTranscriptCue[]> {
    const vid = String(videoId || '').trim();
    if (!vid) return [];
    const candidates = [
      `https://www.youtube.com/api/timedtext?v=${encodeURIComponent(vid)}&lang=vi&fmt=srv3`,
      `https://www.youtube.com/api/timedtext?v=${encodeURIComponent(vid)}&lang=en&fmt=srv3`,
      `https://www.youtube.com/api/timedtext?v=${encodeURIComponent(vid)}&lang=en&kind=asr&fmt=srv3`,
    ];
    for (const endpoint of candidates) {
      try {
        const response = await fetch(endpoint);
        if (!response.ok) continue;
        const xml = await response.text();
        const cues = parseYoutubeTranscriptXml(xml);
        if (cues.length > 0) return cues;
      } catch {
        // Try fallback endpoint.
      }
    }
    return [];
  }

  private async runYoutubeSttJob(lessonId: number, videoId: string, youtubeUrl: string): Promise<void> {
    const startedAt = Date.now();
    try {
      const stt = await transcribeYoutubeViaSttService({
        youtubeUrl,
        videoId,
        maxRetries: Math.max(1, Number(env.YOUTUBE_STT_MAX_RETRIES || 2)),
      });
      await this.upsertLessonTranscriptCache({
        lessonId,
        sourceType: 'youtube_stt',
        cues: stt.segments.map((s: YoutubeSttSegment) => ({
          start_sec: Number(s.start_sec || 0),
          end_sec: Number(s.end_sec || 0),
          text: String(s.text || ''),
        })),
        provider: stt.provider || 'faster-whisper',
        errorMessage: null,
        meta: {
          model: String(env.YOUTUBE_STT_MODEL || 'large-v3'),
          language: stt.language,
          duration_sec: stt.duration_sec,
          elapsed_ms: Date.now() - startedAt,
        },
      });
      console.info(`[lesson-stt] success lesson=${lessonId} video=${videoId} elapsed_ms=${Date.now() - startedAt}`);
    } catch (error: any) {
      await this.upsertLessonTranscriptCache({
        lessonId,
        sourceType: 'youtube_stt',
        cues: [],
        provider: 'faster-whisper',
        errorMessage: String(error?.message || error || 'STT fallback failed'),
        meta: {
          model: String(env.YOUTUBE_STT_MODEL || 'large-v3'),
          elapsed_ms: Date.now() - startedAt,
        },
      });
      console.warn(`[lesson-stt] failed lesson=${lessonId} video=${videoId}: ${String(error?.message || error || 'unknown')}`);
    }
  }

  private scheduleYoutubeSttJob(input: { lessonId: number; videoId: string; youtubeUrl: string }): void {
    if (!env.YOUTUBE_STT_ENABLED) return;
    const id = Number(input.lessonId);
    if (!id || this.youtubeSttJobsInFlight.has(id)) return;
    this.youtubeSttJobsInFlight.add(id);
    setImmediate(() => {
      void this.runYoutubeSttJob(id, String(input.videoId || ''), String(input.youtubeUrl || ''))
        .catch(() => undefined)
        .finally(() => {
          this.youtubeSttJobsInFlight.delete(id);
        });
    });
  }

  async upsertYoutubeTranscriptCache(lessonId: number, videoId: string, youtubeUrl?: string): Promise<YoutubeTranscriptCue[]> {
    const cues = await this.fetchYoutubeTranscript(videoId);
    await this.upsertLessonTranscriptCache({
      lessonId,
      sourceType: 'youtube_timedtext',
      cues,
      provider: 'youtube_timedtext',
      errorMessage: cues.length ? null : 'Không lấy được transcript YouTube timedtext.',
      meta: { video_id: videoId },
    });
    if (!cues.length && youtubeUrl && env.YOUTUBE_STT_ENABLED) {
      this.scheduleYoutubeSttJob({ lessonId, videoId, youtubeUrl });
      await this.upsertLessonTranscriptCache({
        lessonId,
        sourceType: 'youtube_stt',
        cues: [],
        provider: 'faster-whisper',
        errorMessage: 'Đang trích transcript bằng STT...',
        meta: { queued_at: new Date().toISOString(), video_id: videoId },
      });
    }
    return cues;
  }

  private async runUploadedVideoSttJob(lessonId: number, videoUrl: string): Promise<void> {
    const startedAt = Date.now();
    try {
      const stt = await transcribeVideoViaSttService({
        videoUrl,
        maxRetries: Math.max(1, Number(env.YOUTUBE_STT_MAX_RETRIES || 2)),
      });
      await this.upsertLessonTranscriptCache({
        lessonId,
        sourceType: 'uploaded_video',
        cues: stt.segments.map((s: YoutubeSttSegment) => ({
          start_sec: Number(s.start_sec || 0),
          end_sec: Number(s.end_sec || 0),
          text: String(s.text || ''),
        })),
        provider: stt.provider || 'faster-whisper',
        errorMessage: null,
        meta: {
          model: String(env.YOUTUBE_STT_MODEL || 'large-v3'),
          language: stt.language,
          duration_sec: stt.duration_sec,
          elapsed_ms: Date.now() - startedAt,
        },
      });
      console.info(`[uploaded-video-stt] success lesson=${lessonId} elapsed_ms=${Date.now() - startedAt}`);
    } catch (error: any) {
      await this.upsertLessonTranscriptCache({
        lessonId,
        sourceType: 'uploaded_video',
        cues: [],
        provider: 'faster-whisper',
        errorMessage: String(error?.message || error || 'STT video failed'),
        meta: {
          model: String(env.YOUTUBE_STT_MODEL || 'large-v3'),
          elapsed_ms: Date.now() - startedAt,
        },
      });
      console.warn(`[uploaded-video-stt] failed lesson=${lessonId}: ${String(error?.message || error || 'unknown')}`);
    }
  }

  private scheduleUploadedVideoSttJob(input: { lessonId: number; videoUrl: string }): void {
    if (!env.YOUTUBE_STT_ENABLED) return;
    const id = Number(input.lessonId);
    if (!id || this.uploadedVideoSttJobsInFlight.has(id)) return;
    this.uploadedVideoSttJobsInFlight.add(id);
    setImmediate(() => {
      void this.runUploadedVideoSttJob(id, String(input.videoUrl || ''))
        .catch(() => undefined)
        .finally(() => {
          this.uploadedVideoSttJobsInFlight.delete(id);
        });
    });
  }

  async upsertUploadedVideoTranscriptCache(lessonId: number, videoUrl: string): Promise<YoutubeTranscriptCue[]> {
    if (env.YOUTUBE_STT_ENABLED) {
      this.scheduleUploadedVideoSttJob({ lessonId, videoUrl });
      await this.upsertLessonTranscriptCache({
        lessonId,
        sourceType: 'uploaded_video',
        cues: [],
        provider: 'faster-whisper',
        errorMessage: 'Đang trích transcript bằng STT...',
        meta: { queued_at: new Date().toISOString() },
      });
    }
    return [];
  }

  private buildYoutubeSummaryChunks(cues: YoutubeTranscriptCue[]): Array<{ start_sec: number | null; end_sec: number | null; raw_text: string }> {
    if (!cues.length) return [];
    const chunks: Array<{ start_sec: number | null; end_sec: number | null; raw_text: string }> = [];
    let currentTexts: string[] = [];
    let currentStart: number | null = null;
    let currentEnd: number | null = null;
    const flush = () => {
      const text = normalizeSummaryText(currentTexts.join(' '));
      if (!text) return;
      chunks.push({ start_sec: currentStart, end_sec: currentEnd, raw_text: text });
      currentTexts = [];
      currentStart = null;
      currentEnd = null;
    };
    for (const cue of cues) {
      const line = normalizeSummaryText(cue.text);
      if (!line) continue;
      if (currentStart == null) currentStart = cue.start_sec;
      currentEnd = cue.end_sec;
      currentTexts.push(line);
      if (currentTexts.join(' ').length >= 1800 || (currentStart != null && cue.end_sec - currentStart >= 120)) {
        flush();
      }
    }
    flush();
    return chunks;
  }

  private async summarizeChunkWithOpenRouter(input: {
    chunkText: string;
    modelCandidates: string[];
    openRouterKeys: string[];
  }): Promise<{ summary_text: string; keywords: string[]; model: string }> {
    const systemPrompt =
      'Bạn là trợ lý tóm tắt bài học LMS. Trả về DUY NHẤT 1 JSON object có 2 key: summary_text (string) và keywords (string[]).';
    const userPrompt = [
      'Hãy tóm tắt phân đoạn sau bằng TIẾNG VIỆT ngắn gọn, dễ hiểu.',
      '- summary_text: 2-4 câu.',
      '- keywords: 3-6 từ khóa quan trọng.',
      '',
      `Nội dung phân đoạn: ${input.chunkText}`,
    ].join('\n');

    let lastError: any = null;
    console.log(`[OpenRouter] Summarize - Models: [${input.modelCandidates.join(', ')}], Keys count: ${input.openRouterKeys.length}`);
    for (const modelTry of input.modelCandidates) {
      for (const key of input.openRouterKeys) {
        const keyHash = key.slice(-8);
        console.log(`[OpenRouter] Trying model: ${modelTry}, Key: ...${keyHash}`);
        try {
          const startTime = Date.now();
          const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${key}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: modelTry,
              response_format: { type: 'json_object' },
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
              ],
              temperature: 0.3,
            }),
          });
          const elapsedMs = Date.now() - startTime;
          console.log(`[OpenRouter] Response time: ${elapsedMs}ms, Status: ${response.status}`);
          if (!response.ok) {
            const raw = await response.text().catch(() => '');
            console.error(`[OpenRouter] HTTP ${response.status} with model ${modelTry}: ${raw?.slice(0, 200)}`);
            lastError = new Error(`OpenRouter HTTP ${response.status}: ${raw?.slice(0, 150) || ''}`);
            continue;
          }
          const data: any = await response.json();
          const content = String(data?.choices?.[0]?.message?.content || '').trim();
          const parsed = JSON.parse(stripMarkdownJson(content));
          const summary_text = normalizeSummaryText(String(parsed?.summary_text || ''));
          const keywords = Array.isArray(parsed?.keywords)
            ? parsed.keywords.map((k: any) => normalizeSummaryText(String(k))).filter(Boolean).slice(0, 8)
            : [];
          if (!summary_text) throw new Error('AI không trả về summary_text hợp lệ.');
          console.log(`[OpenRouter] Success - Model: ${modelTry}, Summary length: ${summary_text.length}`);
          return { summary_text, keywords, model: modelTry };
        } catch (error: any) {
          console.error(`[OpenRouter] Exception: ${error.message}`);
          lastError = error;
        }
      }
    }
    console.error(`[OpenRouter] All model/key combinations failed`);
    throw new Error(String(lastError?.message || lastError || 'OpenRouter summarize failed.'));
  }

  private async generateOverallSummaryWithOpenRouter(input: {
    segmentSummaries: string[];
    modelCandidates: string[];
    openRouterKeys: string[];
  }): Promise<{ overall_summary: string; key_points: string[]; model: string }> {
    const systemPrompt =
      'Bạn là trợ lý tổng hợp bài học LMS. Trả về DUY NHẤT JSON object gồm overall_summary (string) và key_points (string[]).';
    const userPrompt = [
      'Từ các tóm tắt phân đoạn sau, hãy tổng hợp thành:',
      '- overall_summary: 1 đoạn 5-8 câu, mạch lạc.',
      '- key_points: 5-8 ý chính dạng ngắn.',
      '',
      input.segmentSummaries.map((x, i) => `Đoạn ${i + 1}: ${x}`).join('\n'),
    ].join('\n');

    let lastError: any = null;
    console.log(`[OpenRouter] Overall Summary - Models: [${input.modelCandidates.join(', ')}], Keys count: ${input.openRouterKeys.length}`);
    for (const modelTry of input.modelCandidates) {
      for (const key of input.openRouterKeys) {
        const keyHash = key.slice(-8);
        console.log(`[OpenRouter] Trying model: ${modelTry}, Key: ...${keyHash}`);
        try {
          const startTime = Date.now();
          const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${key}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: modelTry,
              response_format: { type: 'json_object' },
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
              ],
              temperature: 0.3,
            }),
          });
          const elapsedMs = Date.now() - startTime;
          console.log(`[OpenRouter] Response time: ${elapsedMs}ms, Status: ${response.status}`);
          if (!response.ok) {
            const raw = await response.text().catch(() => '');
            console.error(`[OpenRouter] HTTP ${response.status} with model ${modelTry}: ${raw?.slice(0, 200)}`);
            lastError = new Error(`OpenRouter HTTP ${response.status}: ${raw?.slice(0, 150) || ''}`);
            continue;
          }
          const data: any = await response.json();
          const content = String(data?.choices?.[0]?.message?.content || '').trim();
          const parsed = JSON.parse(stripMarkdownJson(content));
          const overall_summary = normalizeSummaryText(String(parsed?.overall_summary || ''));
          const key_points = Array.isArray(parsed?.key_points)
            ? parsed.key_points.map((k: any) => normalizeSummaryText(String(k))).filter(Boolean).slice(0, 12)
            : [];
          if (!overall_summary) throw new Error('AI không trả về overall_summary hợp lệ.');
          console.log(`[OpenRouter] Success - Model: ${modelTry}, Summary length: ${overall_summary.length}`);
          return { overall_summary, key_points, model: modelTry };
        } catch (error: any) {
          console.error(`[OpenRouter] Exception: ${error.message}`);
          lastError = error;
        }
      }
    }
    console.error(`[OpenRouter] All model/key combinations failed`);
    throw new Error(String(lastError?.message || lastError || 'OpenRouter overall summarize failed.'));
  }

  private scheduleLessonSummaryJob(lessonId: number): void {
    const id = Number(lessonId);
    if (!id || this.summaryJobsInFlight.has(id)) return;
    this.summaryJobsInFlight.add(id);
    setImmediate(() => {
      void this.runLessonSummaryJob(id)
        .catch(() => undefined)
        .finally(() => {
          this.summaryJobsInFlight.delete(id);
        });
    });
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

    const Course = (await import('../../../../../internal/model/course')).default;
    const courseRepo = AppDataSource.getRepository(Course);
    const course = await courseRepo.findOne({ where: { id: courseId } as any });
    if (course && Number((course as any).instructor_id) === subjectUserId) return;

    const CourseEnrollment = (await import('../../../../../internal/model/course_enrollment')).default;
    const enrollmentRepo = AppDataSource.getRepository(CourseEnrollment);
    const enrollment = await enrollmentRepo.findOne({
      where: { user_id: subjectUserId, course_id: courseId } as any,
    });
    if (!enrollment) {
      throw new Error('Bạn chưa đăng ký khóa học này.');
    }
  }

  private async runLessonSummaryJob(lessonId: number): Promise<void> {
    const summaryRepo = AppDataSource.getRepository(LessonSummary);
    const segmentRepo = AppDataSource.getRepository(LessonSummarySegment);
    const lessonRepo = AppDataSource.getRepository(Lesson);
    const resourceRepo = AppDataSource.getRepository(LessonResource);
    const settingRepo = AppDataSource.getRepository(OpenRouterSetting);
    const keyRepo = AppDataSource.getRepository(OpenRouterKey);

    const summary = await summaryRepo.findOne({ where: { lesson_id: lessonId } as any });
    if (!summary) return;

    // Check if source (transcript) is ready BEFORE starting processing
    const sourceReady = await this.getLessonSummarySourceReady(lessonId, (summary as any)?.source_type);
    if (!sourceReady) {
      console.log(`[summary] waiting for transcript source, lesson=${lessonId}`);
      return; // Don't update status, let user click again when transcript is done
    }

    await summaryRepo.update({ id: Number((summary as any).id) } as any, {
      status: 'processing',
      started_at: new Date(),
      finished_at: null,
      error_message: null,
    } as any);

    try {
      const lesson = await lessonRepo.findOne({ where: { id: lessonId } as any });
      if (!lesson) throw new Error('Không tìm thấy lesson.');

      const lessonType = String((lesson as any).lesson_type || 'text');
      let sourceType: LessonSummarySourceType = 'text';
      let chunks: Array<{ start_sec: number | null; end_sec: number | null; raw_text: string }> = [];

      const resources = await resourceRepo.find({
        where: { lesson_id: lessonId, resource_kind: 'youtube' } as any,
        order: { id: 'DESC' } as any,
      });
      const youtube = (resources as any[]).find((r) => String((r as any).url || '').includes('youtube.com/embed/'));

      if (youtube) {
        const videoId = parseYoutubeVideoId(String((youtube as any).url || ''));
        if (!videoId) throw new Error('Không đọc được video id từ link YouTube.');
        let cues: YoutubeTranscriptCue[] = [];
        const cached = await this.findBestYoutubeTranscriptCache(lessonId);
        if (cached && Array.isArray((cached as any).transcript_segments_json) && (cached as any).transcript_segments_json.length > 0) {
          cues = this.extractTranscriptCuesFromCache(cached);
        } else {
          cues = await this.upsertYoutubeTranscriptCache(lessonId, videoId, String((youtube as any).url || ''));
          if (!cues.length && env.YOUTUBE_STT_ENABLED) {
            throw new Error('Đang trích transcript bằng STT. Vui lòng thử lại sau ít phút.');
          }
        }
        if (!cues.length) throw new Error('Không lấy được transcript YouTube. Hãy bật phụ đề cho video.');
        chunks = this.buildYoutubeSummaryChunks(cues);
        sourceType = 'youtube';
      } else {
        const videoResources = await resourceRepo.find({
          where: { lesson_id: lessonId, resource_kind: 'video' } as any,
          order: { id: 'DESC' } as any,
        });
        const uploadedVideo = (videoResources as any[]).find((r) => String((r as any).url || '').startsWith('https://'));

        if (uploadedVideo) {
          const videoUrl = String((uploadedVideo as any).url || '');
          let cues: YoutubeTranscriptCue[] = [];
          const cached = await this.findBestUploadedVideoTranscriptCache(lessonId);
          if (cached && Array.isArray((cached as any).transcript_segments_json) && (cached as any).transcript_segments_json.length > 0) {
            cues = this.extractTranscriptCuesFromCache(cached);
          } else {
            cues = await this.upsertUploadedVideoTranscriptCache(lessonId, videoUrl);
            if (env.YOUTUBE_STT_ENABLED) {
              throw new Error('Đang trích transcript bằng STT. Vui lòng thử lại sau ít phút.');
            }
          }
          if (!cues.length) throw new Error('Không lấy được transcript video. Vui lòng thử lại sau.');
          chunks = this.buildYoutubeSummaryChunks(cues);
          sourceType = 'uploaded_video';
        } else if (lessonType === 'text') {
          const content = normalizeSummaryText(stripHtmlToText(String((lesson as any).description || '')));
          if (!content) throw new Error('Lesson text chưa có nội dung để tóm tắt.');
          chunks = splitTextIntoChunks(content).map((c) => ({ start_sec: null, end_sec: null, raw_text: c }));
          sourceType = 'text';
        }
      }

      if (!chunks.length) throw new Error('Không có dữ liệu để tạo tóm tắt.');

      const settings = await settingRepo.findOne({ where: {} as any });
      const defaultModel =
        String(settings?.default_model || '').trim() ||
        (Array.isArray(settings?.models) && settings?.models.length ? String(settings.models[0]) : '') ||
        'openai/gpt-4o-mini';
      let modelCandidates: string[] = [defaultModel, ...(Array.isArray(settings?.models) ? settings!.models!.map(String) : [])]
        .map(String)
        .filter(Boolean);
      modelCandidates = Array.from(new Set(modelCandidates));
      if (!modelCandidates.length) modelCandidates = [defaultModel];

      const now = new Date();
      const availableKeys = await keyRepo.find({
        where: { is_active: true } as any,
        order: { last_used_at: 'ASC', id: 'ASC' } as any,
      });
      const keyPool = availableKeys
        .filter((k: any) => !k.cooldown_until || new Date(k.cooldown_until) <= now)
        .map((k: any) => decryptOpenRouterKey(String((k as any).key_encrypted || '')))
        .filter(Boolean);
      if (!keyPool.length) throw new Error('Không có OpenRouter key khả dụng.');

      const segmentResults: Array<{ start_sec: number | null; end_sec: number | null; raw_text: string; summary_text: string; keywords: string[] }> = [];
      let usedModel: string | null = null;
      const maxChunks = 16;
      const targetChunks = chunks.slice(0, maxChunks);
      const existingSegments = await segmentRepo.find({
        where: { summary_id: Number((summary as any).id) } as any,
        order: { segment_index: 'ASC' } as any,
      });
      const existingMap = new Map<number, any>(existingSegments.map((s: any) => [Number(s.segment_index), s]));
      for (let i = 0; i < targetChunks.length; i++) {
        const chunk = targetChunks[i];
        const segIndex = i + 1;
        const existing = existingMap.get(segIndex);
        if (existing && String((existing as any).summary_text || '').trim()) {
          segmentResults.push({
            start_sec: existing.start_sec != null ? Number(existing.start_sec) : null,
            end_sec: existing.end_sec != null ? Number(existing.end_sec) : null,
            raw_text: String(existing.raw_text || chunk.raw_text),
            summary_text: String(existing.summary_text || ''),
            keywords: Array.isArray((existing as any).keywords_json) ? (existing as any).keywords_json.map(String) : [],
          });
          continue;
        }
        const result = await this.summarizeChunkWithOpenRouter({
          chunkText: chunk.raw_text,
          modelCandidates,
          openRouterKeys: keyPool,
        });
        usedModel = result.model;
        const segmentItem = {
          start_sec: chunk.start_sec,
          end_sec: chunk.end_sec,
          raw_text: chunk.raw_text,
          summary_text: result.summary_text,
          keywords: result.keywords,
        };
        segmentResults.push(segmentItem);
        if (existing) {
          await segmentRepo.update({ id: Number((existing as any).id) } as any, {
            start_sec: segmentItem.start_sec,
            end_sec: segmentItem.end_sec,
            raw_text: segmentItem.raw_text,
            summary_text: segmentItem.summary_text,
            keywords_json: segmentItem.keywords,
          } as any);
        } else {
          await segmentRepo.save(segmentRepo.create({
            summary_id: Number((summary as any).id),
            segment_index: segIndex,
            start_sec: segmentItem.start_sec,
            end_sec: segmentItem.end_sec,
            raw_text: segmentItem.raw_text,
            summary_text: segmentItem.summary_text,
            keywords_json: segmentItem.keywords,
          } as any));
        }
      }

      const overall = await this.generateOverallSummaryWithOpenRouter({
        segmentSummaries: segmentResults.map((x) => x.summary_text),
        modelCandidates,
        openRouterKeys: keyPool,
      });
      usedModel = overall.model || usedModel;

      const sourceHash = hashSummarySource(
        JSON.stringify({
          lesson_id: lessonId,
          lesson_updated_at: toIsoOrNull((lesson as any).updated_at),
          source_type: sourceType,
          chunks: segmentResults.map((x) => ({ s: x.start_sec, e: x.end_sec, t: x.raw_text })),
        })
      );

      await AppDataSource.transaction(async (manager) => {
        const txSummaryRepo = manager.getRepository(LessonSummary);
        const txSegmentRepo = manager.getRepository(LessonSummarySegment);
        const fresh = await txSummaryRepo.findOne({ where: { lesson_id: lessonId } as any });
        if (!fresh) return;
        await txSegmentRepo.delete({ summary_id: Number((fresh as any).id) } as any);
        await txSummaryRepo.update({ id: Number((fresh as any).id) } as any, {
          status: 'succeeded',
          source_type: sourceType,
          source_hash: sourceHash,
          model: usedModel,
          overall_summary: overall.overall_summary,
          key_points_json: overall.key_points,
          finished_at: new Date(),
          error_message: null,
        } as any);
        if (segmentResults.length) {
          const segmentEntities = segmentResults.map((item, idx) => ({
            summary_id: Number((fresh as any).id),
            segment_index: idx + 1,
            start_sec: item.start_sec,
            end_sec: item.end_sec,
            raw_text: item.raw_text,
            summary_text: item.summary_text,
            keywords_json: item.keywords,
          }));
          await txSegmentRepo.save(segmentEntities as any);
        }
      });
    } catch (error: any) {
      const raw = String(error?.message || error || '');
      const isLlmFailure =
        raw.toLowerCase().includes('fetch failed') ||
        raw.toLowerCase().includes('model/key') ||
        raw.toLowerCase().includes('tất cả model') ||
        raw.toLowerCase().includes('all model') ||
        raw.toLowerCase().includes('http 4') ||
        raw.toLowerCase().includes('http 5') ||
        raw.toLowerCase().includes('openrouter');
      const userMessage = isLlmFailure
        ? 'Hệ thống lỗi, vui lòng thử lại sau ít phút nữa.'
        : raw || 'Đã xảy ra lỗi khi tạo tóm tắt.';
      await summaryRepo.update({ lesson_id: lessonId } as any, {
        status: 'failed',
        finished_at: new Date(),
        error_message: userMessage,
      } as any);
    }
  }

  async requestLessonSummary(subjectUserId: number, courseId: number, lessonId: number): Promise<LessonSummaryPayload> {
    await this.ensureCanAccessLessonSummary(subjectUserId, courseId, lessonId);
    const summaryRepo = AppDataSource.getRepository(LessonSummary);
    const segmentRepo = AppDataSource.getRepository(LessonSummarySegment);
    let summary = await summaryRepo.findOne({ where: { lesson_id: lessonId } as any });
    if (!summary) {
      await summaryRepo.save({
        lesson_id: lessonId,
        status: 'pending',
        source_type: 'text',
        requested_at: new Date(),
      } as any);
      summary = await summaryRepo.findOne({ where: { lesson_id: lessonId } as any });
    } else {
      await summaryRepo.update({ id: Number((summary as any).id) } as any, {
        status: 'pending',
        requested_at: new Date(),
        started_at: null,
        finished_at: null,
        error_message: null,
      } as any);
      await segmentRepo.delete({ summary_id: Number((summary as any).id) } as any);
      summary = await summaryRepo.findOne({ where: { id: Number((summary as any).id) } as any });
    }
    if (!summary) throw new Error('Không thể khởi tạo bản ghi tóm tắt.');
    this.scheduleLessonSummaryJob(lessonId);
    const rows = await segmentRepo.find({
      where: { summary_id: Number((summary as any).id) } as any,
      order: { segment_index: 'ASC' } as any,
    });
    const sourceReady = await this.getLessonSummarySourceReady(lessonId, (summary as any)?.source_type);
    return this.toLessonSummaryPayload(summary as any, rows as any[], sourceReady);
  }

  async getLessonSummary(subjectUserId: number, courseId: number, lessonId: number): Promise<LessonSummaryPayload> {
    await this.ensureCanAccessLessonSummary(subjectUserId, courseId, lessonId);
    const summaryRepo = AppDataSource.getRepository(LessonSummary);
    const segmentRepo = AppDataSource.getRepository(LessonSummarySegment);
    const summary = await summaryRepo.findOne({ where: { lesson_id: lessonId } as any });
    if (!summary) {
      const sourceReady = await this.getLessonSummarySourceReady(lessonId, 'text');
      return this.toLessonSummaryPayload({
        lesson_id: lessonId,
        status: 'pending',
        source_type: 'text',
        model: null,
        source_hash: null,
        overall_summary: null,
        key_points_json: [],
        error_message: null,
        requested_at: null,
        started_at: null,
        finished_at: null,
        updated_at: null,
      }, [], sourceReady);
    }
    const rows = await segmentRepo.find({
      where: { summary_id: Number((summary as any).id) } as any,
      order: { segment_index: 'ASC' } as any,
    });
    const sourceReady = await this.getLessonSummarySourceReady(lessonId, (summary as any)?.source_type);
    return this.toLessonSummaryPayload(summary as any, rows as any[], sourceReady);
  }

  async regenerateLessonSummary(subjectUserId: number, courseId: number, lessonId: number): Promise<LessonSummaryPayload> {
    await this.ensureCanAccessLessonSummary(subjectUserId, courseId, lessonId);
    const summaryRepo = AppDataSource.getRepository(LessonSummary);
    const segmentRepo = AppDataSource.getRepository(LessonSummarySegment);
    let summary = await summaryRepo.findOne({ where: { lesson_id: lessonId } as any });
    if (!summary) {
      await summaryRepo.save({
        lesson_id: lessonId,
        status: 'pending',
        source_type: 'text',
        requested_at: new Date(),
      } as any);
      summary = await summaryRepo.findOne({ where: { lesson_id: lessonId } as any });
    } else {
      await summaryRepo.update({ id: Number((summary as any).id) } as any, {
        status: 'pending',
        requested_at: new Date(),
        started_at: null,
        finished_at: null,
        error_message: null,
      } as any);
      await segmentRepo.delete({ summary_id: Number((summary as any).id) } as any);
      summary = await summaryRepo.findOne({ where: { id: Number((summary as any).id) } as any });
    }
    if (!summary) throw new Error('Không thể khởi tạo bản ghi tóm tắt.');
    this.scheduleLessonSummaryJob(lessonId);
    const rows = await segmentRepo.find({
      where: { summary_id: Number((summary as any).id) } as any,
      order: { segment_index: 'ASC' } as any,
    });
    const sourceReady = await this.getLessonSummarySourceReady(lessonId, (summary as any)?.source_type);
    return this.toLessonSummaryPayload(summary as any, rows as any[], sourceReady);
  }
}
