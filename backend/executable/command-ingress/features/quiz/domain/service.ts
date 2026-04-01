import AppDataSource from '../../../../../lib/database';
import Quiz from '../../../../../internal/model/quizze';
import QuestionBank from '../../../../../internal/model/question_banks';
import BankQuestion from '../../../../../internal/model/bank_questions';
import QuizQuestion from '../../../../../internal/model/quiz_question';
import QuestionOption from '../../../../../internal/model/question_option';
import QuizAttempt from '../../../../../internal/model/quiz_attempt';
import QuizResponse from '../../../../../internal/model/quiz_response';
import QuizResponseOption from '../../../../../internal/model/quiz_response_options';
import QuizResponseText from '../../../../../internal/model/quiz_response_text';
import GradeItem from '../../../../../internal/model/grade_items';
import Grade from '../../../../../internal/model/grade';
import Lesson from '../../../../../internal/model/lesson';
import Module from '../../../../../internal/model/modules';
import Course from '../../../../../internal/model/course';
import {
  CreateQuizRequest,
  CreateQuizResponse,
  QuizService,
  QuestionInput,
  GetQuizResponse,
  QuizQuestionDetail,
  QuizQuestionOption,
  CreateQuizAttemptResponse,
  QuizResponseInput,
  QuizAttemptSubmitResult,
  QuizAutoGradeResult,
  QuizAutoGradeQuestionSummary,
} from '../types';

export class QuizServiceImpl implements QuizService {
  async createQuiz(
    instructorId: number,
    lessonId: number,
    request: CreateQuizRequest
  ): Promise<CreateQuizResponse> {
    const quizRepo = AppDataSource.getRepository(Quiz);
    const lessonRepo = AppDataSource.getRepository(Lesson);
    const moduleRepo = AppDataSource.getRepository(Module);
    const courseRepo = AppDataSource.getRepository(Course);
    const bankRepo = AppDataSource.getRepository(QuestionBank);
    const bankQuestionRepo = AppDataSource.getRepository(BankQuestion);
    const quizQuestionRepo = AppDataSource.getRepository(QuizQuestion);
    const questionOptionRepo = AppDataSource.getRepository(QuestionOption);
    const gradeItemRepo = AppDataSource.getRepository(GradeItem);

    // Validate lesson exists
    const lesson = await lessonRepo.findOne({ where: { id: lessonId } });
    if (!lesson) {
      throw new Error(`Lesson ${lessonId} not found`);
    }

    // Get module to find course_id
    const module = await moduleRepo.findOne({ where: { id: lesson.module_id } });
    if (!module) {
      throw new Error(`Module not found`);
    }

    const courseId = module.course_id;

    // Get course info
    const course = await courseRepo.findOne({ where: { id: courseId } });
    if (!course) {
      throw new Error(`Course not found`);
    }

    // Create quiz
    const quiz = quizRepo.create({
      lesson_id: lessonId,
      title: request.title,
      description: request.description || null,
      time_limit_minutes: request.time_limit_minutes || null,
      passing_score: request.passing_score || null,
      max_attempts: request.max_attempts || 1,
      shuffle_questions: request.shuffle_questions || false,
      shuffle_options: request.shuffle_options || false,
      show_results_immediately: request.show_results_immediately !== false,
      show_correct_answers: request.show_correct_answers !== false,
    });

    const savedQuiz = await quizRepo.save(quiz);

    // Create question bank for this quiz
    const bank = bankRepo.create({
      course_id: courseId,
      name: `${request.title} - Question Bank`,
      description: `Auto-generated question bank for quiz: ${request.title}`,
      created_by: instructorId,
      is_shared: false,
    });

    const savedBank = await bankRepo.save(bank);

    // Create bank questions and map to quiz
    let totalPoints = 0;

    for (let i = 0; i < request.questions.length; i++) {
      const questionInput = request.questions[i];

      // Create bank question
      const bankQuestion = bankQuestionRepo.create({
        bank_id: savedBank.id,
        question_type: questionInput.question_type,
        question_text: questionInput.question_text,
        explanation: questionInput.explanation || null,
        difficulty: 'medium',
        category: null,
        tags: [],
        points: questionInput.points,
        created_by: instructorId,
        is_ai_generated: false,
      });

      const savedBankQuestion = await bankQuestionRepo.save(bankQuestion);

      // Create quiz question (mapping)
      const quizQuestion = quizQuestionRepo.create({
        quiz_id: savedQuiz.id,
        bank_question_id: savedBankQuestion.id,
        order_index: i + 1,
        points: questionInput.points,
      });

      const savedQuizQuestion = await quizQuestionRepo.save(quizQuestion);

      // Create question options
      for (let j = 0; j < questionInput.options.length; j++) {
        const optionInput = questionInput.options[j];

        const questionOption = questionOptionRepo.create({
          quiz_question_id: savedQuizQuestion.id,
          option_text: optionInput.option_text,
          is_correct: optionInput.is_correct,
          order_index: optionInput.order_index,
          explanation: optionInput.explanation || null,
        });

        await questionOptionRepo.save(questionOption);
      }

      totalPoints += questionInput.points;
    }

    // Create grade item for this quiz
    const gradeItem = gradeItemRepo.create({
      course_id: courseId,
      item_type: 'quiz',
      item_id: savedQuiz.id,
      name: request.title,
      max_score: totalPoints,
      weight: 1.0,
      due_date: null,
    });

    await gradeItemRepo.save(gradeItem);

    return {
      quiz_id: savedQuiz.id,
      lesson_id: lessonId,
      title: request.title,
      questions_count: request.questions.length,
      total_points: totalPoints,
      created_at: savedQuiz.created_at,
    };
  }

  private async buildQuizResponse(quiz: Quiz, userId: number): Promise<GetQuizResponse> {
    const quizQuestionRepo = AppDataSource.getRepository(QuizQuestion);
    const questionOptionRepo = AppDataSource.getRepository(QuestionOption);
    const inProgressAttempts = await AppDataSource.getRepository(QuizAttempt).find({
      where: { quiz_id: quiz.id, user_id: userId },
    });

    const questions = await quizQuestionRepo.find({ where: { quiz_id: quiz.id }, order: { order_index: 'ASC' as any } });

    const questionDetails: QuizQuestionDetail[] = [];

    for (const q of questions as any[]) {
      const bankQuestion = await AppDataSource.getRepository(BankQuestion).findOne({ where: { id: q.bank_question_id } as any });
      if (!bankQuestion) continue;
      const opts = await questionOptionRepo.find({ where: { quiz_question_id: q.id }, order: { order_index: 'ASC' as any } });
      questionDetails.push({
        id: q.id,
        question_text: bankQuestion.question_text,
        question_type: bankQuestion.question_type as any,
        points: Number(q.points ?? 0),
        options: (opts as any[]).map((o) => ({
          id: o.id,
          option_text: o.option_text,
          order_index: o.order_index,
        })),
      });
    }

    const attemptsDone = inProgressAttempts.length;
    const remaining = Math.max(0, Number(quiz.max_attempts || 0) - attemptsDone);

    const totalPoints = questionDetails.reduce((sum, q) => sum + Number(q.points), 0);

    return {
      quiz_id: quiz.id,
      lesson_id: quiz.lesson_id,
      title: quiz.title,
      description: quiz.description || null,
      time_limit_minutes: quiz.time_limit_minutes,
      max_attempts: Number(quiz.max_attempts ?? 1),
      passing_score: Number(quiz.passing_score ?? 0),
      show_results_immediately: Boolean(quiz.show_results_immediately),
      show_correct_answers: Boolean(quiz.show_correct_answers),
      questions_count: questionDetails.length,
      total_points: totalPoints,
      attempts_done: attemptsDone,
      attempts_remaining: remaining,
      questions: questionDetails,
    };
  }

  async getQuizByLesson(lessonId: number, userId: number): Promise<GetQuizResponse> {
    const quizRepo = AppDataSource.getRepository(Quiz);
    const quiz = await quizRepo.findOne({ where: { lesson_id: lessonId } as any });
    if (!quiz) throw new Error('Không tìm thấy bài kiểm tra cho bài học này.');
    return this.buildQuizResponse(quiz as any, userId);
  }

  async getQuizById(quizId: number, userId: number): Promise<GetQuizResponse> {
    const quizRepo = AppDataSource.getRepository(Quiz);
    const quiz = await quizRepo.findOne({ where: { id: quizId } as any });
    if (!quiz) throw new Error('Không tìm thấy quiz.');
    return this.buildQuizResponse(quiz as any, userId);
  }

  async getLatestInProgressAttempt(quizId: number, userId: number): Promise<CreateQuizAttemptResponse | null> {
    const attemptRepo = AppDataSource.getRepository(QuizAttempt);
    const attempt = await attemptRepo.findOne({
      where: { quiz_id: quizId, user_id: userId, status: 'in_progress' as any },
      order: { started_at: 'DESC' as any },
    });
    if (!attempt) return null;
    return {
      attempt_id: attempt.id,
      quiz_id: attempt.quiz_id,
      started_at: attempt.started_at.toISOString(),
      time_limit_minutes: 0,
      attempt_number: attempt.attempt_number,
    };
  }

  async createQuizAttempt(quizId: number, userId: number): Promise<CreateQuizAttemptResponse> {
    const quizRepo = AppDataSource.getRepository(Quiz);
    const attemptRepo = AppDataSource.getRepository(QuizAttempt);

    const quiz = await quizRepo.findOne({ where: { id: quizId } as any });
    if (!quiz) throw new Error('Quiz không tồn tại.');

    const existingAttempts = await attemptRepo.find({ where: { quiz_id: quizId, user_id: userId } });
    const doneCount = existingAttempts.length;

    if (quiz.max_attempts > 0 && doneCount >= Number(quiz.max_attempts || 0)) {
      throw new Error('Đã đạt tối đa số lần làm bài.');
    }

    const attemptNumber = doneCount + 1;
    const attempt = attemptRepo.create({
      quiz_id: quizId,
      user_id: userId,
      attempt_number: attemptNumber,
      status: 'in_progress',
    } as any);

    const savedAttempt = await attemptRepo.save(attempt as any);

    return {
      attempt_id: savedAttempt.id,
      quiz_id: savedAttempt.quiz_id,
      started_at: savedAttempt.started_at.toISOString(),
      time_limit_minutes: Number(quiz.time_limit_minutes || 0),
      attempt_number: attemptNumber,
    };
  }

  async getAttemptResponses(attemptId: number, userId: number): Promise<QuizResponseInput[]> {
    const attemptRepo = AppDataSource.getRepository(QuizAttempt);
    const responseRepo = AppDataSource.getRepository(QuizResponse);
    const optionRepo = AppDataSource.getRepository(QuizResponseOption);
    const textRepo = AppDataSource.getRepository(QuizResponseText);

    const attempt = await attemptRepo.findOne({ where: { id: attemptId, user_id: userId } as any });
    if (!attempt) throw new Error('Attempt không hợp lệ.');

    const responses = await responseRepo.find({ where: { attempt_id: attemptId } });
    const result: QuizResponseInput[] = [];

    for (const r of responses as any[]) {
      const options = await optionRepo.find({ where: { response_id: r.id } });
      const text = await textRepo.findOne({ where: { response_id: r.id } as any });

      result.push({
        quiz_question_id: r.quiz_question_id,
        selected_options: options.map((o) => o.option_id),
        text_answer: text?.answer_text ?? null,
      });
    }

    return result;
  }

  private normalizeTextAnswer(answer: string): string {
    return answer
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ');
  }

  async saveAttemptResponses(
    attemptId: number,
    userId: number,
    responses: QuizResponseInput[]
  ): Promise<void> {
    const attemptRepo = AppDataSource.getRepository(QuizAttempt);
    const responseRepo = AppDataSource.getRepository(QuizResponse);
    const optionsRepo = AppDataSource.getRepository(QuizResponseOption);
    const textRepo = AppDataSource.getRepository(QuizResponseText);
    const questionRepo = AppDataSource.getRepository(QuizQuestion);
    const questionOptionRepo = AppDataSource.getRepository(QuestionOption);
    const bankQuestionRepo = AppDataSource.getRepository(BankQuestion);

    const attempt = await attemptRepo.findOne({ where: { id: attemptId, user_id: userId } as any });
    if (!attempt) throw new Error('Attempt không hợp lệ.');
    if (attempt.status !== 'in_progress') throw new Error('Attempt đã được nộp hoặc không còn hiệu lực.');

    for (const res of responses) {
      const q = await questionRepo.findOne({ where: { id: res.quiz_question_id, quiz_id: attempt.quiz_id } as any });
      if (!q) continue;

      const bankQuestion = await bankQuestionRepo.findOne({ where: { id: q.bank_question_id } as any });
      const questionType = bankQuestion?.question_type || '';
      const correctOptions = await questionOptionRepo.find({ where: { quiz_question_id: q.id, is_correct: true } });

      let scored = false;
      let pointsEarned: number | null = null;
      let isCorrect: boolean | null = null;

      if (questionType === 'multiple_choice') {
        const selectedIds = new Set(Array.isArray(res.selected_options) ? res.selected_options : []);
        const correctIds = new Set(correctOptions.map((o) => o.id));
        const match = correctIds.size === selectedIds.size && [...correctIds].every((id) => selectedIds.has(id));
        isCorrect = match;
        pointsEarned = match ? Number(q.points || 0) : 0;
        scored = true;
      } else if (questionType === 'true_false') {
        const selected = Array.isArray(res.selected_options) && res.selected_options.length > 0 ? res.selected_options[0] : null;
        const correct = correctOptions[0];
        const match = !!(selected !== null && correct && selected === correct.id);
        isCorrect = match;
        pointsEarned = match ? Number(q.points || 0) : 0;
        scored = true;
      } else if (questionType === 'fill_blank' || questionType === 'short_answer') {
        const studentText = (res.text_answer || '').toString().trim();
        if (!studentText) {
          isCorrect = false;
          pointsEarned = 0;
        } else {
          const normalizedStudent = this.normalizeTextAnswer(studentText);
          const normalizedExam = correctOptions
            .map((c) => this.normalizeTextAnswer(c.option_text || ''))
            .filter(Boolean);
          const match = normalizedExam.some((answer) => answer === normalizedStudent);
          isCorrect = match;
          pointsEarned = match ? Number(q.points || 0) : 0;
        }
        scored = true;
      } else if (questionType === 'essay') {
        isCorrect = null;
        pointsEarned = null;
        scored = true;
      }

      if (!scored) {
        isCorrect = null;
        pointsEarned = null;
      }

      let quizResp = await responseRepo.findOne({ where: { attempt_id: attemptId, quiz_question_id: res.quiz_question_id } as any });
      if (!quizResp) {
        quizResp = responseRepo.create({
          attempt_id: attemptId,
          quiz_question_id: res.quiz_question_id,
          is_correct: isCorrect,
          points_earned: pointsEarned,
        } as any) as any;
      } else {
        quizResp.is_correct = isCorrect;
        quizResp.points_earned = pointsEarned;
      }
      await responseRepo.save(quizResp as any);

      await optionsRepo.delete({ response_id: quizResp.id } as any);
      if (Array.isArray(res.selected_options)) {
        for (const optionId of res.selected_options) {
          const opt = optionsRepo.create({ response_id: quizResp.id, option_id: optionId } as any);
          await optionsRepo.save(opt as any);
        }
      }

      if (res.text_answer !== undefined) {
        const existingText = await textRepo.findOne({ where: { response_id: quizResp.id } as any });
        if (existingText) {
          existingText.answer_text = res.text_answer;
          await textRepo.save(existingText as any);
        } else {
          const textItem = textRepo.create({ response_id: quizResp.id, answer_text: res.text_answer || '' } as any);
          await textRepo.save(textItem as any);
        }
      }
    }
  }

  async autoGradeAttempt(attemptId: number, userId: number): Promise<QuizAutoGradeResult> {
    const attemptRepo = AppDataSource.getRepository(QuizAttempt);
    const responseRepo = AppDataSource.getRepository(QuizResponse);
    const questionRepo = AppDataSource.getRepository(QuizQuestion);
    const bankQuestionRepo = AppDataSource.getRepository(BankQuestion);
    const optionRepo = AppDataSource.getRepository(QuestionOption);
    const attempt = await attemptRepo.findOne({ where: { id: attemptId } as any });
    if (!attempt) throw new Error('Attempt không hợp lệ.');

    const quizRepo = AppDataSource.getRepository(Quiz);
    const quiz = await quizRepo.findOne({ where: { id: attempt.quiz_id } as any });
    if (!quiz) throw new Error('Quiz không tồn tại.');

    const questions = await questionRepo.find({ where: { quiz_id: quiz.id } as any });

    const summary: QuizAutoGradeQuestionSummary[] = [];
    let totalPoints = 0;
    let scoredPoints = 0;

    for (const q of questions as any[]) {
      const bankQuestion = await bankQuestionRepo.findOne({ where: { id: q.bank_question_id } as any });
      const questionType = bankQuestion?.question_type || '';
      const questionPoints = Number(q.points || 0);
      totalPoints += questionPoints;

      const response = await responseRepo.findOne({ where: { attempt_id: attemptId, quiz_question_id: q.id } as any });
      const selectedOptions = response
        ? (await AppDataSource.getRepository(QuizResponseOption).find({ where: { response_id: response.id } })).map((o) => o.option_id)
        : [];
      const textResponse = response ? (await AppDataSource.getRepository(QuizResponseText).findOne({ where: { response_id: response.id } as any }))?.answer_text : null;

      const correctOptions = await optionRepo.find({ where: { quiz_question_id: q.id, is_correct: true } });

      let isCorrect: boolean | null = null;
      let pointsEarned: number | null = null;

      if (questionType === 'multiple_choice') {
        const selectedSet = new Set(selectedOptions);
        const correctSet = new Set(correctOptions.map((o) => o.id));
        const match = correctSet.size === selectedSet.size && [...correctSet].every((id) => selectedSet.has(id));
        isCorrect = match;
        pointsEarned = match ? questionPoints : 0;
      } else if (questionType === 'true_false') {
        const selected = selectedOptions.length > 0 ? selectedOptions[0] : null;
        const correct = correctOptions[0];
        const match = !!(selected !== null && correct && selected === correct.id);
        isCorrect = match;
        pointsEarned = match ? questionPoints : 0;
      } else if (questionType === 'fill_blank' || questionType === 'short_answer') {
        const studentText = (textResponse || '').toString().trim();
        if (!studentText) {
          isCorrect = false;
          pointsEarned = 0;
        } else {
          const normalized = this.normalizeTextAnswer(studentText);
          const accepted = correctOptions
            .map((c) => this.normalizeTextAnswer(c.option_text || ''))
            .filter(Boolean);
          const match = accepted.some((ans) => ans === normalized);
          isCorrect = match;
          pointsEarned = match ? questionPoints : 0;
        }
      } else if (questionType === 'essay') {
        isCorrect = null;
        pointsEarned = null;
      } else {
        // Unknown type: keep existing if present
        isCorrect = response?.is_correct ?? null;
        pointsEarned = response?.points_earned ?? null;
      }

      // update response rows
      let quizResp = response;
      if (!quizResp) {
        quizResp = responseRepo.create({
          attempt_id: attemptId,
          quiz_question_id: q.id,
          is_correct: isCorrect,
          points_earned: pointsEarned,
        } as any) as any;
      } else {
        quizResp.is_correct = isCorrect;
        quizResp.points_earned = pointsEarned;
      }
      await responseRepo.save(quizResp as any);

      if (pointsEarned != null) {
        scoredPoints += Number(pointsEarned);
      }

      summary.push({
        question_id: q.id,
        question_text: bankQuestion?.question_text || '',
        points_earned: pointsEarned,
        is_correct: isCorrect,
      });
    }

    const passed = quiz.passing_score != null ? Number(scoredPoints) >= Number(quiz.passing_score) : true;
    const percentage = totalPoints > 0 ? Number(((scoredPoints / totalPoints) * 100).toFixed(2)) : 0;

    attempt.score = Number(scoredPoints);
    attempt.is_passed = passed;
    attempt.status = 'graded';
    attempt.submitted_at = attempt.submitted_at || new Date() as any;
    attempt.time_spent_seconds = attempt.time_spent_seconds || 0;

    await attemptRepo.save(attempt as any);

    const gradeItemRepo = AppDataSource.getRepository(GradeItem);
    const gradeRepo = AppDataSource.getRepository(Grade);

    const gradeItem = await gradeItemRepo.findOne({ where: { item_type: 'quiz', item_id: quiz.id } as any });
    if (gradeItem) {
      let grade = await gradeRepo.findOne({ where: { grade_item_id: gradeItem.id, user_id: attempt.user_id } as any });
      if (grade) {
        grade.score = Number(scoredPoints);
        grade.graded_by = userId;
        grade.graded_at = new Date();
        await gradeRepo.save(grade as any);
      } else {
        const gradeNew = gradeRepo.create({
          grade_item_id: gradeItem.id,
          user_id: attempt.user_id,
          score: Number(scoredPoints),
          feedback: null,
          graded_by: userId,
        } as any);
        await gradeRepo.save(gradeNew as any);
      }
    }

    return {
      attempt_id: attempt.id,
      total_points: totalPoints,
      score: Number(scoredPoints),
      percentage,
      is_passed: passed,
      questions_summary: summary,
    };
  }

  async submitAttempt(attemptId: number, userId: number): Promise<QuizAttemptSubmitResult> {
    const attemptRepo = AppDataSource.getRepository(QuizAttempt);

    const attempt = await attemptRepo.findOne({ where: { id: attemptId, user_id: userId } as any });
    if (!attempt) throw new Error('Attempt không hợp lệ.');
    if (attempt.status !== 'in_progress') throw new Error('Attempt đã được nộp.');

    const autoResult = await this.autoGradeAttempt(attemptId, userId);

    const questionCount = await AppDataSource.getRepository(QuizQuestion).count({ where: { quiz_id: attempt.quiz_id } as any });
    const answeredCount = await AppDataSource.getRepository(QuizResponse).count({ where: { attempt_id: attemptId } as any });
    const unansweredCount = Math.max(0, questionCount - answeredCount);

    const attemptUpdated = await attemptRepo.findOne({ where: { id: attemptId } as any });
    const submittedAt = attemptUpdated?.submitted_at ? attemptUpdated.submitted_at.toISOString() : new Date().toISOString();

    return {
      attempt_id: autoResult.attempt_id,
      quiz_id: attempt.quiz_id,
      score: autoResult.score,
      is_passed: autoResult.is_passed,
      submitted_at: submittedAt,
      unanswered_count: unansweredCount,
    };
  }
}


