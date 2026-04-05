import { Response } from "express";
import { HttpRequest } from "../../../types";
import { ProfileService } from "../domain/services";
import { validateUpdateProfile } from "./validators";

export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  getProfile = async (req: HttpRequest, res: Response) => {
    try {
      const userId = Number(req.getSubject?.());
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const profile = await this.profileService.getProfile(userId);

      return res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Không thể lấy thông tin hồ sơ",
      });
    }
  };

  updateProfile = async (req: HttpRequest, res: Response) => {
    try {
      const userId = Number(req.getSubject?.());
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const payload = validateUpdateProfile(req.body);
      const profile = await this.profileService.updateProfile(userId, payload);

      return res.status(200).json({
        success: true,
        message: "Cập nhật hồ sơ thành công!",
        data: profile,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Cập nhật hồ sơ thất bại",
      });
    }
  };

  uploadAvatar = async (req: HttpRequest, res: Response) => {
    try {
      const userId = Number(req.getSubject?.());
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      const file = req.file;
      if (!file) {
        return res.status(400).json({
          success: false,
          message: "Vui lòng chọn ảnh tải lên",
        });
      }

      const result = await this.profileService.uploadAvatar(userId, file);

      return res.status(200).json({
        success: true,
        message: "Tải ảnh đại diện thành công!",
        data: result,
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Upload avatar thất bại",
      });
    }
  };

  deleteAvatar = async (req: HttpRequest, res: Response) => {
    try {
      const userId = Number(req.getSubject?.());
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      await this.profileService.deleteAvatar(userId);

      return res.status(200).json({
        success: true,
        message: "Xóa ảnh đại diện thành công!",
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Xóa avatar thất bại",
      });
    }
  };
  changePassword = async (req: HttpRequest, res: Response) => {
    try {
      const userId = Number(req.getSubject?.());
      const { old_password, new_password, confirm_password } = req.body;

      if (new_password !== confirm_password) {
        throw new Error("Xác nhận mật khẩu mới không khớp");
      }
      if (new_password.length < 8) {
        throw new Error("Mật khẩu mới phải có ít nhất 8 ký tự");
      }

      await this.profileService.changePassword(userId, old_password, new_password);

      return res.status(200).json({
        success: true,
        message: "Cập nhật mật khẩu thành công!",
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Đổi mật khẩu thất bại",
      });
    }
  };
  updateSecuritySettings = async (req: HttpRequest, res: Response) => {
    try {
      const userId = Number(req.getSubject?.());
      if (!userId) throw new Error("Unauthorized");

      await this.profileService.updateSecurity(userId, req.body);

      return res.status(200).json({
        success: true,
        message: "Lưu cài đặt bảo mật thành công!",
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message || "Không thể lưu cài đặt bảo mật",
      });
    }
  };
}