CREATE TABLE IF NOT EXISTS lesson_transcript_caches (
  id INT NOT NULL AUTO_INCREMENT,
  lesson_id INT NOT NULL,
  source_type ENUM('youtube') NOT NULL DEFAULT 'youtube',
  source_hash VARCHAR(64) NULL,
  transcript_text MEDIUMTEXT NULL,
  transcript_segments_json JSON NULL,
  transcript_fetched_at DATETIME NULL,
  error_message TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY ux_lesson_transcript_caches_lesson_source (lesson_id, source_type),
  CONSTRAINT fk_lesson_transcript_caches_lesson FOREIGN KEY (lesson_id) REFERENCES lessons(id)
);
