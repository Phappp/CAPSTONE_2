import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import requireAuthorizedUser from '../../../middlewares/auth';
import { CourseController } from './controller';

function ensureUploadsDir() {
  const dir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, ensureUploadsDir());
  },
  filename: (_req, file, cb) => {
    const safe = file.originalname.replace(/[^\w.\-]+/g, '_');
    const unique = `${Date.now()}_${Math.floor(Math.random() * 1e9)}_${safe}`;
    cb(null, unique);
  },
});

const upload = multer({ storage });

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

        const url = `/uploads/${file.filename}`;
        const result = await controller.service.createLessonFileResource(uid, courseId, lessonId, {
          filename: file.originalname,
          mime_type: file.mimetype,
          size_bytes: file.size,
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
        const url = `/uploads/${file.filename}`;
        res.status(201).json({ url });
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

        const url = `/uploads/${file.filename}`;
        await controller.service.updateLessonResourcePreview(uid, courseId, resourceId, {
          filename: file.originalname,
          mime_type: file.mimetype,
          size_bytes: file.size,
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

