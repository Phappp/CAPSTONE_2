import { NextFunction, Response } from 'express';
import { BaseController } from '../../../shared/base-controller';
import responseValidationError from '../../../shared/response';
import { HttpRequest } from '../../../types';
import { QuestionBankService } from '../types';
import { CreateQuestionBankBody, AddBankQuestionBody } from './dto';

export class QuestionBankController extends BaseController {
    service: QuestionBankService;

    constructor(service: QuestionBankService) {
        super();
        this.service = service;
    }

    async createQuestionBank(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
        await this.execWithTryCatchBlock(req, res, next, async () => {
            const uid = Number(req.getSubject());

            const body = new CreateQuestionBankBody(req.body, uid);
            const validateResult = await body.validate();
            if (!validateResult.ok) {
                responseValidationError(res, validateResult.errors[0]);
                return;
            }

            const result = await this.service.createBank(body);

            res.status(201).json({
                success: true,
                message: 'Tạo ngân hàng câu hỏi thành công!',
                data: result
            });
        });
    }

    async addQuestionToBank(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
        await this.execWithTryCatchBlock(req, res, next, async () => {
            const uid = Number(req.getSubject());
            const bankId = Number(req.params.bankId);

            if (!bankId || isNaN(bankId)) {
                res.status(400).json({ error: 'err_validation', message: ['Bank ID không hợp lệ!'] });
                return;
            }

            const body = new AddBankQuestionBody(req.body, bankId, uid);
            const validateResult = await body.validate();
            if (!validateResult.ok) {
                responseValidationError(res, validateResult.errors[0]);
                return;
            }

            const result = await this.service.addQuestion(body);

            // trả về kết quả JSON như tài liệu US-21
            res.status(201).json({
                success: true,
                message: 'Thêm câu hỏi thành công!',
                data: result
            });
        });
    }
}