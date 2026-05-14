import multer from "multer";

const storage = multer.memoryStorage();

const allowedMimeTypes = ["image/jpeg", "image/png", "image/gif"];
const allowedVerificationMimeTypes = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

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

export const uploadVerificationDocumentMiddleware = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (!allowedVerificationMimeTypes.includes(file.mimetype)) {
      return cb(new Error("Chỉ chấp nhận file PDF, JPG, PNG hoặc WEBP"));
    }
    cb(null, true);
  },
});