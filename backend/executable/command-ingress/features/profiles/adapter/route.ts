import { Router } from "express";
import { ProfileController } from "./controller";
import { uploadAvatarMiddleware, uploadVerificationDocumentMiddleware } from "./middleware";
import requireAuthorizedUser from "../../../middlewares/auth";

export const createProfileRoutes = (controller: ProfileController) => {
  const router = Router();

  router.use(requireAuthorizedUser);

  router.get("/profile", controller.getProfile);
  router.put("/profile", controller.updateProfile);
  router.post(
    "/profile/avatar",
    uploadAvatarMiddleware.single("file"),
    controller.uploadAvatar
  );
  router.delete("/profile/avatar", controller.deleteAvatar);
  router.post(
    "/profile/course-manager-documents",
    uploadVerificationDocumentMiddleware.single("file"),
    controller.uploadCourseManagerDocument
  );
  router.put("/profile/change-password", controller.changePassword);
  router.patch("/profile/security", controller.updateSecuritySettings);
  router.get("/profile/course-manager-readiness", controller.getCourseManagerReadiness);
  router.put("/profile/course-manager-application", controller.submitCourseManagerApplication);
  return router;
};