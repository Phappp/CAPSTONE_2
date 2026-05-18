export interface GenerateShortAnswerPayload {
  topic: string;
  question_count?: number;
  extra_instructions?: string;
}

export interface GeneratedQuestion {
  question_text: string;
  difficulty?: string;
  points?: number;
}

export interface GenerateShortAnswerResult {
  questions: GeneratedQuestion[];
  model: string;
  usedKeyId: number;
}

export interface AiShortAnswerService {
  generateShortAnswerQuestions(payload: GenerateShortAnswerPayload): Promise<GenerateShortAnswerResult>;
}
