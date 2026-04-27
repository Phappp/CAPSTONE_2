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
        .get(requireAuthorizedUser, controller.listBanks.bind(controller))
        .post(requireAuthorizedUser, controller.createQuestionBank.bind(controller));

    // GET/PATCH/DELETE /api/v1/question-banks/:bankId
    router.route('/:bankId')
        .get(requireAuthorizedUser, controller.getBankUsage.bind(controller))
        .patch(requireAuthorizedUser, controller.updateBank.bind(controller))
        .delete(requireAuthorizedUser, controller.deleteBank.bind(controller));

    // POST/GET /api/v1/question-banks/:bankId/questions
    router.route('/:bankId/questions')
        .get(requireAuthorizedUser, controller.getBankQuestions.bind(controller))
        .post(requireAuthorizedUser, controller.addQuestionToBank.bind(controller));

    router.route('/:bankId/questions/batch')
        .post(requireAuthorizedUser, controller.addQuestionsToBankBatch.bind(controller));

    router.route('/:bankId/questions/ai-generate')
        .post(requireAuthorizedUser, controller.generateQuestionsByAi.bind(controller));

    // PATCH/DELETE /api/v1/question-banks/:bankId/questions/:questionId
    router.route('/:bankId/questions/:questionId')
        .patch(requireAuthorizedUser, controller.updateQuestion.bind(controller))
        .delete(requireAuthorizedUser, controller.deleteQuestion.bind(controller));

    return router;
};

export default initQuestionBankRoute;