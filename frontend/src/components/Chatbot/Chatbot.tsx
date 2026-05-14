import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { QuickReplies } from './QuickReplies';
import { CourseCardInline } from './CourseCardInline';
import { url } from '../../baseUrl';
import { useAuth } from '../../contexts/Auth';
import { MessageSquare, X, Bot, Loader2 } from 'lucide-react';
import './Chatbot.css';

type ChatMessageData = {
    role: 'user' | 'assistant';
    content: string;
    references?: Array<{
        type: 'course' | 'lesson';
        id: number;
        slug?: string;
        title?: string;
        level?: string;
        price?: number;
        has_certificate?: boolean;
        progress_percent?: number;
    }>;
    quickReplies?: Array<{ text: string; value: string }>;
};

const STORAGE_KEY = 'chatbot_history';

export default function Chatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessageData[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [streamingContent, setStreamingContent] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { user, accessToken } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setMessages(parsed);
                } else {
                    setMessages([getWelcomeMessage()]);
                }
            } catch {
                setMessages([getWelcomeMessage()]);
            }
        } else {
            setMessages([getWelcomeMessage()]);
        }
    }, []);

    useEffect(() => {
        if (messages.length > 0) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
        }
    }, [messages]);

    useEffect(() => {
        if (isOpen && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, streamingContent, isOpen]);

    const getWelcomeMessage = (): ChatMessageData => ({
        role: 'assistant',
        content: 'Xin chào! Tôi là trợ lý tư vấn khóa học của e-Learning. Bạn cần tôi giúp gì hôm nay?',
        quickReplies: [
            { text: 'Tìm khóa học mới', value: 'Tìm khóa học mới' },
            { text: 'Khóa học phù hợp với ai?', value: 'Khóa học nào phù hợp với người mới bắt đầu?' },
            { text: 'Có khóa học miễn phí không?', value: 'Có khóa học miễn phí nào không?' },
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

        const userMessage: ChatMessageData = { role: 'user', content: text.trim() };
        setMessages((prev) => [...prev, userMessage]);
        setIsLoading(true);
        setStreamingContent('');

        try {
            const history = messages.slice(-10).map((m) => ({
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
                role: 'assistant',
                content: result.data?.reply || 'Xin lỗi, tôi không thể trả lời lúc này.',
                references: result.data?.references || [],
                quickReplies: result.data?.quickReplies || [],
            };

            setMessages((prev) => [...prev, assistantMessage]);
        } catch (error) {
            console.error('Chat error:', error);
            const lastBotMessage = messages.length > 0 ? messages[messages.length - 1].content : undefined;
            const errorMessage: ChatMessageData = {
                role: 'assistant',
                content: 'Xin lỗi, đã có lỗi xảy ra. Bạn vui lòng thử lại sau nhé.',
                quickReplies: getContextualQuickReplies(lastBotMessage),
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
            setStreamingContent('');
        }
    };

    const handleQuickReply = (value: string) => {
        handleSendMessage(value);
    };

    const handleCourseClick = (courseId: number, slug?: string) => {
        if (slug && slug !== 'undefined') {
            navigate(`/courses/${slug}`);
        } else {
            navigate(`/courses`);
        }
        setIsOpen(false);
    };

    const handleClearHistory = () => {
        localStorage.removeItem(STORAGE_KEY);
        setMessages([getWelcomeMessage()]);
    };

    if (!user) return null;

    return (
        <>
            <button className="chatbot-fab" onClick={() => setIsOpen(!isOpen)} aria-label="Chat với trợ lý">
                {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
            </button>

            {isOpen && (
                <div className="chatbot-modal">
                    <div className="chatbot-header">
                        <div className="chatbot-header-info">
                            <Bot size={24} className="chatbot-header-icon" />
                            <div>
                                <h3>Trợ Lý Tư Vấn</h3>
                                <span>AI Assistant</span>
                            </div>
                        </div>
                        <div className="chatbot-header-actions">
                            <button className="chatbot-clear-btn" onClick={handleClearHistory} title="Xóa lịch sử">
                                <X size={16} />
                            </button>
                            {/* <button className="chatbot-close-btn" onClick={() => setIsOpen(false)}>
                                <X size={20} />
                            </button> */}
                        </div>
                    </div>

                    <div className="chatbot-messages">
                        {messages.map((msg, index) => (
                            <div key={index}>
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
