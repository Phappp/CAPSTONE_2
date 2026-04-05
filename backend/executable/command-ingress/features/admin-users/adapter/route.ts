import express from 'express';
import requireAuthorizedUser from '../../../middlewares/auth';
import { AdminUserController } from './controller';

const initAdminUserRoute: (controller: AdminUserController) => express.Router = (controller) => {
  const router = express.Router();

  router.use(requireAuthorizedUser);

  router.route('/')
    .get(controller.listUsers.bind(controller));

  router.route('/bulk')
    .post(controller.bulkAction.bind(controller));

  router.route('/audit-logs')
    .get(controller.listAuditLogs.bind(controller));

  router.route('/:userId/status')
    .put(controller.updateStatus.bind(controller));

  router.route('/:userId/role')
    .put(controller.updateRole.bind(controller));

  router.route('/:userId/reset-password')
    .post(controller.resetPassword.bind(controller));

  router.route('/:userId/restore')
    .post(controller.restoreUser.bind(controller));

  router.route('/:userId')
    .delete(controller.softDelete.bind(controller));

  router.route('/:userId/hard-delete')
    .delete(controller.hardDelete.bind(controller));

  return router;
};

export default initAdminUserRoute;

