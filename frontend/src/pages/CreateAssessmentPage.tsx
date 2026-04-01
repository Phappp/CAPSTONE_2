import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { url } from "../baseUrl";
import { getAccessToken } from "../utils/authStorage";
import "./CreateAssessmentPage.css";

type QuestionType = "multiple_choice" | "true_false";

interface QuestionOption {
  option_text: string;
  is_correct: boolean;
  order_index: number;
  explanation?: string;
}

interface Question {
  id: string;
  question_type: QuestionType;
  question_text: string;
  points: number;
  options: QuestionOption[];
  explanation?: string;
}

interface QuizData {
  title: string;
  description: string;
  time_limit_minutes: number;
  max_attempts: number;
  passing_score: number;
  passing_score_type: "points" | "percentage";
  show_results_immediately: boolean;
  show_correct_answers: boolean;
  allow_review: boolean;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  questions: Question[];
}

export default function CreateAssessmentPage() {
  const navigate = useNavigate();
  const { lessonId } = useParams<{ lessonId: string }>();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [quizData, setQuizData] = useState<QuizData>({
    title: "",
    description: "",
    time_limit_minutes: 30,
    max_attempts: 1,
    passing_score: 5,
    passing_score_type: "points",
    show_results_immediately: true,
    show_correct_answers: true,
    allow_review: false,
    shuffle_questions: true,
    shuffle_options: true,
    questions: [],
  });

  const [showAddQuestionModal, setShowAddQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  const [newQuestion, setNewQuestion] = useState<Partial<Question>>({
    question_type: "multiple_choice",
    question_text: "",
    points: 2,
    options: [
      { option_text: "", is_correct: false, order_index: 1 },
      { option_text: "", is_correct: false, order_index: 2 },
    ],
    explanation: "",
  });

  const updateNewQuestion = (updates: Partial<Question>) => {
    setNewQuestion((prev: Partial<Question>) => ({ ...prev, ...updates }));
  };

  const addOption = () => {
    const newOption: QuestionOption = {
      option_text: "",
      is_correct: false,
      order_index: newQuestion.options?.length ? newQuestion.options.length + 1 : 1,
    };
    updateNewQuestion({ options: [...(newQuestion.options || []), newOption] });
  };

  const updateOption = (index: number, updates: Partial<QuestionOption>) => {
    const updatedOptions = (newQuestion.options || []).map((opt: QuestionOption, i: number) =>
      i === index ? { ...opt, ...updates } : opt
    );
    updateNewQuestion({ options: updatedOptions });
  };

  const removeOption = (index: number) => {
    const updatedOptions = (newQuestion.options || []).filter((_: QuestionOption, i: number) => i !== index);
    updateNewQuestion({ options: updatedOptions });
  };

  const saveQuestion = () => {
    if (!newQuestion.question_text || !newQuestion.points || !newQuestion.options?.length) {
      alert("Vui lòng điền đầy đủ thông tin");
      return;
    }

    const hasCorrect = newQuestion.options?.some((opt: QuestionOption) => opt.is_correct);
    if (!hasCorrect) {
      alert("Vui lòng chọn ít nhất một đáp án đúng");
      return;
    }

    const question: Question = {
      id: editingQuestion?.id || Date.now().toString(),
      question_type: newQuestion.question_type as QuestionType,
      question_text: newQuestion.question_text,
      points: newQuestion.points,
      options: newQuestion.options!.map((opt: QuestionOption, index: number) => ({ ...opt, order_index: index + 1 })),
      explanation: newQuestion.explanation,
    };

    if (editingQuestion) {
      editQuestion(question);
    } else {
      addQuestion(question);
    }

    setNewQuestion({
      question_type: "multiple_choice",
      question_text: "",
      points: 2,
      options: [
        { option_text: "", is_correct: false, order_index: 1 },
        { option_text: "", is_correct: false, order_index: 2 },
      ],
      explanation: "",
    });
  };

  const openAddQuestionModal = (type: QuestionType) => {
    setNewQuestion({
      question_type: type,
      question_text: "",
      points: 2,
      options: type === "multiple_choice" ? [
        { option_text: "", is_correct: false, order_index: 1 },
        { option_text: "", is_correct: false, order_index: 2 },
      ] : [
        { option_text: "Đúng", is_correct: false, order_index: 1 },
        { option_text: "Sai", is_correct: false, order_index: 2 },
      ],
      explanation: "",
    });
    setEditingQuestion(null);
    setShowAddQuestionModal(true);
  };

  useEffect(() => {
    if (editingQuestion) {
      setNewQuestion(editingQuestion);
    }
  }, [editingQuestion]);

  const updateQuizData = (updates: Partial<QuizData>) => {
    setQuizData(prev => ({ ...prev, ...updates }));
  };

  const nextStep = () => {
    if (step < 3) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const addQuestion = (question: Question) => {
    const newQuestion = { ...question, id: Date.now().toString() };
    updateQuizData({ questions: [...quizData.questions, newQuestion] });
    setShowAddQuestionModal(false);
  };

  const editQuestion = (question: Question) => {
    const updatedQuestions = quizData.questions.map(q =>
      q.id === question.id ? question : q
    );
    updateQuizData({ questions: updatedQuestions });
    setEditingQuestion(null);
    setShowAddQuestionModal(false);
  };

  const deleteQuestion = (questionId: string) => {
    updateQuizData({ questions: quizData.questions.filter(q => q.id !== questionId) });
  };

  const createQuiz = async () => {
    if (!lessonId) {
      setError("Lesson ID không hợp lệ");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const token = getAccessToken();
      const payload = {
        ...quizData,
      };
      const response = await fetch(`${url}/api/v1/lessons/${lessonId}/quizzes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || "Lỗi khi tạo bài kiểm tra");
      }

      // Show success message
      window.alert(`Tạo bài kiểm tra thành công! Quiz ID: ${data.data?.quiz_id}`);

      // Navigate back
      navigate(-1);
    } catch (e: any) {
      setError(e?.message || "Đã xảy ra lỗi");
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="assessment-form">
      <div className="form-header">
        <h2>TẠO BÀI KIỂM TRA MỚI</h2>
        <div className="steps">
          <span className="step active">1. Thông tin cơ bản</span>
          <span className="step">2. Cài đặt chấm điểm</span>
          <span className="step">3. Thêm câu hỏi</span>
        </div>
      </div>

      <div className="form-body">
        <div className="form-group">
          <label>Tiêu đề bài kiểm tra *</label>
          <input
            type="text"
            value={quizData.title}
            onChange={(e) => updateQuizData({ title: e.target.value })}
            placeholder="Kiểm tra giữa kỳ - Chương 1-3"
            required
          />
        </div>

        <div className="form-group">
          <label>Mô tả</label>
          <textarea
            value={quizData.description}
            onChange={(e) => updateQuizData({ description: e.target.value })}
            placeholder="Bài kiểm tra kiến thức về biến, kiểu dữ liệu và câu lệnh điều kiện"
            rows={3}
          />
        </div>

        <div className="form-group">
          <label>Thời gian làm bài (phút) *</label>
          <input
            type="number"
            value={quizData.time_limit_minutes}
            onChange={(e) => updateQuizData({ time_limit_minutes: Number(e.target.value) })}
            min="1"
            required
          />
        </div>

        <div className="form-group">
          <label>Số lần làm lại tối đa *</label>
          <input
            type="number"
            value={quizData.max_attempts}
            onChange={(e) => updateQuizData({ max_attempts: Number(e.target.value) })}
            min="0"
            required
          />
          <small>0 = không giới hạn, 1 = chỉ làm 1 lần</small>
        </div>

        {/* start_time/end_time fields removed as requested */}
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
          ← Quay lại
        </button>
        <button type="button" className="btn btn-primary" onClick={nextStep}>
          Tiếp theo
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="assessment-form">
      <div className="form-header">
        <h2>TẠO BÀI KIỂM TRA MỚI</h2>
        <div className="steps">
          <span className="step">1. Thông tin cơ bản</span>
          <span className="step active">2. Cài đặt chấm điểm</span>
          <span className="step">3. Thêm câu hỏi</span>
        </div>
      </div>

      <div className="form-body">
        <div className="form-group">
          <label>Điểm đạt</label>
          <div className="radio-group">
            <label>
              <input
                type="radio"
                name="passing_score_type"
                value="percentage"
                checked={quizData.passing_score_type === "percentage"}
                onChange={(e) => updateQuizData({ passing_score_type: e.target.value as "percentage" })}
              />
              Tính theo %
            </label>
            {quizData.passing_score_type === "percentage" && (
              <input
                type="number"
                value={quizData.passing_score}
                onChange={(e) => updateQuizData({ passing_score: Number(e.target.value) })}
                min="0"
                max="100"
                placeholder="60"
              />
            )}
          </div>
          <div className="radio-group">
            <label>
              <input
                type="radio"
                name="passing_score_type"
                value="points"
                checked={quizData.passing_score_type === "points"}
                onChange={(e) => updateQuizData({ passing_score_type: e.target.value as "points" })}
              />
              Tính theo điểm số
            </label>
            {quizData.passing_score_type === "points" && (
              <div className="points-input">
                <input
                  type="number"
                  value={quizData.passing_score}
                  onChange={(e) => updateQuizData({ passing_score: Number(e.target.value) })}
                  min="0"
                  placeholder="5"
                />
                <span>/ 10</span>
              </div>
            )}
          </div>
        </div>

        <div className="form-group">
          <label>Hiển thị kết quả</label>
          <div className="checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={quizData.show_results_immediately}
                onChange={(e) => updateQuizData({ show_results_immediately: e.target.checked })}
              />
              Hiển thị điểm ngay sau khi làm xong
            </label>
            <label>
              <input
                type="checkbox"
                checked={quizData.show_correct_answers}
                onChange={(e) => updateQuizData({ show_correct_answers: e.target.checked })}
              />
              Hiển thị đáp án đúng
            </label>
            <label>
              <input
                type="checkbox"
                checked={quizData.allow_review}
                onChange={(e) => updateQuizData({ allow_review: e.target.checked })}
              />
              Cho phép xem lại bài làm
            </label>
          </div>
        </div>

        <div className="form-group">
          <label>Xáo trộn</label>
          <div className="checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={quizData.shuffle_questions}
                onChange={(e) => updateQuizData({ shuffle_questions: e.target.checked })}
              />
              Xáo trộn thứ tự câu hỏi
            </label>
            <label>
              <input
                type="checkbox"
                checked={quizData.shuffle_options}
                onChange={(e) => updateQuizData({ shuffle_options: e.target.checked })}
              />
              Xáo trộn thứ tự đáp án
            </label>
          </div>
        </div>
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={prevStep}>
          ← Quay lại
        </button>
        <button type="button" className="btn btn-primary" onClick={nextStep}>
          Tiếp theo
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="assessment-form">
      <div className="form-header">
        <h2>TẠO BÀI KIỂM TRA MỚI</h2>
        <div className="steps">
          <span className="step">1. Thông tin cơ bản</span>
          <span className="step">2. Cài đặt chấm điểm</span>
          <span className="step active">3. Thêm câu hỏi</span>
        </div>
      </div>

      <div className="form-body">
        <div className="add-question-section">
          <select 
            className="question-type-select"
            onChange={(e) => {
              if (e.target.value) {
                openAddQuestionModal(e.target.value as QuestionType);
                e.target.value = '';
              }
            }}
          >
            <option value="">➕ THÊM CÂU HỎI MỚI ▼</option>
            <option value="multiple_choice">Trắc nghiệm (MCQ)</option>
            <option value="true_false">Đúng/Sai</option>
          </select>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => alert('Import từ file chưa được implement')}
          >
            📤 Import từ file
          </button>
        </div>

        <div className="questions-list">
          <h3>DANH SÁCH CÂU HỎI ({quizData.questions.length} câu)</h3>
          {quizData.questions.map((question, index) => (
            <div key={question.id} className="question-item">
              <div className="question-header">
                <span>Câu {index + 1}: {question.question_text}</span>
                <div className="question-actions">
                  <button onClick={() => { setEditingQuestion(question); setShowAddQuestionModal(true); }}>✎</button>
                  <button onClick={() => deleteQuestion(question.id)}>🗑️</button>
                  <button>☰</button>
                </div>
              </div>
              <div className="question-options">
                {question.options.map((option, optIndex) => (
                  <div key={optIndex} className={`option ${option.is_correct ? 'correct' : ''}`}>
                    {question.question_type === 'multiple_choice' ? 
                      `${String.fromCharCode(65 + optIndex)}. ${option.option_text}` : 
                      option.option_text}
                    {option.is_correct && ' ✓'}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="total-points">
          Tổng điểm: {quizData.questions.reduce((sum, q) => sum + q.points, 0)} ({quizData.questions.length > 0 ? quizData.questions[0].points : 0} điểm/câu)
        </div>
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={prevStep}>
          ← Quay lại
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={createQuiz}
          disabled={loading || quizData.questions.length === 0}
        >
          {loading ? "Đang tạo..." : "TẠO BÀI THI"}
        </button>
      </div>
    </div>
  );

  const renderAddQuestionModal = () => {
    if (!showAddQuestionModal) return null;

    return (
      <div className="modal-overlay" onClick={() => setShowAddQuestionModal(false)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <h3>✏️ {editingQuestion ? 'CHỈNH SỬA' : 'THÊM'} CÂU HỎI {newQuestion.question_type === 'multiple_choice' ? 'TRẮC NGHIỆM' : 'ĐÚNG/SAI'}</h3>
          
          <div className="form-group">
            <label>Nội dung câu hỏi *</label>
            <textarea
              value={newQuestion.question_text}
              onChange={(e) => updateNewQuestion({ question_text: e.target.value })}
              placeholder="Nhập nội dung câu hỏi"
              rows={3}
              required
            />
          </div>

          <div className="form-group">
            <label>Điểm *</label>
            <input
              type="number"
              value={newQuestion.points}
              onChange={(e) => updateNewQuestion({ points: Number(e.target.value) })}
              min="1"
              required
            />
          </div>

          <div className="form-group">
            <label>Các đáp án *</label>
            {newQuestion.options?.map((option: QuestionOption, index: number) => (
              <div key={index} className="option-input">
                <input
                  type={newQuestion.question_type === 'multiple_choice' ? 'text' : 'hidden'}
                  value={option.option_text}
                  onChange={(e) => updateOption(index, { option_text: e.target.value })}
                  placeholder={newQuestion.question_type === 'multiple_choice' ? `Đáp án ${String.fromCharCode(65 + index)}` : option.option_text}
                  disabled={newQuestion.question_type === 'true_false'}
                />
                <input
                  type="radio"
                  name="correct-option"
                  checked={option.is_correct}
                  onChange={() => {
                    const updatedOptions = newQuestion.options?.map((opt: QuestionOption, i: number) => ({
                      ...opt,
                      is_correct: i === index
                    }));
                    updateNewQuestion({ options: updatedOptions });
                  }}
                />
                <button
                  type="button"
                  onClick={() => removeOption(index)}
                  disabled={(newQuestion.options?.length || 0) <= 2}
                  className="remove-option-btn"
                >
                  ✕
                </button>
              </div>
            ))}
            {newQuestion.question_type === 'multiple_choice' && newQuestion.options && newQuestion.options.length < 6 && (
              <button type="button" onClick={addOption} className="add-option-btn">
                ➕ Thêm đáp án
              </button>
            )}
          </div>

          <div className="form-group">
            <label>Giải thích (không bắt buộc)</label>
            <textarea
              value={newQuestion.explanation}
              onChange={(e) => updateNewQuestion({ explanation: e.target.value })}
              placeholder="Giải thích cho đáp án đúng"
              rows={2}
            />
          </div>

          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={() => setShowAddQuestionModal(false)}>HỦY</button>
            <button className="btn btn-primary" onClick={saveQuestion}>
              {editingQuestion ? 'CẬP NHẬT' : 'THÊM'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="create-assessment-page">
      {error && <div className="error-message">{error}</div>}
      
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
      
      {renderAddQuestionModal()}
    </div>
  );
}
