import express from 'express';
import multer from 'multer';
import requireAuthorizedUser from '../../../middlewares/auth';
import { CourseController } from './controller';
import { isCloudinaryEnabled, uploadBufferToCloudinary } from '../../../lib/cloudinary';

// Giới hạn 100MB cho lesson resource (video Free plan tối đa 100MB; raw 10MB — Cloudinary sẽ báo lỗi nếu raw > 10MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
});

const initCourseUploadRoute = (controller: CourseController) => {
  const router = express.Router();

  // Upload resource for a lesson
  router.post(
    '/:id/lessons/:lessonId/resources/upload',
    requireAuthorizedUser,
    upload.single('file'),
    async (req: any, res, next) => {
      try {
        const uid = Number(req.getSubject());
        const courseId = Number(req.params.id);
        const lessonId = Number(req.params.lessonId);
        const file = req.file;
        if (!file) {
          res.status(400).json({ message: 'Vui lòng chọn file.' });
          return;
        }

        if (!isCloudinaryEnabled()) {
          res.status(500).json({
            message:
              'Cloudinary chưa được cấu hình. Vui lòng thiết lập CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.',
          });
          return;
        }

        // Video dùng resource_type 'video' (giới hạn 100MB); file khác (PDF, Word, audio...) dùng 'raw' (giới hạn 10MB).
        const isVideo = (file.mimetype || '').startsWith('video/');
        const resultUpload = await uploadBufferToCloudinary({
          buffer: file.buffer,
          folder: `capstone/courses/${courseId}/lessons/${lessonId}/resources`,
          originalFilename: file.originalname,
          resourceType: isVideo ? 'video' : 'raw',
        });
        const url = resultUpload.secure_url;
        const sizeBytes = resultUpload.bytes;
        const result = await controller.service.createLessonFileResource(uid, courseId, lessonId, {
          filename: file.originalname,
          mime_type: file.mimetype,
          size_bytes: sizeBytes,
          url,
        });
        res.status(201).json({ id: result.id, url });
      } catch (err) {
        next(err);
      }
    }
  );

  // Upload thumbnail for a course (used by create/edit course)
  router.post(
    '/thumbnails/upload',
    requireAuthorizedUser,
    upload.single('file'),
    async (req: any, res, next) => {
      try {
        const file = req.file;
        if (!file) {
          res.status(400).json({ message: 'Vui lòng chọn file.' });
          return;
        }
        if (!isCloudinaryEnabled()) {
          res.status(500).json({
            message:
              'Cloudinary chưa được cấu hình. Vui lòng thiết lập CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.',
          });
          return;
        }
        const resultUpload = await uploadBufferToCloudinary({
          buffer: file.buffer,
          folder: `capstone/courses/thumbnails`,
          originalFilename: file.originalname,
          resourceType: 'image',
        });
        res.status(201).json({ url: resultUpload.secure_url });
      } catch (err) {
        next(err);
      }
    }
  );

  // Upload/update preview thumbnail for an existing resource
  router.post(
    '/:id/resources/:resourceId/preview',
    requireAuthorizedUser,
    upload.single('file'),
    async (req: any, res, next) => {
      try {
        const uid = Number(req.getSubject());
        const courseId = Number(req.params.id);
        const resourceId = Number(req.params.resourceId);
        const file = req.file;
        if (!file) {
          res.status(400).json({ message: 'Vui lòng chọn file thumbnail.' });
          return;
        }

        if (!isCloudinaryEnabled()) {
          res.status(500).json({
            message:
              'Cloudinary chưa được cấu hình. Vui lòng thiết lập CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.',
          });
          return;
        }

        const resultUpload = await uploadBufferToCloudinary({
          buffer: file.buffer,
          folder: `capstone/courses/${courseId}/resources/${resourceId}/preview`,
          originalFilename: file.originalname,
          resourceType: 'image',
        });
        const url = resultUpload.secure_url;
        const sizeBytes = resultUpload.bytes;
        await controller.service.updateLessonResourcePreview(uid, courseId, resourceId, {
          filename: file.originalname,
          mime_type: file.mimetype,
          size_bytes: sizeBytes,
          url,
        });
        res.status(201).json({ preview_url: url });
      } catch (err) {
        next(err);
      }
    }
  );

  return router;
};

export default initCourseUploadRoute;

