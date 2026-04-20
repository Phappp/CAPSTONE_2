export const QUESTION_BANKS_API_BASE = "/api/v1/question-banks";

export const QUESTION_BANKS_API = {
  list: QUESTION_BANKS_API_BASE,
  create: QUESTION_BANKS_API_BASE,
  updateBank: (bankId: number | string) => `${QUESTION_BANKS_API_BASE}/${bankId}`,
  deleteBank: (bankId: number | string) => `${QUESTION_BANKS_API_BASE}/${bankId}`,
  listQuestions: (bankId: number | string) => `${QUESTION_BANKS_API_BASE}/${bankId}/questions`,
  addQuestion: (bankId: number | string) => `${QUESTION_BANKS_API_BASE}/${bankId}/questions`,
  addQuestionsBatch: (bankId: number | string) => `${QUESTION_BANKS_API_BASE}/${bankId}/questions/batch`,
  generateQuestionsAi: (bankId: number | string) => `${QUESTION_BANKS_API_BASE}/${bankId}/questions/ai-generate`,
  updateQuestion: (bankId: number | string, questionId: number | string) =>
    `${QUESTION_BANKS_API_BASE}/${bankId}/questions/${questionId}`,
  deleteQuestion: (bankId: number | string, questionId: number | string) =>
    `${QUESTION_BANKS_API_BASE}/${bankId}/questions/${questionId}`,
} as const;
