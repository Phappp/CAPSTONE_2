import { Bot } from 'lucide-react';

type ChatMessageProps = {
    message: {
        role: 'user' | 'assistant';
        content: string;
    };
};

function renderMessage(text: string): string {
    // Step 1: Unescape common JSON/string escape sequences
    let processed = text
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .replace(/\\'/g, "'")
        .replace(/\\\\/g, '\\');

    // Step 2: Convert **bold** to <strong>
    processed = processed.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Step 3: Convert markdown links [text](url) → text
    processed = processed.replace(/\[(.+?)\]\((.+?)\)/g, '$1');

    // Step 4: Convert bullet points - and • to HTML
    processed = processed.replace(/^[-•]\s+/gm, '• ');

    return processed;
}

export function ChatMessage({ message }: ChatMessageProps) {
    const isUser = message.role === 'user';
    const rendered = renderMessage(message.content);

    return (
        <div className={`chatbot-message ${isUser ? 'user-message' : 'bot-message'}`}>
            {!isUser && <Bot size={20} className="chatbot-bot-icon" />}
            <div
                className="chatbot-message-content"
                dangerouslySetInnerHTML={{ __html: rendered.replace(/\n/g, '<br />') }}
            />
        </div>
    );
}
