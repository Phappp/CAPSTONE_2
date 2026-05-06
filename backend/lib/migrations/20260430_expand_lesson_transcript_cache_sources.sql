ALTER TABLE lesson_transcript_caches
  MODIFY COLUMN source_type ENUM('youtube', 'youtube_timedtext', 'youtube_stt') NOT NULL DEFAULT 'youtube_timedtext';

UPDATE lesson_transcript_caches
SET source_type = 'youtube_timedtext'
WHERE source_type = 'youtube';

ALTER TABLE lesson_transcript_caches
  MODIFY COLUMN source_type ENUM('youtube_timedtext', 'youtube_stt') NOT NULL DEFAULT 'youtube_timedtext';

ALTER TABLE lesson_transcript_caches
  ADD COLUMN provider VARCHAR(64) NULL AFTER source_type,
  ADD COLUMN meta_json JSON NULL AFTER error_message;
