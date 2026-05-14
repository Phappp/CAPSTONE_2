import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsArray,
  IsNumber,
  ValidateNested,
  IsIn,
  Min,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { RequestDto } from '../../../shared/request-dto';

// dto cho api tạo ngân hàng
export class CreateQuestionBankBody extends RequestDto {
    @IsInt()
    course_id: number;

    @IsString()
    @IsNotEmpty()
    name: string;

    @IsOptional()
    @IsString()
    description: string;

    @IsOptional()
    @IsBoolean()
    is_shared?: boolean;

    user_id: number;

    constructor(body: any, userId: number) {
        super();
        this.course_id = Number(body?.course_id);
        this.name = String(body?.name ?? '');
        this.description = body?.description != null ? String(body.description) : '';
        this.is_shared = Boolean(body?.is_shared);
        this.user_id = userId;
    }
}

// dto cho api tạo câu hỏi
export class BankQuestionOptionDto{
    @IsString()
    @IsNotEmpty()
    option_text: string;

    @IsBoolean()
    is_correct: boolean;

    @IsOptional()
    @IsString()
    explanation?: string;
}

export class AddBankQuestionBody extends RequestDto {
    @IsIn(['multiple_choice', 'true_false', 'short_answer', 'essay', 'fill_blank'])
    question_type: string;

    @IsString()
    @IsNotEmpty()
    question_text: string;

    @IsIn(['easy', 'medium', 'hard'])
    difficulty: string;

    @IsOptional()
    @IsString()
    category?: string;

    @IsOptional()
    @IsArray()
    @IsString({each: true})
    tags?: string[];

    @IsOptional()
    @IsNumber()
    @Min(0.25)
    points?: number;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => BankQuestionOptionDto)
    options?: BankQuestionOptionDto[];

    @IsOptional()
    @IsString()
    explanation?: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    max_length?: number;

    @IsOptional()
    @IsString()
    grading_notes?: string;

    bank_id: number;
    user_id: number;

    constructor(body: any, bankId: number, userId: number){
        super();
        this.question_text = String(body?.question_text ?? '');
        this.question_type = String(body?.question_type ?? '');
        this.difficulty = String(body?.difficulty ?? '');
        this.category = body?.category != null ? String(body.category) : undefined;
        this.tags = Array.isArray(body?.tags) ? body.tags.map((item: any) => String(item)) : undefined;
        this.points = body?.points != null ? Number(body.points) : undefined;
        this.options = Array.isArray(body?.options) ? body.options : undefined;
        this.explanation = body?.explanation != null ? String(body.explanation) : undefined;
        this.max_length = body?.max_length != null ? Number(body.max_length) : undefined;
        this.grading_notes = body?.grading_notes != null ? String(body.grading_notes) : undefined;
        this.bank_id = bankId;
        this.user_id = userId;
    }
}

export class UpdateQuestionBankBody extends RequestDto {
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    name?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsBoolean()
    is_shared?: boolean;

    @IsOptional()
    @IsBoolean()
    is_active?: boolean;

    constructor(body: any) {
      super();
      if (body?.name != null) this.name = String(body.name);
      if (body?.description != null) this.description = String(body.description);
      if (body?.is_shared != null) this.is_shared = Boolean(body.is_shared);
      if (body?.is_active != null) this.is_active = Boolean(body.is_active);
    }
}

export class UpdateBankQuestionBody extends RequestDto {
    @IsOptional()
    @IsIn(['multiple_choice', 'true_false', 'short_answer', 'essay', 'fill_blank'])
    question_type?: string;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    question_text?: string;

    @IsOptional()
    @IsIn(['easy', 'medium', 'hard'])
    difficulty?: string;

    @IsOptional()
    @IsString()
    category?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tags?: string[];

    @IsOptional()
    @IsNumber()
    @Min(0.25)
    points?: number;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => BankQuestionOptionDto)
    options?: BankQuestionOptionDto[];

    @IsOptional()
    @IsString()
    explanation?: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    max_length?: number;

    @IsOptional()
    @IsString()
    grading_notes?: string;

    constructor(body: any) {
      super();
      if (body?.question_type != null) this.question_type = String(body.question_type);
      if (body?.question_text != null) this.question_text = String(body.question_text);
      if (body?.difficulty != null) this.difficulty = String(body.difficulty);
      if (body?.category != null) this.category = String(body.category);
      if (Array.isArray(body?.tags)) this.tags = body.tags.map((item: any) => String(item));
      if (body?.points != null) this.points = Number(body.points);
      if (Array.isArray(body?.options)) this.options = body.options;
      if (body?.explanation != null) this.explanation = String(body.explanation);
      if (body?.max_length != null) this.max_length = Number(body.max_length);
      if (body?.grading_notes != null) this.grading_notes = String(body.grading_notes);
    }
}

export class GenerateBankQuestionsAiBody extends RequestDto {
    @IsString()
    @IsNotEmpty()
    topic: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    question_count?: number;

    @IsOptional()
    @IsIn(['easy', 'medium', 'hard'])
    difficulty?: 'easy' | 'medium' | 'hard';

    @IsOptional()
    @IsIn(['multiple_choice', 'true_false', 'short_answer', 'mixed'])
    question_type?: 'multiple_choice' | 'true_false' | 'short_answer' | 'mixed';

    @IsOptional()
    @IsString()
    extra_instructions?: string;

    @IsOptional()
    @IsString()
    attachment_name?: string;

    @IsOptional()
    @IsString()
    attachment_text?: string;

    constructor(body: any) {
      super();
      this.topic = String(body?.topic ?? '').trim();
      if (body?.question_count != null) {
        this.question_count = Math.max(1, Math.min(20, Number(body.question_count) || 1));
      }
      if (body?.difficulty != null) {
        const d = String(body.difficulty).toLowerCase();
        this.difficulty = d === 'easy' || d === 'hard' ? d : 'medium';
      }
      if (body?.question_type != null) {
        const t = String(body.question_type).toLowerCase();
        if (t === 'true_false') {
          this.question_type = 'true_false';
        } else if (t === 'mixed') {
          this.question_type = 'mixed';
        } else if (t === 'short_answer') {
          this.question_type = 'short_answer';
        } else {
          this.question_type = 'multiple_choice';
        }
      }
      if (body?.extra_instructions != null) this.extra_instructions = String(body.extra_instructions);
      if (body?.attachment_name != null) this.attachment_name = String(body.attachment_name);
      if (body?.attachment_text != null) this.attachment_text = String(body.attachment_text);
    }
}