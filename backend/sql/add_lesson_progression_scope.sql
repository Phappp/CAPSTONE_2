-- Cột điều kiện mở khóa tiến độ cho bài quiz/assignment (chạy thủ công nếu không dùng TypeORM synchronize).
ALTER TABLE lessons
  ADD COLUMN progression_scope VARCHAR(16) NOT NULL DEFAULT 'lesson';
