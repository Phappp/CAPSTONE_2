import { Expose, Type } from 'class-transformer';
import { IsString, IsNumber, IsBoolean, IsArray, IsOptional, ValidateNested, Min, Max } from 'class-validator';
import { QuestionInput } from '../types';

class QuestionOptionDTO {
  @Expose()
  @IsString()
  option_text: string;

  @Expose()
  @IsBoolean()
  is_correct: boolean;

  @Expose()
  @IsNumber()
  order_index: number;

  @Expose()
  @IsOptional()
  @IsString()
  explanation?: string;
}

class QuestionDTO {
  @Expose()
  @IsString()
  question_type: 'multiple_choice' | 'true_false';

  @Expose()
  @IsString()
  question_text: string;

  @Expose()
  @IsNumber()
  @Min(1)
  points: number;

  @Expose()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionOptionDTO)
  options: QuestionOptionDTO[];

  @Expose()
  @IsOptional()
  @IsString()
  explanation?: string;
}

export class CreateQuizBody {
  @Expose()
  @IsString()
  title: string;

  @Expose()
  @IsOptional()
  @IsString()
  description?: string;

  @Expose()
  @IsNumber()
  @Min(1)
  time_limit_minutes: number;

  @Expose()
  @IsNumber()
  @Min(0)
  max_attempts: number;

  @Expose()
  @IsNumber()
  @Min(0)
  passing_score: number;

  @Expose()
  @IsString()
  passing_score_type: 'points' | 'percentage';

  @Expose()
  @IsBoolean()
  show_results_immediately: boolean;

  @Expose()
  @IsBoolean()
  show_correct_answers: boolean;

  @Expose()
  @IsBoolean()
  shuffle_questions: boolean;

  @Expose()
  @IsBoolean()
  shuffle_options: boolean;

  @Expose()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionDTO)
  questions: QuestionDTO[];

  @Expose()
  @IsOptional()
  @IsBoolean()
  allow_review?: boolean;

  constructor(data: any) {
    Object.assign(this, data);
  }

  async validate() {
    // Validate logic here if needed
    return { ok: true };
  }
}
