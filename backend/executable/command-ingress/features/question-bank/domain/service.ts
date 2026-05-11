import { Brackets, DataSource } from 'typeorm';
import AppDataSource from '../../../../../lib/database';
import QuestionBank from '../../../../../internal/model/question_banks';
import BankQuestion from '../../../../../internal/model/bank_questions';
import BankQuestionOption from '../../../../../internal/model/bank_question_options';
import QuizQuestion from '../../../../../internal/model/quiz_question';
import Quiz from '../../../../../internal/model/quizze';
import Lesson from '../../../../../internal/model/lesson';
import UserRole from '../../../../../internal/model/user_roles';
import Role from '../../../../../internal/model/role';
import OpenRouterKey from '../../../../../internal/model/openrouter_key';
import OpenRouterSetting from '../../../../../internal/model/openrouter_setting';
import crypto from 'crypto';
import { CreateQuestionBankBody, AddBankQuestionBody } from '../adapter/dto';
import { QuestionBankService } from '../types';

const AUTO_QUIZ_BANK_NAME = '__AUTO_QUIZ_INTERNAL_BANK__';

export class QuestionBankServiceImpl implements QuestionBankService {
    private dataSource: DataSource;

    constructor(){
        this.dataSource = AppDataSource;
    }

    private async ensureQuestionBankSchema(): Promise<void> {
        const table = 'question_banks';
        const column = 'is_active';
        const rows = await this.dataSource.query(
            `
            SELECT COUNT(*) AS cnt
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = ?
              AND COLUMN_NAME = ?
            `,
            [table, column]
        );
        const exists = Number((rows?.[0] as any)?.cnt || 0) > 0;
        if (!exists) {
            await this.dataSource.query(
                `ALTER TABLE question_banks ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1`
            );
        }
    }

    private async assertCourseManagerOrAdmin(userId: number): Promise<void> {
        const userRoleRepo = this.dataSource.getRepository(UserRole);
        const roleRepo = this.dataSource.getRepository(Role);

        const userRoles = await userRoleRepo.find({ where: { user_id: userId } });
        if (!userRoles.length) {
            throw new Error('Bạn không có quyền truy cập tính năng này.');
        }

        const roleIds = userRoles.map((item) => item.role_id);
        const roles = await roleRepo.findByIds(roleIds);
        const normalized = roles.map((item) => String(item.name).toLowerCase());

        if (!normalized.includes('course_manager') && !normalized.includes('teacher') && !normalized.includes('admin')) {
            throw new Error('Bạn không có quyền truy cập tính năng này.');
        }
    }

    private async getOwnedBankOrThrow(bankId: number, userId: number): Promise<QuestionBank> {
        await this.ensureQuestionBankSchema();
        const bankRepo = this.dataSource.getRepository(QuestionBank);
        const bank = await bankRepo.findOne({ where: { id: bankId, is_active: true } as any });
        if (!bank) {
            throw new Error('Question bank not found!');
        }
        if (bank.created_by !== userId) {
            throw new Error('Bạn không có quyền thao tác với ngân hàng câu hỏi này.');
        }
        return bank;
    }

    private async getReadableBankOrThrow(bankId: number, userId: number): Promise<QuestionBank> {
        await this.ensureQuestionBankSchema();
        const bankRepo = this.dataSource.getRepository(QuestionBank);
        const bank = await bankRepo.findOne({ where: { id: bankId, is_active: true } as any });
        if (!bank) {
            throw new Error('Question bank not found!');
        }
        if (bank.created_by !== userId && !Boolean((bank as any).is_shared)) {
            throw new Error('Bạn không có quyền truy cập ngân hàng câu hỏi này.');
        }
        return bank;
    }

    private validateQuestionBusinessRule(
        questionType: string,
        options?: Array<{ option_text: string; is_correct: boolean; explanation?: string }>
    ): void {
        if (questionType === 'multiple_choice' || questionType === 'true_false') {
            if (!options || options.length < 2) {
                throw new Error('Câu hỏi trắc nghiệm cần ít nhất 2 lựa chọn.');
            }
            const correctCount = options.filter((opt) => opt.is_correct).length;
            if (correctCount < 1) {
                throw new Error('Câu hỏi trắc nghiệm phải có ít nhất 1 đáp án đúng.');
            }
        }
        // short_answer, essay, fill_blank không cần options validation
    }

    private getOpenRouterEncryptionKey(): Buffer {
        const base = process.env.OPENROUTER_ENCRYPTION_SECRET || process.env.JWT_SECRET || 'mindbridge-openrouter-secret';
        return crypto.createHash('sha256').update(base).digest();
    }

    private decryptOpenRouterKey(payload: string): string {
        const [ivHex, encryptedHex] = String(payload || '').split(':');
        if (!ivHex || !encryptedHex) return '';
        const iv = Buffer.from(ivHex, 'hex');
        const encrypted = Buffer.from(encryptedHex, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', this.getOpenRouterEncryptionKey(), iv);
        const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
        return decrypted.toString('utf8');
    }

    async createBank(req: CreateQuestionBankBody): Promise<any>{
        await this.assertCourseManagerOrAdmin(req.user_id);
        await this.ensureQuestionBankSchema();
        const bankRepo = this.dataSource.getRepository(QuestionBank);

        const newBank = bankRepo.create({
            course_id: req.course_id,
            name: req.name,
            description: req.description,
            is_shared: req.is_shared || false,
            is_active: true,
            created_by: req.user_id
        });

        const savedBank = await bankRepo.save(newBank);
        return savedBank;
    }

    async addQuestion(req: AddBankQuestionBody): Promise<any>{
        await this.assertCourseManagerOrAdmin(req.user_id);
        const questionRepo = this.dataSource.getRepository(BankQuestion);
        await this.getOwnedBankOrThrow(req.bank_id, req.user_id);
        this.validateQuestionBusinessRule(req.question_type, req.options);

        // map option data nếu câu hỏi trắc nghiệm
        let mappedOptions: BankQuestionOption[] = [];
        if (req.options && req.options.length > 0) {
            mappedOptions = req.options.map((opt, index) => {
                const optionEntity = new BankQuestionOption();
                optionEntity.option_text = opt.option_text;
                optionEntity.is_correct = opt.is_correct;
                optionEntity.order_index = index + 1;
                optionEntity.explanation = opt.explanation;
                return optionEntity;
            });
        }

        // tạo question entity
        const newQuestion = questionRepo.create({
            bank_id: req.bank_id,
            question_type: req.question_type,
            question_text: req.question_text,
            explanation: req.explanation,
            difficulty: req.difficulty,
            category: req.category,
            tags: req.tags,
            points: req.points || 1.0,
            created_by: req.user_id,
            is_ai_generated: false,
            options: mappedOptions,
            max_length: req.max_length ?? null,
            grading_notes: req.grading_notes ?? null
        });

        const savedQuestion = await questionRepo.save(newQuestion);

        return {
            question_id: savedQuestion.id,
            bank_id: savedQuestion.bank_id,
            question_text: savedQuestion.question_text,
            created_at: savedQuestion.created_at
        };
    }

    async addQuestionsBatch(reqs: AddBankQuestionBody[]): Promise<any[]> {
        const results: any[] = [];
        for (const req of reqs) {
            const created = await this.addQuestion(req);
            results.push(created);
        }
        return results;
    }

    async listBanks(userId: number, courseId?: number, includeArchived: boolean = false): Promise<any[]> {
        await this.assertCourseManagerOrAdmin(userId);
        await this.ensureQuestionBankSchema();
        const bankRepo = this.dataSource.getRepository(QuestionBank);
        const qb = bankRepo.createQueryBuilder('qb');
        qb.where(new Brackets((sub) => {
            sub.where('qb.created_by = :userId', { userId });
            sub.orWhere('qb.is_shared = :isShared', { isShared: true });
        }));
        qb.andWhere('qb.name <> :autoName', { autoName: AUTO_QUIZ_BANK_NAME });
        if (!includeArchived) {
            qb.andWhere('qb.is_active = :isActive', { isActive: true });
        } else {
            qb.andWhere(new Brackets((sub) => {
                sub.where('qb.created_by = :userId', { userId });
                sub.orWhere('qb.is_active = :isActive', { isActive: true });
            }));
        }
        if (courseId) {
            qb.andWhere(new Brackets((sub) => {
                sub.where('qb.course_id = :courseId', { courseId });
                sub.orWhere('qb.is_shared = :isShared', { isShared: true });
            }));
        }
        qb.orderBy('qb.created_at', 'DESC');
        const banks = await qb.getMany();

        return (banks || []).map((bank: any) => ({
            ...bank,
            is_owned: Number(bank.created_by) === Number(userId),
        }));
    }

    async getBankUsage(bankId: number, userId: number): Promise<{ quiz_count: number; usages: any[] }> {
        await this.assertCourseManagerOrAdmin(userId);
        await this.getOwnedBankOrThrow(bankId, userId);
        const usageRows = await this.dataSource
            .getRepository(QuizQuestion)
            .createQueryBuilder('qq')
            .innerJoin(BankQuestion, 'bq', 'bq.id = qq.bank_question_id')
            .innerJoin(Quiz, 'qz', 'qz.id = qq.quiz_id')
            .leftJoin(Lesson, 'l', 'l.id = qz.lesson_id')
            .select('qq.quiz_id', 'quiz_id')
            .addSelect('COUNT(*)', 'question_count')
            .addSelect('qz.title', 'quiz_title')
            .addSelect('l.id', 'lesson_id')
            .addSelect('l.title', 'lesson_title')
            .where('bq.bank_id = :bankId', { bankId })
            .groupBy('qq.quiz_id')
            .addGroupBy('qz.title')
            .addGroupBy('l.id')
            .addGroupBy('l.title')
            .orderBy('COUNT(*)', 'DESC')
            .getRawMany();

        const usages = (usageRows || []).map((r: any) => ({
            quiz_id: Number(r.quiz_id),
            lesson_id: r.lesson_id != null ? Number(r.lesson_id) : null,
            lesson_title: r.lesson_title != null ? String(r.lesson_title) : null,
            quiz_title: r.quiz_title != null ? String(r.quiz_title) : null,
            question_count: Number(r.question_count || 0),
        }));
        return { quiz_count: usages.length, usages };
    }

    async getBankQuestions(bankId: number, userId: number): Promise<any[]> {
        await this.assertCourseManagerOrAdmin(userId);
        await this.getReadableBankOrThrow(bankId, userId);
        const questionRepo = this.dataSource.getRepository(BankQuestion);
        return await questionRepo.find({
            where: { bank_id: bankId },
            relations: ['options'],
            order: { created_at: 'DESC' },
        });
    }

    async updateBank(
      bankId: number,
      userId: number,
      payload: { name?: string; description?: string; is_shared?: boolean; is_active?: boolean }
    ): Promise<any> {
        await this.assertCourseManagerOrAdmin(userId);
        await this.ensureQuestionBankSchema();
        const bankRepo = this.dataSource.getRepository(QuestionBank);
        const bank = await this.getOwnedBankOrThrow(bankId, userId);
        if (payload.name !== undefined) bank.name = payload.name;
        if (payload.description !== undefined) bank.description = payload.description;
        if (payload.is_shared !== undefined) bank.is_shared = payload.is_shared;
        if (payload.is_active !== undefined) (bank as any).is_active = Boolean(payload.is_active);
        return await bankRepo.save(bank);
    }

    async deleteBank(bankId: number, userId: number): Promise<void> {
        await this.assertCourseManagerOrAdmin(userId);
        await this.ensureQuestionBankSchema();
        await this.getOwnedBankOrThrow(bankId, userId);
        await this.dataSource.transaction(async (manager) => {
            const bankRepo = manager.getRepository(QuestionBank);
            await bankRepo.update({ id: bankId } as any, { is_active: false } as any);
        });
    }

    async updateQuestion(
      bankId: number,
      questionId: number,
      userId: number,
      payload: {
        question_type?: string;
        question_text?: string;
        difficulty?: string;
        category?: string;
        tags?: string[];
        points?: number;
        options?: Array<{ option_text: string; is_correct: boolean; explanation?: string }>;
        explanation?: string;
        max_length?: number | null;
        grading_notes?: string | null;
      }
    ): Promise<any> {
        await this.assertCourseManagerOrAdmin(userId);
        await this.getOwnedBankOrThrow(bankId, userId);

        const questionRepo = this.dataSource.getRepository(BankQuestion);
        const question = await questionRepo.findOne({
            where: { id: questionId, bank_id: bankId },
            relations: ['options'],
        });
        if (!question) {
            throw new Error('Question not found!');
        }

        const nextType = payload.question_type ?? question.question_type;
        const nextOptions = payload.options ?? question.options;
        this.validateQuestionBusinessRule(nextType, nextOptions as any);

        if (payload.question_type !== undefined) question.question_type = payload.question_type;
        if (payload.question_text !== undefined) question.question_text = payload.question_text;
        if (payload.difficulty !== undefined) question.difficulty = payload.difficulty;
        if (payload.category !== undefined) question.category = payload.category;
        if (payload.tags !== undefined) question.tags = payload.tags;
        if (payload.points !== undefined) question.points = payload.points;
        if (payload.explanation !== undefined) question.explanation = payload.explanation;
        if (payload.max_length !== undefined) question.max_length = payload.max_length;
        if (payload.grading_notes !== undefined) question.grading_notes = payload.grading_notes;

        if (payload.options !== undefined) {
            question.options = payload.options.map((opt, index) => {
                const entity = new BankQuestionOption();
                entity.option_text = opt.option_text;
                entity.is_correct = opt.is_correct;
                entity.explanation = opt.explanation;
                entity.order_index = index + 1;
                return entity;
            });
        }

        return await questionRepo.save(question);
    }

    async deleteQuestion(bankId: number, questionId: number, userId: number): Promise<void> {
        await this.assertCourseManagerOrAdmin(userId);
        await this.getOwnedBankOrThrow(bankId, userId);
        await this.dataSource.transaction(async (manager) => {
            const questionRepo = manager.getRepository(BankQuestion);
            const optionRepo = manager.getRepository(BankQuestionOption);
            await optionRepo.delete({ question_id: questionId });
            await questionRepo.delete({ id: questionId, bank_id: bankId });
        });
    }

    async generateQuestionsWithAi(
      bankId: number,
      userId: number,
      payload: {
        topic: string;
        question_count?: number;
        difficulty?: 'easy' | 'medium' | 'hard';
        question_type?: 'multiple_choice' | 'true_false' | 'short_answer' | 'mixed';
        extra_instructions?: string;
        attachment_name?: string;
        attachment_text?: string;
      }
    ): Promise<Array<{
      question_type: 'multiple_choice' | 'true_false' | 'short_answer';
      question_text: string;
      difficulty: 'easy' | 'medium' | 'hard';
      points: number;
      explanation?: string;
      options?: Array<{ option_text: string; is_correct: boolean }>;
    }>> {
        await this.assertCourseManagerOrAdmin(userId);
        await this.getOwnedBankOrThrow(bankId, userId);

        const topic = String(payload.topic || '').trim();
        if (!topic) throw new Error('Vui lòng nhập chủ đề để AI tạo câu hỏi.');

        const questionCount = Math.max(1, Math.min(20, Number(payload.question_count) || 5));
        const difficulty = payload.difficulty === 'easy' || payload.difficulty === 'hard' ? payload.difficulty : 'medium';
        const questionType = payload.question_type || 'multiple_choice';
        console.log(`[AI Question Gen] 🔍 questionType nhận được: "${questionType}"`);

        const settingRepo = this.dataSource.getRepository(OpenRouterSetting);
        const keyRepo = this.dataSource.getRepository(OpenRouterKey);
        const settings = await settingRepo.findOne({ where: {} });
        const model =
          String(settings?.default_model || '').trim() ||
          (Array.isArray(settings?.models) && settings?.models.length ? String(settings.models[0]) : '') ||
          'openai/gpt-4o-mini';

        const now = new Date();
        const keys = await keyRepo.find({
          where: { is_active: true } as any,
          order: { last_used_at: 'ASC', id: 'ASC' } as any,
        });
        const picked = keys.find((k) => !k.cooldown_until || new Date(k.cooldown_until) <= now);
        if (!picked) {
          throw new Error('Không có OpenRouter key khả dụng. Hãy kiểm tra tab Admin > Keys.');
        }

        const apiKey = this.decryptOpenRouterKey(String((picked as any).key_encrypted || ''));
        if (!apiKey) throw new Error('Không thể giải mã OpenRouter key.');

        const systemPrompt =
          'Bạn là trợ lý tạo câu hỏi cho LMS. Trả về DUY NHẤT 1 JSON object hợp lệ. Không markdown, không code block, không giải thích, không chữ nào khác ngoài JSON. Bắt buộc dùng cú pháp JSON chuẩn: `"key": value` (không được viết `"key:"value"`).';

        const getPromptForType = (type: string): string => {
          if (type === 'short_answer') {
            return [
              '{ "questions": [{ "question_type":"short_answer", "question_text": string, "difficulty":"easy|medium|hard", "points": number, "explanation": string, "max_length": number|null, "grading_notes": string|null }] }',
              '- Câu hỏi ngắn yêu cầu học viên trả lời ngắn gọn (1-2 câu).',
              '- explanation là đáp án mẫu hoặc từ khóa cần có trong câu trả lời.',
              '- max_length là giới hạn ký tự (VD: 200), null nếu không giới hạn.',
              '- grading_notes là hướng dẫn chấm điểm cho giáo viên.',
              '- KHÔNG cần options cho short_answer.',
            ].join('\n');
          }
          if (type === 'true_false') {
            return [
              '{ "questions": [{ "question_type":"true_false", "question_text": string, "difficulty":"easy|medium|hard", "points": number, "explanation": string|null, "options":[{"option_text":"Đúng","is_correct":boolean},{"option_text":"Sai","is_correct":boolean}] }] }',
              '- Câu hỏi đúng/sai với 2 lựa chọn cố định: "Đúng" và "Sai".',
            ].join('\n');
          }
          // multiple_choice or mixed -> generate multiple choice
          return [
            '{ "questions": [{ "question_type":"multiple_choice", "question_text": string, "difficulty":"easy|medium|hard", "points": number, "explanation": string|null, "options":[{"option_text":string,"is_correct":boolean}] }] }',
            '- Mỗi câu phải có ít nhất 2 lựa chọn.',
            '- Mỗi câu phải có ít nhất 1 đáp án đúng.',
          ].join('\n');
        };

        const userPrompt = [
          'Hãy tạo JSON object theo format:',
          getPromptForType(questionType),
          `Số câu: ${questionCount}`,
          `Chủ đề: ${topic}`,
          `Độ khó ưu tiên: ${difficulty}`,
          `Loại câu: ${questionType}`,
          '- Trả nội dung tiếng Việt.',
          payload.extra_instructions ? `Yêu cầu bổ sung: ${payload.extra_instructions}` : '',
          payload.attachment_text
            ? `Nội dung tham chiếu từ file "${String(payload.attachment_name || 'attachment')}":\n${String(payload.attachment_text).slice(0, 12000)}`
            : '',
        ].filter(Boolean).join('\n');

        console.log(`[AI Question Gen] 📋 User prompt:\n${userPrompt}`);

        console.log(`[OpenRouter] 📋 Chọn key: KeyID=${picked.id}, KeyHash=${String((picked as any).key_encrypted || '').slice(-8)}...`);
        console.log(`[OpenRouter] 🤖 Model: ${model}, Temperature: 0.6`);
        console.log(`[OpenRouter] 📝 Prompt length: ${userPrompt.length} chars`);

        try {
          console.log(`[OpenRouter] 🚀 Gọi API OpenRouter...`);
          const startTime = Date.now();
          const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model,
              response_format: { type: 'json_object' },
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
              ],
              temperature: 0.6,
            }),
          });
          const elapsedMs = Date.now() - startTime;
          console.log(`[OpenRouter] ⏱️  Response time: ${elapsedMs}ms, Status: ${response.status}`);

          if (!response.ok) {
            const raw = await response.text();
            console.error(`[OpenRouter] ❌ HTTP Error ${response.status}: ${raw?.slice(0, 200)}`);
            throw new Error(`OpenRouter lỗi HTTP ${response.status}: ${raw?.slice(0, 180) || 'Unknown error'}`);
          }

          const data: any = await response.json();
          const content = data?.choices?.[0]?.message?.content;
          if (!content) throw new Error('OpenRouter không trả về nội dung.');
          console.log(`[OpenRouter] ✅ Nhận được response từ model: ${data?.model || model}`);

          const repairJsonLikeText = (input: string): string => {
            let t = String(input || '');
            t = t.replace(/"(\w+)":?\[/g, (_m, key) => `"${key}":[`);
            t = t.replace(/"(\w+):\[/g, (_m, key) => `"${key}":[`);

            t = t.replace(/"(\w+):"([^"]*)"/g, (_m, k, v) => `"${k}":"${v}"`);
            t = t.replace(/"(\w+):(true|false|null|\d+(?:\.\d+)?)"/g, (_m, k, v) => `"${k}":${v}`);
            return t;
          };

          const tryParseJsonObject = (rawText: string): any | null => {
            let t = String(rawText || '').trim();
            t = t.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
            t = repairJsonLikeText(t);
            try {
              return JSON.parse(t);
            } catch {
              // continue
            }
            const first = t.indexOf('{');
            const last = t.lastIndexOf('}');
            if (first !== -1 && last !== -1 && last > first) {
              const sub = t.slice(first, last + 1);
              try {
                return JSON.parse(sub);
              } catch {
                return null;
              }
            }
            return null;
          };

          const parsed = tryParseJsonObject(String(content));
          if (!parsed) {
            throw new Error(`AI trả về dữ liệu không đúng JSON. Raw=${String(content).slice(0, 400)}`);
          }

          const rawQuestions = Array.isArray(parsed?.questions) ? parsed.questions : [];
          if (!rawQuestions.length) throw new Error('AI không tạo được câu hỏi hợp lệ.');

          const normalized = rawQuestions.slice(0, questionCount).map((item: any, index: number) => {
            // Use questionType from user selection - AI must follow prompt
            const type: 'multiple_choice' | 'true_false' | 'short_answer' = 
              questionType === 'true_false' ? 'true_false' :
              questionType === 'short_answer' ? 'short_answer' :
              'multiple_choice';
            const text = String(item?.question_text || '').trim();
            if (!text) throw new Error(`AI trả câu ${index + 1} bị trống nội dung.`);
            const diffRaw = String(item?.difficulty || '').toLowerCase();
            const diff = diffRaw === 'easy' || diffRaw === 'hard' ? diffRaw : 'medium';
            const points = Number(item?.points);
            const explanation = item?.explanation != null ? String(item.explanation) : undefined;
            const maxLength = item?.max_length != null ? Number(item.max_length) : undefined;
            const gradingNotes = item?.grading_notes != null ? String(item.grading_notes) : undefined;

            // short_answer không cần options
            if (type === 'short_answer') {
              this.validateQuestionBusinessRule(type, undefined);
              return {
                question_type: type,
                question_text: text,
                difficulty: diff as 'easy' | 'medium' | 'hard',
                points: Number.isFinite(points) && points > 0 ? points : 1,
                explanation,
                options: undefined,
                max_length: maxLength,
                grading_notes: gradingNotes,
              };
            }

            // multiple_choice và true_false cần options
            let options = Array.isArray(item?.options) ? item.options : [];
            options = options
              .map((opt: any) => ({
                option_text: String(opt?.option_text || '').trim(),
                is_correct: Boolean(opt?.is_correct),
              }))
              .filter((opt: any) => opt.option_text);
            if (type === 'true_false' && options.length < 2) {
              options = [
                { option_text: 'Đúng', is_correct: true },
                { option_text: 'Sai', is_correct: false },
              ];
            }
            this.validateQuestionBusinessRule(type, options as any);
            return {
              question_type: type,
              question_text: text,
              difficulty: diff as 'easy' | 'medium' | 'hard',
              points: Number.isFinite(points) && points > 0 ? points : 1,
              explanation,
              options,
            };
          });

          (picked as any).last_used_at = new Date();
          await keyRepo.save(picked as any);
          return normalized;
        } catch (error: any) {
          (picked as any).last_error_at = new Date();
          (picked as any).error_count = Number((picked as any).error_count || 0) + 1;
          await keyRepo.save(picked as any);
          throw new Error(String(error?.message || error));
        }
    }
}