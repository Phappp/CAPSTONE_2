import { CreateQuestionBankBody, AddBankQuestionBody } from './adapter/dto';

export interface QuestionBankService {
    createBank(req: CreateQuestionBankBody) : Promise<any>;
    addQuestion(req: AddBankQuestionBody) : Promise<any>;
}