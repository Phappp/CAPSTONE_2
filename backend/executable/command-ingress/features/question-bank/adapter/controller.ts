import { NextFunction, Response } from 'express';
import { BaseController } from '../../../shared/base-controller';
import responseValidationError from '../../../shared/response';
import { HttpRequest } from '../../../types';
import { QuestionBankService } from '../types';
import {
  CreateQuestionBankBody,
  AddBankQuestionBody,
  UpdateQuestionBankBody,
  UpdateBankQuestionBody,
  GenerateBankQuestionsAiBody,
} from './dto';

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

    async addQuestionsToBankBatch(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
        await this.execWithTryCatchBlock(req, res, next, async () => {
            const uid = Number(req.getSubject());
            const bankId = Number(req.params.bankId);

            if (!bankId || isNaN(bankId)) {
                res.status(400).json({ error: 'err_validation', message: ['Bank ID không hợp lệ!'] });
                return;
            }

            const rawQuestions = Array.isArray(req.body?.questions) ? req.body.questions : [];
            if (!rawQuestions.length) {
                res.status(400).json({ error: 'err_validation', message: ['Danh sách câu hỏi không được rỗng!'] });
                return;
            }

            const dtoList: AddBankQuestionBody[] = [];
            for (let i = 0; i < rawQuestions.length; i += 1) {
                const dto = new AddBankQuestionBody(rawQuestions[i], bankId, uid);
                const validateResult = await dto.validate();
                if (!validateResult.ok) {
                    responseValidationError(res, validateResult.errors[0]);
                    return;
                }
                dtoList.push(dto);
            }

            const data = await this.service.addQuestionsBatch(dtoList);
            res.status(201).json({
                success: true,
                message: `Thêm ${data.length} câu hỏi thành công!`,
                data,
            });
        });
    }

    async listBanks(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
        await this.execWithTryCatchBlock(req, res, next, async () => {
            const uid = Number(req.getSubject());
            const courseIdRaw = req.query.course_id;
            const courseId =
              courseIdRaw != null && String(courseIdRaw).trim() !== ''
                ? Number(courseIdRaw)
                : undefined;

            if (courseId !== undefined && Number.isNaN(courseId)) {
                res.status(400).json({ error: 'err_validation', message: ['course_id không hợp lệ!'] });
                return;
            }

            const data = await this.service.listBanks(uid, courseId);
            res.status(200).json({ success: true, data });
        });
    }

    async getBankQuestions(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
        await this.execWithTryCatchBlock(req, res, next, async () => {
            const uid = Number(req.getSubject());
            const bankId = Number(req.params.bankId);
            if (!bankId || Number.isNaN(bankId)) {
                res.status(400).json({ error: 'err_validation', message: ['Bank ID không hợp lệ!'] });
                return;
            }
            const data = await this.service.getBankQuestions(bankId, uid);
            res.status(200).json({ success: true, data });
        });
    }

    async updateBank(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
        await this.execWithTryCatchBlock(req, res, next, async () => {
            const uid = Number(req.getSubject());
            const bankId = Number(req.params.bankId);
            if (!bankId || Number.isNaN(bankId)) {
                res.status(400).json({ error: 'err_validation', message: ['Bank ID không hợp lệ!'] });
                return;
            }

            const body = new UpdateQuestionBankBody(req.body);
            const validateResult = await body.validate();
            if (!validateResult.ok) {
                responseValidationError(res, validateResult.errors[0]);
                return;
            }

            const data = await this.service.updateBank(bankId, uid, {
              name: body.name,
              description: body.description,
              is_shared: body.is_shared,
            });
            res.status(200).json({ success: true, message: 'Cập nhật ngân hàng câu hỏi thành công!', data });
        });
    }

    async deleteBank(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
        await this.execWithTryCatchBlock(req, res, next, async () => {
            const uid = Number(req.getSubject());
            const bankId = Number(req.params.bankId);
            if (!bankId || Number.isNaN(bankId)) {
                res.status(400).json({ error: 'err_validation', message: ['Bank ID không hợp lệ!'] });
                return;
            }
            await this.service.deleteBank(bankId, uid);
            res.status(200).json({ success: true, message: 'Xóa ngân hàng câu hỏi thành công!' });
        });
    }

    async updateQuestion(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
        await this.execWithTryCatchBlock(req, res, next, async () => {
            const uid = Number(req.getSubject());
            const bankId = Number(req.params.bankId);
            const questionId = Number(req.params.questionId);

            if (!bankId || Number.isNaN(bankId) || !questionId || Number.isNaN(questionId)) {
                res.status(400).json({ error: 'err_validation', message: ['ID không hợp lệ!'] });
                return;
            }

            const body = new UpdateBankQuestionBody(req.body);
            const validateResult = await body.validate();
            if (!validateResult.ok) {
                responseValidationError(res, validateResult.errors[0]);
                return;
            }

            const data = await this.service.updateQuestion(bankId, questionId, uid, {
              question_type: body.question_type,
              question_text: body.question_text,
              difficulty: body.difficulty,
              category: body.category,
              tags: body.tags,
              points: body.points,
              options: body.options,
              explanation: body.explanation,
            });
            res.status(200).json({ success: true, message: 'Cập nhật câu hỏi thành công!', data });
        });
    }

    async deleteQuestion(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
        await this.execWithTryCatchBlock(req, res, next, async () => {
            const uid = Number(req.getSubject());
            const bankId = Number(req.params.bankId);
            const questionId = Number(req.params.questionId);

            if (!bankId || Number.isNaN(bankId) || !questionId || Number.isNaN(questionId)) {
                res.status(400).json({ error: 'err_validation', message: ['ID không hợp lệ!'] });
                return;
            }

            await this.service.deleteQuestion(bankId, questionId, uid);
            res.status(200).json({ success: true, message: 'Xóa câu hỏi thành công!' });
        });
    }

    async generateQuestionsByAi(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
        await this.execWithTryCatchBlock(req, res, next, async () => {
            const uid = Number(req.getSubject());
            const bankId = Number(req.params.bankId);
            if (!bankId || Number.isNaN(bankId)) {
                res.status(400).json({ error: 'err_validation', message: ['Bank ID không hợp lệ!'] });
                return;
            }

            const body = new GenerateBankQuestionsAiBody(req.body);
            const validateResult = await body.validate();
            if (!validateResult.ok) {
                responseValidationError(res, validateResult.errors[0]);
                return;
            }

            const data = await this.service.generateQuestionsWithAi(bankId, uid, {
              topic: body.topic,
              question_count: body.question_count,
              difficulty: body.difficulty,
              question_type: body.question_type,
              extra_instructions: body.extra_instructions,
              attachment_name: body.attachment_name,
              attachment_text: body.attachment_text,
            });
            res.status(200).json({
              success: true,
              message: 'AI đã tạo câu hỏi thành công!',
              data,
            });
        });
    }
}