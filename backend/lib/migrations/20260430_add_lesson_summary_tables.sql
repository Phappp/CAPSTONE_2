CREATE TABLE IF NOT EXISTS lesson_summaries (
  id INT NOT NULL AUTO_INCREMENT,
  lesson_id INT NOT NULL,
  status ENUM('pending','processing','succeeded','failed') NOT NULL DEFAULT 'pending',
  source_type ENUM('text','youtube') NOT NULL DEFAULT 'text',
  source_hash VARCHAR(64) NULL,
  model VARCHAR(120) NULL,
  overall_summary TEXT NULL,
  key_points_json JSON NULL,
  error_message TEXT NULL,
  requested_at DATETIME NULL,
  started_at DATETIME NULL,
  finished_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY ux_lesson_summaries_lesson_id (lesson_id),
  KEY idx_lesson_summaries_status (status),
  CONSTRAINT fk_lesson_summaries_lesson FOREIGN KEY (lesson_id) REFERENCES lessons(id)
);

CREATE TABLE IF NOT EXISTS lesson_summary_segments (
  id INT NOT NULL AUTO_INCREMENT,
  summary_id INT NOT NULL,
  segment_index INT NOT NULL,
  start_sec INT NULL,
  end_sec INT NULL,
  raw_text MEDIUMTEXT NULL,
  summary_text TEXT NULL,
  keywords_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY idx_lesson_summary_segments_summary_index (summary_id, segment_index),
  CONSTRAINT fk_lesson_summary_segments_summary FOREIGN KEY (summary_id) REFERENCES lesson_summaries(id)
);
