ALTER TABLE lesson_transcript_caches
  MODIFY COLUMN source_type ENUM('youtube_timedtext', 'youtube_stt', 'uploaded_video') NOT NULL DEFAULT 'youtube_timedtext';
