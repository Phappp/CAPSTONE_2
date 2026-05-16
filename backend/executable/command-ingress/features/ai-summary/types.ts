export type LessonSummaryStatus = 'pending' | 'processing' | 'succeeded' | 'failed';
export type LessonSummarySourceType = 'text' | 'youtube' | 'uploaded_video';

export type LessonSummarySegmentItem = {
  segment_index: number;
  start_sec: number | null;
  end_sec: number | null;
  raw_text: string;
  summary_text: string;
  keywords: string[];
};

export type LessonSummaryPayload = {
  lesson_id: number;
  status: LessonSummaryStatus;
  source_type: LessonSummarySourceType;
  source_ready: boolean;
  model: string | null;
  source_hash: string | null;
  overall_summary: string | null;
  key_points: string[];
  error_message: string | null;
  requested_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  updated_at: string | null;
  segments: LessonSummarySegmentItem[];
};

export interface AiSummaryService {
  requestLessonSummary(subjectUserId: number, courseId: number, lessonId: number): Promise<LessonSummaryPayload>;
  getLessonSummary(subjectUserId: number, courseId: number, lessonId: number): Promise<LessonSummaryPayload>;
  regenerateLessonSummary(subjectUserId: number, courseId: number, lessonId: number): Promise<LessonSummaryPayload>;
  scanPendingTranscripts(): Promise<{ queued: number; skipped: number }>;
}
