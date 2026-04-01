import { url } from "../baseUrl";
import { getAccessToken } from "../utils/authStorage";

function authHeaders() {
  const token = getAccessToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function fetchQuiz(quizId: number) {
  const res = await fetch(`${url}/api/v1/quizzes/${quizId}`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Không thể tải quiz");
  return data.data;
}

export async function fetchLatestAttempt(quizId: number) {
  const res = await fetch(`${url}/api/v1/quizzes/${quizId}/attempts/latest`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) {
    return null;
  }
  return data.data;
}

export async function createQuizAttempt(quizId: number) {
  const res = await fetch(`${url}/api/v1/quizzes/${quizId}/attempts`, {
    method: "POST",
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Không thể tạo attempt");
  return data.data;
}

export async function getAttemptResponses(attemptId: number) {
  const res = await fetch(`${url}/api/v1/quiz-attempts/${attemptId}/responses`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Không thể tải responses");
  return data.data;
}

export async function saveAttemptResponses(attemptId: number, responses: any[]) {
  const res = await fetch(`${url}/api/v1/quiz-attempts/${attemptId}/responses`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ responses }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Không thể lưu bài làm");
  return data;
}

export async function submitAttempt(attemptId: number) {
  const res = await fetch(`${url}/api/v1/quiz-attempts/${attemptId}/submit`, {
    method: "POST",
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || "Không thể nộp bài");
  return data.data;
}
