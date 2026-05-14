type QuickRepliesProps = {
    replies: Array<{ text: string; value: string }>;
    onSelect: (value: string) => void;
    isLast?: boolean;
};

export function QuickReplies({ replies, onSelect, isLast }: QuickRepliesProps) {
    if (!isLast) return null;

    return (
        <div className="chatbot-quick-replies">
            {replies.map((reply, index) => (
                <button
                    key={index}
                    className="chatbot-quick-reply-btn"
                    onClick={() => onSelect(reply.value)}
                >
                    {reply.text}
                </button>
            ))}
        </div>
    );
}
