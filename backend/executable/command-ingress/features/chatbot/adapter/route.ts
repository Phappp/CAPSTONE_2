import express from 'express';
import requireAuthorizedUser from '../../../middlewares/auth';
import { ChatbotController } from './controller';
import { ChatbotServiceImpl } from '../domain/service';

const initChatbotRoute = () => {
    const router = express.Router();

    const service = new ChatbotServiceImpl();
    const controller = new ChatbotController(service);

    router.route('/message').post(requireAuthorizedUser, controller.sendMessage.bind(controller));

    return router;
};

export default initChatbotRoute;
