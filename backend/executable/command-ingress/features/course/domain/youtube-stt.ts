import env from '../../../utils/env';

export type YoutubeSttSegment = {
  start_sec: number;
  end_sec: number;
  text: string;
};

export type YoutubeSttResult = {
  provider: string;
  language: string | null;
  duration_sec: number | null;
  segments: YoutubeSttSegment[];
};

function toFiniteNumber(input: any, fallback = 0): number {
  const n = Number(input);
  if (!Number.isFinite(n)) return fallback;
  return n;
}

function normalizeSegments(input: any[]): YoutubeSttSegment[] {
  const rows = Array.isArray(input) ? input : [];
  return rows
    .map((row: any) => {
      const start = Math.max(0, toFiniteNumber(row?.start_sec, toFiniteNumber(row?.start, 0)));
      const endRaw = toFiniteNumber(row?.end_sec, toFiniteNumber(row?.end, start));
      const end = endRaw < start ? start : endRaw;
      const text = String(row?.text || '').trim();
      return { start_sec: start, end_sec: end, text };
    })
    .filter((s) => s.text.length > 0);
}

export async function transcribeYoutubeViaSttService(input: {
  youtubeUrl: string;
  videoId: string;
  maxRetries?: number;
}): Promise<YoutubeSttResult> {
  const endpoint = String(env.YOUTUBE_STT_ENDPOINT || '').trim();
  if (!endpoint) throw new Error('Chưa cấu hình YOUTUBE_STT_ENDPOINT.');

  const retries = Math.max(1, Number(input.maxRetries ?? env.YOUTUBE_STT_MAX_RETRIES ?? 2));
  const timeoutMs = Math.max(5_000, Number(env.YOUTUBE_STT_TIMEOUT_MS || 120_000));
  const requestBody = {
    youtube_url: String(input.youtubeUrl || '').trim(),
    video_id: String(input.videoId || '').trim(),
    model: String(env.YOUTUBE_STT_MODEL || 'large-v3'),
    language: String(env.YOUTUBE_STT_LANGUAGE || 'vi'),
    task: 'transcribe',
  };
  let lastError: any = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`STT HTTP ${response.status}: ${text || response.statusText}`);
      }
      const payload: any = await response.json().catch(() => ({} as any));
      const segments = normalizeSegments(payload?.segments || payload?.items || []);
      if (!segments.length) throw new Error('STT không trả segment hợp lệ.');
      return {
        provider: String(payload?.provider || 'faster-whisper'),
        language: payload?.language ? String(payload.language) : null,
        duration_sec: payload?.duration_sec != null ? toFiniteNumber(payload.duration_sec, 0) : null,
        segments,
      };
    } catch (error: any) {
      clearTimeout(timer);
      lastError = error;
      if (attempt < retries) {
        const backoff = Math.min(5_000, 600 * attempt);
        await new Promise((resolve) => setTimeout(resolve, backoff));
      }
    }
  }

  throw new Error(`STT fallback thất bại: ${String(lastError?.message || lastError || 'unknown')}`);
}

export async function transcribeVideoViaSttService(input: {
  videoUrl: string;
  maxRetries?: number;
}): Promise<YoutubeSttResult> {
  const endpoint = String(env.YOUTUBE_STT_ENDPOINT || '').trim();
  if (!endpoint) throw new Error('Chưa cấu hình YOUTUBE_STT_ENDPOINT.');

  const retries = Math.max(1, Number(input.maxRetries ?? env.YOUTUBE_STT_MAX_RETRIES ?? 2));
  const timeoutMs = Math.max(5_000, Number(env.YOUTUBE_STT_TIMEOUT_MS || 300_000));
  const requestBody = {
    video_url: String(input.videoUrl || '').trim(),
    model: String(env.YOUTUBE_STT_MODEL || 'large-v3'),
    language: String(env.YOUTUBE_STT_LANGUAGE || 'vi'),
    task: 'transcribe',
  };
  let lastError: any = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`STT HTTP ${response.status}: ${text || response.statusText}`);
      }
      const payload: any = await response.json().catch(() => ({} as any));
      const segments = normalizeSegments(payload?.segments || payload?.items || []);
      if (!segments.length) throw new Error('STT không trả segment hợp lệ.');
      return {
        provider: String(payload?.provider || 'faster-whisper'),
        language: payload?.language ? String(payload.language) : null,
        duration_sec: payload?.duration_sec != null ? toFiniteNumber(payload.duration_sec, 0) : null,
        segments,
      };
    } catch (error: any) {
      clearTimeout(timer);
      lastError = error;
      if (attempt < retries) {
        const backoff = Math.min(5_000, 600 * attempt);
        await new Promise((resolve) => setTimeout(resolve, backoff));
      }
    }
  }

  throw new Error(`STT video thất bại: ${String(lastError?.message || lastError || 'unknown')}`);
}
