import { Bot } from 'lucide-react';

type ChatMessageProps = {
    message: {
        role: 'user' | 'assistant';
        content: string;
    };
};

function parseMarkdown(text: string): React.ReactNode[] {
    // Convert literal \n to actual newlines first
    const processed = text.replace(/\\n/g, '\n');
    const lines = processed.split('\n');
    const parts: React.ReactNode[] = [];
    let key = 0;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        while (line.length > 0) {
            // Match **bold** text
            const boldMatch = line.match(/\*\*(.+?)\*\*/);
            if (boldMatch && boldMatch.index !== undefined) {
                // Add text before bold
                if (boldMatch.index > 0) {
                    parts.push(line.slice(0, boldMatch.index));
                }
                // Add bold text
                parts.push(<strong key={key++}>{boldMatch[1]}</strong>);
                line = line.slice(boldMatch.index + boldMatch[0].length);
            } else {
                parts.push(line);
                break;
            }
        }

        // Add <br /> between lines (except after the last line)
        if (i < lines.length - 1) {
            parts.push(<br key={key++} />);
        }
    }

    return parts;
}

export function ChatMessage({ message }: ChatMessageProps) {
    const isUser = message.role === 'user';

    return (
        <div className={`chatbot-message ${isUser ? 'user-message' : 'bot-message'}`}>
            {!isUser && <Bot size={20} className="chatbot-bot-icon" />}
            <div className="chatbot-message-content">
                <p>{parseMarkdown(message.content)}</p>
            </div>
        </div>
    );
}
