/**
 * Script: backfill_completed_at.sql
 * Mục đích: Cập nhật completed_at cho các lesson_completions cũ (NULL)
 * bằng cách lấy từ lesson_progress.updated_at
 *
 * Chạy: mysql -u root -p capstone_db < backfill_completed_at.sql
 */
UPDATE lesson_completions lc
JOIN (
    SELECT lp.user_id, lp.lesson_id, lp.updated_at
    FROM lesson_progress lp
    INNER JOIN lesson_completions lc2 ON lp.user_id = lc2.user_id AND lp.lesson_id = lc2.lesson_id
    WHERE lc2.completed_at IS NULL
) AS source ON lc.user_id = source.user_id AND lc.lesson_id = source.lesson_id
SET lc.completed_at = source.updated_at;
