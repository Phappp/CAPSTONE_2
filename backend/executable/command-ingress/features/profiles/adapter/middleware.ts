import multer from "multer";

const storage = multer.memoryStorage();

const allowedMimeTypes = ["image/jpeg", "image/png", "image/gif"];

export const uploadAvatarMiddleware = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error("Chỉ chấp nhận file JPEG, PNG hoặc GIF"));
    }
    cb(null, true);
  },
});