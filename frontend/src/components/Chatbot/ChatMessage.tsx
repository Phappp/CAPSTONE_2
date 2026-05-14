import { Bot, User } from 'lucide-react';

type ChatMessageProps = {
    message: {
        role: 'user' | 'assistant';
        content: string;
    };
};

export function ChatMessage({ message }: ChatMessageProps) {
    const isUser = message.role === 'user';

    return (
        <div className={`chatbot-message ${isUser ? 'user-message' : 'bot-message'}`}>
            {!isUser && <Bot size={20} className="chatbot-bot-icon" />}
            <div className="chatbot-message-content">
                <p>{message.content}</p>
            </div>
            {isUser && <User size={20} className="chatbot-user-icon" />}
        </div>
    );
}
