import { CreateQuestionBankBody, AddBankQuestionBody } from './adapter/dto';

export type QuestionBankUsageItem = {
    quiz_id: number;
    lesson_id: number | null;
    lesson_title: string | null;
    quiz_title: string | null;
    question_count: number;
};

export interface QuestionBankService {
    createBank(req: CreateQuestionBankBody) : Promise<any>;
    addQuestion(req: AddBankQuestionBody) : Promise<any>;
    addQuestionsBatch(reqs: AddBankQuestionBody[]): Promise<any[]>;
    listBanks(userId: number, courseId?: number, includeArchived?: boolean): Promise<any[]>;
    getBankUsage(bankId: number, userId: number): Promise<{
      quiz_count: number;
      usages: QuestionBankUsageItem[];
    }>;
    getBankQuestions(bankId: number, userId: number): Promise<any[]>;
    updateBank(
      bankId: number,
      userId: number,
      payload: { name?: string; description?: string; is_shared?: boolean; is_active?: boolean }
    ): Promise<any>;
    deleteBank(bankId: number, userId: number): Promise<void>;
    updateQuestion(
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
      }
    ): Promise<any>;
    deleteQuestion(bankId: number, questionId: number, userId: number): Promise<void>;
    generateQuestionsWithAi(
      bankId: number,
      userId: number,
      payload: {
        topic: string;
        question_count?: number;
        difficulty?: 'easy' | 'medium' | 'hard';
        question_type?: 'multiple_choice' | 'true_false' | 'mixed';
        extra_instructions?: string;
        attachment_name?: string;
        attachment_text?: string;
      }
    ): Promise<Array<{
      question_type: 'multiple_choice' | 'true_false';
      question_text: string;
      difficulty: 'easy' | 'medium' | 'hard';
      points: number;
      explanation?: string;
      options: Array<{ option_text: string; is_correct: boolean }>;
    }>>;
}