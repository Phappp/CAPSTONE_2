-- ================================================
-- FIX DATABASE: Thêm Foreign Key Constraints
-- Chạy trong MySQL trước khi khởi động lại app
-- ================================================

-- 1. AUDIT_LOGS: Thêm FK cho actor_user_id và target_user_id
ALTER TABLE audit_logs
  ADD CONSTRAINT fk_audit_logs_actor_user FOREIGN KEY (actor_user_id) REFERENCES users(id);

ALTER TABLE audit_logs
  ADD CONSTRAINT fk_audit_logs_target_user FOREIGN KEY (target_user_id) REFERENCES users(id);

-- 2. COURSE_MANAGER_VERIFICATIONS: Tạo bảng nếu chưa có
CREATE TABLE IF NOT EXISTS course_manager_verifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  application_note TEXT,
  review_note TEXT,
  reviewed_by INT,
  reviewed_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_course_manager_verifications_user_id (user_id),
  KEY idx_course_manager_verifications_status (status),
  KEY idx_course_manager_verifications_reviewed_by (reviewed_by)
);

-- Thêm FK sau khi tạo bảng
ALTER TABLE course_manager_verifications
  ADD CONSTRAINT fk_course_manager_verifications_user FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE course_manager_verifications
  ADD CONSTRAINT fk_course_manager_verifications_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id);

-- 3. COURSE_REVIEW_EVENTS: Tạo bảng nếu chưa có
CREATE TABLE IF NOT EXISTS course_review_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL,
  actor_user_id INT NOT NULL,
  from_status ENUM('draft', 'pending_review', 'published', 'archived'),
  to_status ENUM('draft', 'pending_review', 'published', 'archived') NOT NULL,
  decision ENUM('submit', 'approve', 'reject', 'resubmit') NOT NULL,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_course_review_events_course_id (course_id),
  KEY idx_course_review_events_created_at (created_at)
);

-- Thêm FK sau khi tạo bảng
ALTER TABLE course_review_events
  ADD CONSTRAINT fk_course_review_events_course FOREIGN KEY (course_id) REFERENCES courses(id);

ALTER TABLE course_review_events
  ADD CONSTRAINT fk_course_review_events_actor_user FOREIGN KEY (actor_user_id) REFERENCES users(id);

-- 4. LESSON_RESOURCE_REVIEW_EVENTS: Thêm FK cho resource_id và actor_user_id
ALTER TABLE lesson_resource_review_events
  ADD CONSTRAINT fk_lesson_resource_review_events_resource FOREIGN KEY (resource_id) REFERENCES lesson_resources(id);

ALTER TABLE lesson_resource_review_events
  ADD CONSTRAINT fk_lesson_resource_review_events_actor_user FOREIGN KEY (actor_user_id) REFERENCES users(id);

-- 5. OPENROUTER_KEYS: Thêm FK cho created_by và updated_by
ALTER TABLE openrouter_keys
  ADD CONSTRAINT fk_openrouter_keys_created_by FOREIGN KEY (created_by) REFERENCES users(id);

ALTER TABLE openrouter_keys
  ADD CONSTRAINT fk_openrouter_keys_updated_by FOREIGN KEY (updated_by) REFERENCES users(id);

-- 6. OPENROUTER_SETTINGS: Thêm FK cho updated_by
ALTER TABLE openrouter_settings
  ADD CONSTRAINT fk_openrouter_settings_updated_by FOREIGN KEY (updated_by) REFERENCES users(id);

-- 7. SESSIONS: Đổi userID từ VARCHAR sang INT và thêm FK
-- Quan trọng: Backup dữ liệu trước khi chạy!
-- Nếu bảng sessions đang dùng userID là string, cần convert trước:
-- UPDATE sessions SET userID = CAST(userID AS SIGNED) WHERE userID REGEXP '^[0-9]+$';

ALTER TABLE sessions
  MODIFY COLUMN userID INT NOT NULL;

ALTER TABLE sessions
  ADD CONSTRAINT fk_sessions_user FOREIGN KEY (userID) REFERENCES users(id);

-- ================================================
-- Verify: Kiểm tra các FK đã được tạo
-- ================================================
SELECT
  TABLE_NAME,
  COLUMN_NAME,
  CONSTRAINT_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND REFERENCED_TABLE_NAME IS NOT NULL
  AND TABLE_NAME IN (
    'audit_logs', 'course_manager_verifications', 'course_review_events',
    'lesson_resource_review_events', 'openrouter_keys', 'openrouter_settings', 'sessions'
  );
