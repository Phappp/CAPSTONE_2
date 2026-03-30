import { DataSource } from 'typeorm';
import AppDataSource from '../../../../../lib/database';
import QuestionBank from '../../../../../internal/model/question_banks';
import BankQuestion from '../../../../../internal/model/bank_questions';
import BankQuestionOption from '../../../../../internal/model/bank_question_options';
import { CreateQuestionBankBody, AddBankQuestionBody } from '../adapter/dto';
import { QuestionBankService } from '../types';

export class QuestionBankServiceImpl implements QuestionBankService {
    private dataSource: DataSource;

    constructor(){
        this.dataSource = AppDataSource;
    }

    async createBank(req: CreateQuestionBankBody): Promise<any>{
        const bankRepo = this.dataSource.getRepository(QuestionBank);

        const newBank = bankRepo.create({
            course_id: req.course_id,
            name: req.name,
            description: req.description,
            is_shared: req.is_shared || false,
            created_by: req.user_id
        });

        const savedBank = await bankRepo.save(newBank);
        return savedBank;
    }

    async addQuestion(req: AddBankQuestionBody): Promise<any>{
        const questionRepo = this.dataSource.getRepository(BankQuestion);
        const bankRepo = this.dataSource.getRepository(QuestionBank);

        // check bank đã tồn tại chưa
        const bank = await bankRepo.findOne({ where: { id: req.bank_id } });
        if(!bank){
            throw new Error('Question bank not found!');
        }

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
            options: mappedOptions
        });

        const savedQuestion = await questionRepo.save(newQuestion);

        return {
            question_id: savedQuestion.id,
            bank_id: savedQuestion.bank_id,
            question_text: savedQuestion.question_text,
            created_at: savedQuestion.created_at
        };
    }
}