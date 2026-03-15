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

const app = express();

const createHttpServer = (redisClient: any) => {
  const server = createServer(app);

  const isProd = !env.DEV;
  if (isProd) {
    app.use(logger);
  }
  app.use(cors());
  app.use(morgan('combined'));
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

  // Setup routes
  app.use('/api/auth', initAuthRoute(new AuthController(authService)));
  app.use('/api/v1/courses', initCourseRoute(new CourseController(new CourseServiceImpl())));
  app.use('/api/v1', initAssignmentRoute(new AssignmentController(new AssignmentServiceImpl())));

  app.use(recoverMiddleware);

  // app.use('/search', searchRouter);
  // app.use('/suggestions', setupSuggestionRoute());
  const profileRepository = new MysqlProfileRepository();

  const storageService = {
    // Cập nhật đúng các tham số nếu cần để không bị lỗi logic sau này
    uploadAvatar: async (file: Buffer, fileName: string, mimeType: string) => "mock-avatar-url", 
    
    // Đổi tên từ deleteAvatar thành deleteFile
    deleteFile: async (fileUrl: string) => {
      console.log("Mock delete file:", fileUrl);
      return;
    }
  } as any;

  const profileService = new ProfileService(profileRepository, storageService);
  const profileController = new ProfileController(profileService);

  app.use('/api', createProfileRoutes(profileController));

  return server;
};

export {
  createHttpServer,
};
