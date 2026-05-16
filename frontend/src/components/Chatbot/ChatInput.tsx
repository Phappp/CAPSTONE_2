import { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';

type ChatInputProps = {
    onSend: (message: string) => void;
    isLoading?: boolean;
};

export function ChatInput({ onSend, isLoading }: ChatInputProps) {
    const [input, setInput] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim() && !isLoading) {
            onSend(input.trim());
            setInput('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    return (
        <form className="chatbot-input-form" onSubmit={handleSubmit}>
            <input
                type="text"
                className="chatbot-input"
                placeholder="Nhap tin nhan..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                maxLength={2000}
            />
            <button
                type="submit"
                className="chatbot-send-btn"
                disabled={!input.trim() || isLoading}
            >
                {isLoading ? <Loader2 size={20} className="chatbot-spinner" /> : <Send size={20} />}
            </button>
        </form>
    );
}
