import { config } from 'dotenv';
import path from 'path';
import LessonResource from '../internal/model/lesson_resource';
import LessonTranscriptCache from '../internal/model/lesson_transcript_cache';
import { transcribeVideoViaSttService } from '../executable/command-ingress/features/course/domain/youtube-stt';
import crypto from 'crypto';

config({ path: path.join(process.cwd(), '.env') });

function hashSummarySource(source: string): string {
  return crypto.createHash('sha256').update(source, 'utf8').digest('hex');
}

function normalizeSummaryText(input: string): string {
  return String(input || '').replace(/\s+/g, ' ').trim();
}

async function main(): Promise<void> {
  const { default: AppDataSource } = await import('./database');
  const limit = Math.max(1, Number(process.argv[2] || 50));
  try {
    if (!AppDataSource.isInitialized) await AppDataSource.initialize();
    const resourceRepo = AppDataSource.getRepository(LessonResource);
    const cacheRepo = AppDataSource.getRepository(LessonTranscriptCache);

    const resources = await resourceRepo.find({
      where: { resource_kind: 'video' } as any,
      order: { id: 'DESC' } as any,
      take: limit,
    });
    let ok = 0;
    let fail = 0;
    for (const r of resources as any[]) {
      const lessonId = Number(r.lesson_id);
      const url = String(r.url || '');
      if (!lessonId || !url || !url.startsWith('https://')) continue;
      
      // Skip YouTube URLs (they should be handled by backfill-youtube-stt.ts)
      if (url.includes('youtube.com') || url.includes('youtu.be')) continue;
      
      const existing = await cacheRepo.find({
        where: { lesson_id: lessonId, source_type: 'uploaded_video' } as any,
      });
      const hasReady = existing.some((x: any) => 
        Array.isArray(x.transcript_segments_json) && x.transcript_segments_json.length > 0
      );
      if (hasReady) continue;
      
      try {
        const stt = await transcribeVideoViaSttService({ videoUrl: url });
        const cues = stt.segments.map((s) => ({
          start_sec: Number(s.start_sec || 0),
          end_sec: Number(s.end_sec || 0),
          text: String(s.text || ''),
        }));
        const sourceHash = hashSummarySource(JSON.stringify(cues.map((c) => ({ s: c.start_sec, e: c.end_sec, t: c.text }))));
        const transcriptText = normalizeSummaryText(cues.map((c) => c.text).join(' '));
        const row = await cacheRepo.findOne({ where: { lesson_id: lessonId, source_type: 'uploaded_video' } as any });
        const payload = {
          source_hash: cues.length ? sourceHash : null,
          transcript_text: cues.length ? transcriptText : null,
          transcript_segments_json: cues.length ? cues : null,
          transcript_fetched_at: new Date(),
          provider: stt.provider || 'faster-whisper',
          error_message: null,
          meta_json: {
            model: process.env.YOUTUBE_STT_MODEL || 'large-v3',
            language: stt.language,
            duration_sec: stt.duration_sec,
            backfilled_at: new Date().toISOString(),
          },
        } as any;
        if (!row) {
          await cacheRepo.save(cacheRepo.create({
            lesson_id: lessonId,
            source_type: 'uploaded_video',
            ...payload,
          } as any));
        } else {
          await cacheRepo.update({ id: Number((row as any).id) } as any, payload);
        }
        ok += 1;
        console.log(`[backfill-uploaded-video] ok lesson=${lessonId} url=${url.substring(0, 50)}...`);
      } catch (error: any) {
        fail += 1;
        console.warn(`[backfill-uploaded-video] fail lesson=${lessonId}: ${String(error?.message || error || 'unknown')}`);
      }
    }
    console.log(`[backfill-uploaded-video] completed ok=${ok} fail=${fail}`);
  } finally {
    if (AppDataSource.isInitialized) await AppDataSource.destroy();
  }
}

void main();
