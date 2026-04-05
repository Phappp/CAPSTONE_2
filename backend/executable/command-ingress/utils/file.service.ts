import fs from 'fs';
import path from 'path';

/**
 * FileService:
 * - Lưu file từ memory buffer lên disk
 * - Xóa file khi cần
 * - Trả về đường dẫn URL hợp lệ cho client
 */

const uploadDir = path.join(process.cwd(), 'uploads', 'submissions');

export class FileService {
  static ensureDir() {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
  }

  static async saveFiles(files: Express.Multer.File[]): Promise<string[]> {
    this.ensureDir();
    const savedFiles: string[] = [];

    try {
      for (const file of files) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        const filename = file.fieldname.replace('[]', '') + '-' + uniqueSuffix + ext;
        const filePath = path.join(uploadDir, filename);

        if (file.buffer) {
          fs.writeFileSync(filePath, file.buffer);
          savedFiles.push(filePath);
        } else if (file.path) {
          savedFiles.push(file.path);
        }
      }

      return savedFiles;

    } catch (err) {
      for (const p of savedFiles) {
        try {
          await fs.promises.unlink(p);
        } catch {}
      }

      throw err;
    }
  }

  static deleteFiles(paths: string[]) {
    for (const p of paths) {
      if (fs.existsSync(p)) {
        fs.unlinkSync(p);
      }
    }
  }

  static toClientPath(absPath: string) {
    const filename = path.basename(absPath);
    return `/uploads/submissions/${filename}`;
  }
}