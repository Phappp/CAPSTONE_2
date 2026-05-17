import { NextFunction, Response } from 'express';
import { BaseController } from '../../../shared/base-controller';
import { HttpRequest } from '../../../types';
import { ChatbotService } from '../types';
import { ChatbotMessageBody } from './dto';

export class ChatbotController extends BaseController {
    service: ChatbotService;

    constructor(service: ChatbotService) {
        super();
        this.service = service;
    }

    async sendMessage(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
        await this.execWithTryCatchBlock(req, res, next, async () => {
            const userId = Number(req.getSubject());

            const body = new ChatbotMessageBody(req.body);
            const validateResult = await body.validate();
            if (!validateResult.ok) {
                res.status(400).json({
                    error: 'err_validation',
                    message: validateResult.errors,
                });
                return;
            }

            const result = await this.service.processMessage(
                userId,
                body.message,
                body.conversationHistory,
                body.enrolledCourseIds,
                body.learningContext,
                body.chatMode
            );

            console.log('[Chatbot Debug] conversationHistory received:', JSON.stringify(body.conversationHistory?.slice(-4)));

            res.status(200).json({
                success: true,
                data: result,
            });
        });
    }
}
