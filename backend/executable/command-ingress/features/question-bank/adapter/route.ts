import express from 'express';
import requireAuthorizedUser from '../../../middlewares/auth';
import { QuestionBankController } from './controller';
import { QuestionBankServiceImpl } from '../domain/service';

const initQuestionBankRoute = () => {
    const router = express.Router();

    // start dependency injection
    const service = new QuestionBankServiceImpl();
    const controller = new QuestionBankController(service);

    // POST /api/v1/question-banks
    router.route('/')
        .post(requireAuthorizedUser, controller.createQuestionBank.bind(controller));

    // POST /api/v1/question-banks/:bankId/questions
    router.route('/:bankId/questions')
        .post(requireAuthorizedUser, controller.addQuestionToBank.bind(controller));

    return router;
};

export default initQuestionBankRoute;