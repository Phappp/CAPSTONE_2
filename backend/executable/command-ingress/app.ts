/* eslint-disable @typescript-eslint/no-explicit-any */
import express from 'express';
import env from './utils/env';
import logger from './middlewares/logger';
import morgan from 'morgan';

import cors from 'cors';
import { recoverMiddleware } from './middlewares/recover';
import { createServer } from 'http';
import path from 'path';

import { AuthController } from './features/auth/adapter/controller';
import { AuthServiceImpl } from './features/auth/domain/service';
import { GoogleIdentityBroker } from './features/auth/identity-broker/google-idp.broker';
import initAuthRoute from './features/auth/adapter/route';
import { AdminUserController } from './features/admin-users/adapter/controller';
import { AdminUserService } from './features/admin-users/domain/service';
import initAdminUserRoute from './features/admin-users/adapter/route';
import initCourseRoute from './features/course/adapter/route';
import { CourseController } from './features/course/adapter/controller';
import { CourseServiceImpl } from './features/course/domain/service';
import initAssignmentRoute from './features/assignment/adapter/route';
import { AssignmentController } from './features/assignment/adapter/controller';
import { AssignmentServiceImpl } from './features/assignment/domain/service';

import { ProfileController } from './features/profiles/adapter/controller';
import { ProfileService } from './features/profiles/domain/services';
import { MysqlProfileRepository } from './features/profiles/domain/repository';
import { createProfileRoutes } from './features/profiles/adapter/route';
import { uploadBufferToCloudinary, isCloudinaryEnabled } from './lib/cloudinary';

import initQuestionBankRoute from './features/question-bank/adapter/route';
import initPaymentRoute from './features/payments/adapter/route';
import { PaymentController } from './features/payments/adapter/controller';
import { PaymentServiceImpl } from './features/payments/domain/service';
import initLiveSessionRoute from './features/live-session/adapter/route';
import { LiveSessionController } from './features/live-session/adapter/controller';
import { LiveSessionServiceImpl } from './features/live-session/domain/service';
import initAiShortAnswerRoute from './features/ai-short-answer/adapter/route';
import { AiShortAnswerController } from './features/ai-short-answer/adapter/controller';
import initChatbotRoute from './features/chatbot/adapter/route';


const app = express();

const createHttpServer = (redisClient: any) => {
  const server = createServer(app);

  const isProd = !env.DEV;
  if (isProd) {
    app.use(logger);
  }
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Construct services
  const googleIdentityBroker = new GoogleIdentityBroker({
    clientID: env.GOOGLE_OAUTH_CLIENT_ID,
    clientSecret: env.GOOGLE_OAUTH_CLIENT_SECRET,
    redirectURL: env.GOOGLE_OAUTH_REDIRECT_URL,
  });

  const authService = new AuthServiceImpl(
    googleIdentityBroker,
    env.JWT_SECRET,
    env.JWT_REFRESH_SECRET,
  );
  const adminUserService = new AdminUserService();

  // Setup routes
  app.use('/api/auth', initAuthRoute(new AuthController(authService)));
  app.use(
    '/api/v1/admin/users',
    initAdminUserRoute(new AdminUserController(adminUserService)),
  );


  app.use('/api/v1/courses', initCourseRoute(new CourseController(new CourseServiceImpl())));
  app.use('/api/v1', initAssignmentRoute(new AssignmentController(new AssignmentServiceImpl())));
  app.use('/api/v1/question-banks', initQuestionBankRoute());
  app.use('/api/v1/payments', initPaymentRoute(new PaymentController(new PaymentServiceImpl())));
  app.use('/api/v1/live-sessions', initLiveSessionRoute(new LiveSessionController(new LiveSessionServiceImpl())));
  app.use('/api/v1/ai', initAiShortAnswerRoute(new AiShortAnswerController()));
  app.use('/api/v1/chatbot', initChatbotRoute());
  app.use(recoverMiddleware);

  // app.use('/search', searchRouter);
  // app.use('/suggestions', setupSuggestionRoute());
  const profileRepository = new MysqlProfileRepository();

  const storageService = {
    uploadAvatar: async (file: Buffer, fileName: string, mimeType: string): Promise<string> => {
      if (!isCloudinaryEnabled()) {
        throw new Error('Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.');
      }

      const result = await uploadBufferToCloudinary({
        buffer: file,
        folder: fileName.includes("manager-docs") ? "manager-docs" : "avatars",
        originalFilename: fileName,
        resourceType: mimeType?.startsWith("image/") ? "image" : "raw",
      });

      return result.secure_url;
    },
    deleteFile: async (fileUrl: string): Promise<void> => {
      // Hiện tại chỉ cần xóa metadata phía mình, Cloudinary có thể đặt lifecycle rule nếu cần
      if (!fileUrl) return;
      // Có thể mở rộng sau để gọi cld.uploader.destroy nếu lưu cả public_id
      return;
    },
  } as any;

  const profileService = new ProfileService(profileRepository, storageService);
  const profileController = new ProfileController(profileService);

  // FE uses /api/v1/profile...
  app.use('/api/v1', createProfileRoutes(profileController));

  // chấm điểm đánh giá
  const assignmentService = new AssignmentServiceImpl();
  const assignmentController = new AssignmentController(assignmentService);

  app.use('/api/assignments', initAssignmentRoute(assignmentController));
  return server;
};

export {
  createHttpServer,
};
