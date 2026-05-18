// API endpoints for lesson content (transcript, quiz questions, assignment content)

import { url } from "../baseUrl";
import { getAuthHeader } from "../utils/token";

export const LESSONS_API_BASE = "/api/v1/lessons";

export const LESSONS_API = {
  // Transcript for video lessons (for chatbot context)
  transcript: (lessonId: number | string) => `${LESSONS_API_BASE}/${lessonId}/transcript`,

  // Quiz questions for learner (without correct answers)
  quizQuestions: (lessonId: number | string) => `${LESSONS_API_BASE}/${lessonId}/quiz-questions`,

  // Assignment content for learner
  assignmentContent: (assignmentId: number | string) => `${LESSONS_API_BASE}/assignments/${assignmentId}/content`,
} as const;

// Types for API responses
export type TranscriptResponse = {
  transcript: string | null;
  segments: Array<{
    start_sec: number;
    end_sec: number;
    text: string;
  }>;
};

export type QuizQuestionResponse = {
  lesson_id: number;
  quiz_id: number | null;
  questions: Array<{
    id: number;
    question_text: string;
    options: Array<{
      id: number;
      option_text: string;
      order_index: number;
    }>;
  }>;
};

export type AssignmentContentResponse = {
  id: number;
  lesson_id: number;
  title: string;
  description: string | null;
  short_answer_questions: Array<{
    id: number;
    question_text: string;
    order_index: number;
  }> | null;
  attachments: Array<{
    id: number;
    filename: string;
    url: string;
    mime_type: string | null;
  }>;
};

// API functions
export async function getLessonTranscript(lessonId: number): Promise<TranscriptResponse | null> {
  const token = localStorage.getItem("token");
  const res = await fetch(`${url}${LESSONS_API.transcript(lessonId)}`, {
    headers: getAuthHeader(token),
  });
  if (!res.ok) {
    console.error("Failed to fetch lesson transcript:", res.status);
    return null;
  }
  return res.json();
}

export async function getQuizQuestions(lessonId: number): Promise<QuizQuestionResponse | null> {
  const token = localStorage.getItem("token");
  const res = await fetch(`${url}${LESSONS_API.quizQuestions(lessonId)}`, {
    headers: getAuthHeader(token),
  });
  if (!res.ok) {
    console.error("Failed to fetch quiz questions:", res.status);
    return null;
  }
  return res.json();
}

export async function getAssignmentContent(assignmentId: number): Promise<AssignmentContentResponse | null> {
  const token = localStorage.getItem("token");
  const res = await fetch(`${url}${LESSONS_API.assignmentContent(assignmentId)}`, {
    headers: getAuthHeader(token),
  });
  if (!res.ok) {
    console.error("Failed to fetch assignment content:", res.status);
    return null;
  }
  return res.json();
}
