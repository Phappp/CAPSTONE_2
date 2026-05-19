-- Migration: Add lesson_discussion tables
-- Purpose: Discussion feature for lessons (Thảo luận bài học)

CREATE TABLE IF NOT EXISTS lesson_discussions (
  id INT NOT NULL AUTO_INCREMENT,
  lesson_id INT NOT NULL,
  user_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
  view_count INT NOT NULL DEFAULT 0,
  reply_count INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_lesson_discussions_lesson_id (lesson_id),
  INDEX idx_lesson_discussions_user_id (user_id),
  INDEX idx_lesson_discussions_created_at (created_at),
  CONSTRAINT fk_lesson_discussions_lesson FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
  CONSTRAINT fk_lesson_discussions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS lesson_discussion_replies (
  id INT NOT NULL AUTO_INCREMENT,
  discussion_id INT NOT NULL,
  user_id INT NOT NULL,
  parent_reply_id INT NULL,
  content TEXT NOT NULL,
  is_instructor_reply BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_lesson_discussion_replies_discussion_id (discussion_id),
  INDEX idx_lesson_discussion_replies_user_id (user_id),
  INDEX idx_lesson_discussion_replies_parent_id (parent_reply_id),
  CONSTRAINT fk_lesson_discussion_replies_discussion FOREIGN KEY (discussion_id) REFERENCES lesson_discussions(id) ON DELETE CASCADE,
  CONSTRAINT fk_lesson_discussion_replies_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_lesson_discussion_replies_parent FOREIGN KEY (parent_reply_id) REFERENCES lesson_discussion_replies(id) ON DELETE CASCADE
);
