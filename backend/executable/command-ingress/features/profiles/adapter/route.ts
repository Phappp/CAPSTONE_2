import { Router } from "express";
import { ProfileController } from "./controller";
import { uploadAvatarMiddleware } from "./middleware";
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
  router.put("/profile/change-password", controller.changePassword);
  router.patch("/profile/security", controller.updateSecuritySettings);
  return router;
};