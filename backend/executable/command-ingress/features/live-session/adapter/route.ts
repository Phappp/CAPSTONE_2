import express from 'express';
import requireAuthorizedUser from '../../../middlewares/auth';
import { LiveSessionController } from './controller';

const initLiveSessionRoute: (controller: LiveSessionController) => express.Router = (controller) => {
  const router = express.Router();

  // Create session - Teacher only
  router.route('/').post(requireAuthorizedUser, controller.createSession.bind(controller));

  // List sessions - Authenticated users
  router.route('/').get(requireAuthorizedUser, controller.listSessions.bind(controller));

  // Get session by ID - Authenticated users
  router.route('/:id').get(requireAuthorizedUser, controller.getSessionById.bind(controller));

  // Update session - Teacher only (owner)
  router.route('/:id').patch(requireAuthorizedUser, controller.updateSession.bind(controller));

  // Delete session - Teacher only (owner)
  router.route('/:id').delete(requireAuthorizedUser, controller.deleteSession.bind(controller));

  // Start session - Teacher only (owner)
  router.route('/:id/start').post(requireAuthorizedUser, controller.startSession.bind(controller));

  // End session - Teacher only (owner)
  router.route('/:id/end').post(requireAuthorizedUser, controller.endSession.bind(controller));

  return router;
};

export default initLiveSessionRoute;
