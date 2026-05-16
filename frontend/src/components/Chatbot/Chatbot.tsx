import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { QuickReplies } from './QuickReplies';
import { CourseCardInline } from './CourseCardInline';
import { PaymentInline } from './PaymentInline';
import { RoadmapInline } from './RoadmapInline';
import { url } from '../../baseUrl';
import { useAuth } from '../../contexts/Auth';
import { MessageSquare, X, Bot, Loader2, Trash2, Maximize2, Minimize2 } from 'lucide-react';
import './Chatbot.css';

type ChatbotAction =
    | { type: 'enroll'; courseId: number; courseTitle: string }
    | { type: 'create_order'; courseId: number; orderId: number; paymentUrl: string; amount: number; courseTitle: string }
    | { type: 'enrollment_conflict'; courseId: number; courseTitle: string }
    | { type: 'error'; message: string }
    | null;

type ChatMessageData = {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    references?: Array<{
        type: 'course' | 'lesson' | 'roadmap-step';
        id: number;
        slug?: string;
        title?: string;
        level?: string;
        price?: number;
        has_certificate?: boolean;
        progress_percent?: number;
        description?: string;
        skills?: string[];
        estimatedWeeks?: number;
        difficulty?: 'beginner' | 'intermediate' | 'advanced';
        order?: number;
    }>;
    quickReplies?: Array<{ text: string; value: string }>;
    action?: ChatbotAction;
    roadmap?: {
        id: string;
        title: string;
        description: string;
        targetCareer: string;
        totalDurationMonths: number;
        steps: Array<{
            order: number;
            title: string;
            description: string;
            skills: string[];
            estimatedWeeks: number;
            difficulty: 'beginner' | 'intermediate' | 'advanced';
        }>;
    };
};

const STORAGE_KEY = 'chatbot_history';
const CHATBOT_OPEN_KEY = 'chatbot_is_open';

const createMessageId = () => `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const parseMessages = (saved: string | null): ChatMessageData[] => {
    if (!saved) return [];
    try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map((m: any) => ({
                ...m,
                id: m.id || createMessageId(),
            }));
        }
    } catch { /* ignore */ }
    return [];
};

export default function Chatbot() {
    const [isOpen, setIsOpen] = useState(() => {
        const saved = localStorage.getItem(CHATBOT_OPEN_KEY);
        return saved === 'true';
    });
    const [isExpanded, setIsExpanded] = useState(() => {
        const saved = localStorage.getItem('chatbot_is_expanded');
        return saved === 'true';
    });
    const [messages, setMessages] = useState<ChatMessageData[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showPayment, setShowPayment] = useState(false);
    const [currentPaymentAction, setCurrentPaymentAction] = useState<ChatbotAction>(null);
    const [lastUserMessage, setLastUserMessage] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { user, accessToken } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        const parsed = parseMessages(saved);
        setMessages(parsed.length > 0 ? parsed : [getWelcomeMessage()]);
    }, []);

    useEffect(() => {
        if (messages.length > 0) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
        }
    }, [messages]);

    useEffect(() => {
        localStorage.setItem(CHATBOT_OPEN_KEY, String(isOpen));
    }, [isOpen]);

    useEffect(() => {
        localStorage.setItem('chatbot_is_expanded', String(isExpanded));
    }, [isExpanded]);

    useEffect(() => {
        if (isOpen && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen]);

    const getWelcomeMessage = (): ChatMessageData => ({
        id: createMessageId(),
        role: 'assistant',
        content: 'Xin chào! 👋 Mình là trợ lý tư vấn khóa học của e-Learning. Bạn cần mình giúp gì hôm nay?',
        quickReplies: [
            { text: 'Tìm khóa học', value: 'tìm khóa học' },
            { text: 'Có khóa miễn phí không?', value: 'có khóa miễn phí không' },
            { text: 'Gợi ý khóa cho tôi', value: 'gợi ý khóa học' },
        ],
    });

    const getContextualQuickReplies = (lastMessage?: string): Array<{ text: string; value: string }> => {
        if (!lastMessage) {
            return [
                { text: 'Tìm khóa học mới', value: 'Tìm khóa học mới' },
                { text: 'Khóa học của tôi', value: 'Khóa học của tôi' },
            ];
        }
        const lower = lastMessage.toLowerCase();
        if (lower.includes('dang ky') || lower.includes('enroll')) {
            return [
                { text: 'Xem khóa học', value: 'Cho tôi xem các khóa học' },
                { text: 'Hỏi về giá', value: 'Giá khóa học như thế nào?' },
            ];
        }
        if (lower.includes('chung chi') || lower.includes('certificate')) {
            return [
                { text: 'Xem khóa học có chứng chỉ', value: 'Khóa học nào có chứng chỉ?' },
                { text: 'Tìm khóa học mới', value: 'Tìm khóa học mới' },
            ];
        }
        return [
            { text: 'Tìm khóa học mới', value: 'Tìm khóa học mới' },
            { text: 'Khóa học của tôi', value: 'Khóa học của tôi' },
        ];
    };

    const handleSendMessage = async (text: string) => {
        if (!text.trim() || isLoading) return;

        // Lưu câu hỏi của user để phục vụ retry
        setLastUserMessage(text.trim());

        const userMessage: ChatMessageData = {
            id: createMessageId(),
            role: 'user',
            content: text.trim()
        };
        const currentMessages = [...messages, userMessage];
        setMessages(currentMessages);
        setIsLoading(true);

        try {
            const history = currentMessages.slice(-10).map((m) => ({
                role: m.role,
                content: m.content,
            }));

            const response = await fetch(`${url}/api/v1/chatbot/message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken || ''}`,
                },
                body: JSON.stringify({
                    message: text.trim(),
                    conversationHistory: history,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to send message');
            }

            const result = await response.json();
            const assistantMessage: ChatMessageData = {
                id: createMessageId(),
                role: 'assistant',
                content: result.data?.reply || 'Xin lỗi, tôi không thể trả lời lúc này.',
                references: result.data?.references || [],
                quickReplies: result.data?.quickReplies || [],
                action: result.data?.action || null,
                roadmap: result.data?.roadmap || null,
            };

            setMessages((prev) => [...prev, assistantMessage]);

            // Handle actions
            if (assistantMessage.action?.type === 'create_order') {
                setCurrentPaymentAction(assistantMessage.action);
                setShowPayment(true);
            }
        } catch (error) {
            console.error('Chat error:', error);
            const errorMessage: ChatMessageData = {
                id: createMessageId(),
                role: 'assistant',
                content: 'Ối, có lỗi xảy ra rồi 😅 Bạn thử hỏi lại được không? Hoặc liên hệ hỗ trợ nếu cần nhé!',
                quickReplies: [
                    { text: 'Tìm khóa học', value: 'Tìm khóa học' },
                    { text: 'Hỏi lại', value: '__RETRY__' },
                ],
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleQuickReply = (value: string) => {
        // Kiểm tra nếu là retry
        const retryKeywords = ['hỏi lại', 'retry', '__retry__', 'thử lại'];
        const isRetry = retryKeywords.some(kw => value.toLowerCase().includes(kw.toLowerCase()));

        if (isRetry && lastUserMessage) {
            // Gửi lại câu hỏi trước đó
            handleSendMessage(lastUserMessage);
        } else {
            handleSendMessage(value);
        }
    };

    const handleCourseClick = (courseId: number, slug?: string) => {
        if (slug && slug !== 'undefined') {
            navigate(`/courses/${slug}`);
        } else {
            navigate(`/courses`);
        }
    };

    const handleClearHistory = () => {
        localStorage.removeItem(STORAGE_KEY);
        setMessages([getWelcomeMessage()]);
    };

    const handlePaymentSuccess = () => {
        // Clear payment state
        setShowPayment(false);
        setCurrentPaymentAction(null);

        // Add success message
        const successMessage: ChatMessageData = {
            id: createMessageId(),
            role: 'assistant',
            content: 'Chúc mừng bạn! Bạn đã đăng ký thành công khóa học. Hãy bắt đầu học ngay nhé!',
            quickReplies: [
                { text: 'Vào học ngay', value: 'Vào học' },
                { text: 'Tìm khóa học khác', value: 'Tìm khóa học khác' },
            ],
        };
        setMessages((prev) => [...prev, successMessage]);
    };

    const handlePaymentError = (message: string) => {
        // Keep payment action for retry - don't clear it
        const errorMessage: ChatMessageData = {
            id: createMessageId(),
            role: 'assistant',
            content: message,
            // Don't show quick replies - user should use the retry button in payment inline
        };
        setMessages((prev) => [...prev, errorMessage]);
    };

    const handleRetryPayment = () => {
        if (currentPaymentAction?.type === 'create_order') {
            // Just re-trigger the payment inline - user already has the action
            setShowPayment(true);
        }
    };

    if (!user) return null;

    return (
        <>
            <button className="chatbot-fab" onClick={() => setIsOpen(!isOpen)} aria-label="Chat với trợ lý">
                {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
            </button>

            {isOpen && (
                <div className={`chatbot-modal ${isExpanded ? 'chatbot-expanded' : ''}`}>
                    <div className="chatbot-header">
                        <div className="chatbot-header-info">
                            <Bot size={24} className="chatbot-header-icon" />
                            <div>
                                <h3>Trợ Lý Tư Vấn</h3>
                                <span>AI Assistant</span>
                            </div>
                        </div>
                        <div className="chatbot-header-actions">
                            <button
                                className="chatbot-action-btn"
                                onClick={() => setIsExpanded(!isExpanded)}
                                title={isExpanded ? 'Thu nhỏ' : 'Mở rộng'}
                            >
                                {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                            </button>
                            <button
                                className="chatbot-action-btn"
                                onClick={handleClearHistory}
                                title="Xóa lịch sử"
                            >
                                <Trash2 size={16} />
                            </button>
                            <button
                                className="chatbot-action-btn"
                                onClick={() => setIsOpen(false)}
                                title="Đóng"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="chatbot-messages">
                        {messages.map((msg, index) => (
                            <div key={msg.id}>
                                <ChatMessage message={msg} />
                                {msg.references && msg.references.length > 0 && (
                                    <div className="chatbot-references">
                                        {msg.references.map((ref, refIndex) =>
                                            ref.type === 'course' ? (
                                                <CourseCardInline
                                                    key={refIndex}
                                                    course={ref}
                                                    onClick={() => handleCourseClick(ref.id, ref.slug)}
                                                />
                                            ) : null
                                        )}
                                    </div>
                                )}

                                {/* Roadmap Component */}
                                {msg.roadmap && (
                                    <RoadmapInline
                                        roadmap={msg.roadmap}
                                        onStepClick={(step) => {
                                            if (step.skills && step.skills.length > 0) {
                                                handleQuickReply(`tìm khóa ${step.skills[0]}`);
                                            }
                                        }}
                                    />
                                )}

                                {/* Inline Payment Component */}
                                {showPayment && currentPaymentAction?.type === 'create_order' && index === messages.length - 1 && (
                                    <PaymentInline
                                        action={currentPaymentAction}
                                        onClose={() => setShowPayment(false)}
                                        onSuccess={handlePaymentSuccess}
                                        onError={handlePaymentError}
                                    />
                                )}

                                {msg.quickReplies && msg.quickReplies.length > 0 && !isLoading && (
                                    <QuickReplies
                                        replies={msg.quickReplies}
                                        onSelect={handleQuickReply}
                                        isLast={index === messages.length - 1}
                                    />
                                )}
                            </div>
                        ))}

                        {isLoading && (
                            <div className="chatbot-message bot-message">
                                <Bot size={20} className="chatbot-bot-icon" />
                                <div className="chatbot-message-content">
                                    <div className="chatbot-loading">
                                        <Loader2 size={16} className="chatbot-spinner" />
                                        <span>Đang tìm kiếm...</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    <ChatInput onSend={handleSendMessage} isLoading={isLoading} />
                </div>
            )}
        </>
    );
}
