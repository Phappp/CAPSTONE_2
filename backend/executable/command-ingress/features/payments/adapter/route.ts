import express from 'express';
import requireAuthorizedUser from '../../../middlewares/auth';
import { PaymentController } from './controller';

const initPaymentRoute = (controller: PaymentController): express.Router => {
  const router = express.Router();

  router.route('/momo/orders').post(requireAuthorizedUser, controller.createMomoOrder.bind(controller));
  router.route('/orders/:id').get(requireAuthorizedUser, controller.getMyOrder.bind(controller));
  router.route('/orders/:id/mock-complete').post(requireAuthorizedUser, controller.completeMockOrder.bind(controller));
  router.route('/momo/ipn').post(controller.momoIpn.bind(controller));
  router.route('/momo/return').get(controller.momoReturn.bind(controller));

  return router;
};

export default initPaymentRoute;

