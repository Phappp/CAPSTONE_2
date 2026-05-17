import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChatMessage } from './ChatMessage';
import { ChatInput, ChatInputHandles } from './ChatInput';
import { QuickReplies } from './QuickReplies';
import { CourseCardInline } from './CourseCardInline';
import { PaymentInline } from './PaymentInline';
import { RoadmapInline } from './RoadmapInline';
import { url } from '../../baseUrl';
import { useAuth } from '../../contexts/Auth';
import { useChatbotContext } from '../../contexts/ChatbotContext';
import { MessageSquare, X, Bot, Loader2, Trash2, Maximize2, Minimize2, Upload, FileText, GraduationCap, MessageCircle, Info } from 'lucide-react';
import './Chatbot.css';

// Chat mode types
export type ChatMode = 'consult' | 'learning';

interface ChatModeOption {
    id: ChatMode;
    label: string;
    icon: React.ReactNode;
    description: string;
}

const CHAT_MODES: ChatModeOption[] = [
    {
        id: 'consult',
        label: 'Tư vấn',
        icon: <MessageCircle size={14} />,
        description: 'Hỗ trợ tìm kiếm và đăng ký khóa học'
    },
    {
        id: 'learning',
        label: 'Học tập',
        icon: <GraduationCap size={14} />,
        description: 'Hỗ trợ giải thích bài học'
    }
];

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
    const [chatMode, setChatMode] = useState<ChatMode>(() => {
        const saved = localStorage.getItem('chatbot_mode');
        return (saved as ChatMode) || 'consult';
    });
    const [showModeSelector, setShowModeSelector] = useState(false);
    const [showCourseInfo, setShowCourseInfo] = useState(false);
    const [messages, setMessages] = useState<ChatMessageData[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showPayment, setShowPayment] = useState(false);
    const [currentPaymentAction, setCurrentPaymentAction] = useState<ChatbotAction>(null);
    const [lastUserMessage, setLastUserMessage] = useState<string | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatInputRef = useRef<ChatInputHandles>(null);
    const prevCourseIdRef = useRef<number | null>(null);
    const { user, accessToken } = useAuth();
    const { learningContext, setDroppedNode } = useChatbotContext();
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
        localStorage.setItem('chatbot_mode', chatMode);
    }, [chatMode]);

    useEffect(() => {
        if (isOpen && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen]);

    // Auto-switch mode only on course enter/exit (not on manual switch)
    useEffect(() => {
        const wasInCourse = prevCourseIdRef.current !== null;
        const isInCourse = learningContext?.courseId !== null;

        // Enter course: null → has value
        if (learningContext?.courseId && !wasInCourse) {
            setChatMode('learning');
        }
        // Exit course: has value → null
        else if (!learningContext?.courseId && wasInCourse) {
            setChatMode('consult');
        }

        // Update previous courseId
        prevCourseIdRef.current = learningContext?.courseId || null;
    }, [learningContext?.courseId]);

    // Auto-hide course info after 3s
    useEffect(() => {
        if (showCourseInfo) {
            const timer = setTimeout(() => {
                setShowCourseInfo(false);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [showCourseInfo]);

    const handleShowCourseInfo = useCallback(() => {
        setShowCourseInfo(prev => !prev);
    }, []);

    // ====== DRAG & DROP HANDLERS ======
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);

        // Check for dropped node data (from course tree)
        const nodeData = e.dataTransfer.getData('application/json');
        if (nodeData) {
            try {
                const node = JSON.parse(nodeData);
                if (node.type && node.id && node.title) {
                    setDroppedNode(node);
                    
                    // Auto-send message based on node type
                    const messages = {
                        module: `cho tôi biết về chương: ${node.title}`,
                        lesson: `giải thích bài: ${node.title}`,
                        quiz: `hướng dẫn làm quiz: ${node.title}`,
                        assignment: `yêu cầu bài tập: ${node.title}`,
                    };
                    const autoMessage = messages[node.type as keyof typeof messages] || `hỏi về: ${node.title}`;
                    handleSendMessage(autoMessage);
                    return;
                }
            } catch (err) {
                console.error('Failed to parse dropped node:', err);
            }
        }

        // Check for files
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            handleFileUpload(files[0]);
        }
    }, [setDroppedNode]);

    const handleFileUpload = useCallback(async (file: File) => {
        try {
            // Read file content
            const content = await readFileContent(file);
            const mimeType = file.type || 'application/octet-stream';
            
            // Detect content type
            let contentType: 'file' | 'image' | 'code' | 'text' = 'file';
            if (mimeType.startsWith('image/')) {
                contentType = 'image';
            } else if (mimeType.includes('text') || 
                       file.name.endsWith('.txt') || 
                       file.name.endsWith('.md') ||
                       file.name.endsWith('.json')) {
                contentType = 'text';
            } else if (file.name.endsWith('.js') || 
                       file.name.endsWith('.ts') || 
                       file.name.endsWith('.py') ||
                       file.name.endsWith('.java') ||
                       file.name.endsWith('.cpp') ||
                       file.name.endsWith('.c') ||
                       file.name.endsWith('.cs')) {
                contentType = 'code';
            }

            // Send message with attached content
            handleSendMessage(`Phân tích file: ${file.name}`, {
                attachedContent: {
                    type: contentType,
                    content: content,
                    filename: file.name,
                    mimeType: mimeType,
                }
            });
        } catch (err) {
            console.error('Failed to upload file:', err);
        }
    }, []);

    const readFileContent = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result;
                if (typeof result === 'string') {
                    resolve(result.substring(0, 10000)); // Limit to 10k chars
                } else {
                    // For binary files, return base64
                    const base64 = btoa(String.fromCharCode(...new Uint8Array(result)));
                    resolve(base64);
                }
            };
            reader.onerror = reject;
            reader.readAsText(file);
        });
    };

    const getWelcomeMessage = (): ChatMessageData => ({
        id: createMessageId(),
        role: 'assistant',
        content: chatMode === 'learning'
            ? 'Xin chào! Mình là trợ lý hỗ trợ học tập. Bạn đang học bài nào? Hãy hỏi mình nhé!'
            : 'Xin chào! Mình là trợ lý tư vấn khóa học. Bạn cần mình giúp gì hôm nay?',
        quickReplies: chatMode === 'learning'
            ? [
                { text: 'Giải thích bài này', value: 'Giải thích bài học hiện tại' },
                { text: 'Hướng dẫn làm bài', value: 'Hướng dẫn tôi làm bài tập' },
            ]
            : [
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

    const handleSendMessage = async (text: string, options?: { attachedContent?: any }) => {
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

            // Build request payload
            const payload: any = {
                message: text.trim(),
                conversationHistory: history,
                chatMode: chatMode,
            };

            // Add learning context if available
            if (learningContext) {
                payload.learningContext = {
                    courseId: learningContext.courseId,
                    courseTitle: learningContext.courseTitle,
                    courseSlug: learningContext.courseSlug,
                    progressPercent: learningContext.progressPercent,
                    totalLessons: learningContext.totalLessons,
                    completedLessons: learningContext.completedLessons,
                    currentLessonId: learningContext.currentLessonId,
                    currentLessonTitle: learningContext.currentLessonTitle,
                    currentLessonType: learningContext.currentLessonType,
                    currentModuleId: learningContext.currentModuleId,
                    currentModuleTitle: learningContext.currentModuleTitle,
                    modules: learningContext.modules,
                    droppedNode: learningContext.droppedNode,
                    attachedContent: options?.attachedContent || learningContext.attachedContent,
                };
            } else if (options?.attachedContent) {
                // If no learning context but has attached content, still send it
                payload.learningContext = {
                    courseId: 0,
                    courseTitle: '',
                    courseSlug: '',
                    progressPercent: 0,
                    totalLessons: 0,
                    completedLessons: 0,
                    attachedContent: options.attachedContent,
                };
            }

            const response = await fetch(`${url}/api/v1/chatbot/message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken || ''}`,
                },
                body: JSON.stringify(payload),
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
        // Check for mode switch
        if (value === '__switch_to_consult__') {
            setChatMode('consult');
            handleSendMessage('Chuyển sang chế độ tư vấn');
            return;
        }

        // Check for mode switch to learning
        if (value === '__switch_to_learning__') {
            setChatMode('learning');
            handleSendMessage('Chuyển sang chế độ hỗ trợ học tập');
            return;
        }

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

    // Dynamic header content based on mode
    const headerTitle = chatMode === 'learning' ? 'Trợ Lý Học Tập' : 'Trợ Lý Tư Vấn';
    const headerSubtitle = chatMode === 'learning' ? 'Learning Assistant' : 'AI Assistant';

    return (
        <>
            <button
                className={`chatbot-fab ${chatMode === 'learning' ? 'chatbot-mode-learning' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Chat với trợ lý"
            >
                {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
            </button>

            {isOpen && (
                    <div className={`chatbot-modal ${isExpanded ? 'chatbot-expanded' : ''} ${isDragOver ? 'chatbot-drop-zone-active' : ''} ${chatMode === 'learning' ? 'chatbot-mode-learning' : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    {isDragOver && (
                        <div className="chatbot-drop-overlay">
                            <FileText size={48} />
                            <span>Thả vào đây để hỏi về nội dung</span>
                        </div>
                    )}
                    
                    <div className="chatbot-header">
                        <div className="chatbot-header-info">
                            <Bot size={24} className="chatbot-header-icon" />
                            <div>
                                <h3>{headerTitle}</h3>
                                <span>{headerSubtitle}</span>
                                {chatMode === 'learning' && learningContext?.courseTitle && (
                                    <>
                                        <button
                                            className="chatbot-course-info-btn"
                                            onClick={handleShowCourseInfo}
                                            title="Xem thông tin khóa học"
                                        >
                                            <Info size={16} />
                                        </button>
                                        {showCourseInfo && (
                                            <span className="chatbot-course-badge">
                                                {learningContext.courseTitle}
                                            </span>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="chatbot-header-actions">
                            <div className="chatbot-mode-selector">
                                <button
                                    className="chatbot-mode-btn"
                                    onClick={() => setShowModeSelector(!showModeSelector)}
                                    title="Chuyển chế độ"
                                >
                                    {chatMode === 'consult' ? (
                                        <MessageCircle size={16} />
                                    ) : (
                                        <GraduationCap size={16} />
                                    )}
                                </button>
                                {showModeSelector && (
                                    <div className="chatbot-mode-dropdown">
                                        {CHAT_MODES.map((mode) => (
                                            <button
                                                key={mode.id}
                                                className={`chatbot-mode-option ${chatMode === mode.id ? 'active' : ''}`}
                                                onClick={() => {
                                                    setChatMode(mode.id);
                                                    setShowModeSelector(false);
                                                }}
                                            >
                                                {mode.icon}
                                                <div className="chatbot-mode-option-text">
                                                    <span className="chatbot-mode-option-label">{mode.label}</span>
                                                    <span className="chatbot-mode-option-desc">{mode.description}</span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
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

                    <ChatInput 
                        ref={chatInputRef}
                        onSend={handleSendMessage} 
                        onFileUpload={handleFileUpload}
                        isLoading={isLoading} 
                    />
                </div>
            )}
        </>
    );
}
