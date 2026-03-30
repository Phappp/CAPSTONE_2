import { IsString, IsOptional, IsBoolean, IsInt, IsEnum, IsArray, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { RequestDto } from '../../../shared/request-dto';

// dto cho api tạo ngân hàng
export class CreateQuestionBankBody extends RequestDto {
    @IsOptional()
    @IsInt()
    course_id?: number;

    @IsString()
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
        this.course_id = body.course_id;
        this.name = body.name;
        this.description = body.description;
        this.is_shared = body.is_shared;
        this.user_id = userId;
    }
}

// dto cho api tạo câu hỏi
export class BankQuestionOptionDto{
    @IsString()
    option_text: string;

    @IsBoolean()
    is_correct: boolean;

    @IsOptional()
    @IsString()
    explanation?: string;
}

export class AddBankQuestionBody extends RequestDto {
    @IsEnum(['multiple_choice', 'true_false', 'short_answer', 'essay', 'fill_blank'])
    question_type: string;

    @IsString()
    question_text: string;

    @IsEnum(['easy', 'medium', 'hard'])
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
    points?: number;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => BankQuestionOptionDto)
    options?: BankQuestionOptionDto[];

    @IsOptional()
    @IsString()
    explanation?: string;

    bank_id: number;
    user_id: number;

    constructor(body: any, bankId: number, userId: number){
        super();
        this.question_text = body.question_text;
        this.question_type = body.question_type;
        this.difficulty = body.difficulty;
        this.category = body.category;
        this.tags = body.tags;
        this.points = body.points;
        this.options = body.options;
        this.explanation = body.explanation;
        this.bank_id = bankId;
        this.user_id = userId;
    }
}