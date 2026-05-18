import { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import { Send, Loader2, Upload, X, Paperclip } from 'lucide-react';
import './ChatInput.css';

export type ChatInputHandles = {
    triggerFileUpload: () => void;
};

type ChatInputProps = {
    onSend: (message: string) => void;
    onFileUpload?: (file: File) => void;
    isLoading?: boolean;
};

export const ChatInput = forwardRef<ChatInputHandles, ChatInputProps>(
    function ChatInput({ onSend, onFileUpload, isLoading }, ref) {
        const [input, setInput] = useState('');
        const [attachedFile, setAttachedFile] = useState<File | null>(null);
        const fileInputRef = useRef<HTMLInputElement>(null);
        const hiddenFileInputRef = useRef<HTMLInputElement>(null);

        // Expose methods to parent via ref
        useImperativeHandle(ref, () => ({
            triggerFileUpload: () => {
                hiddenFileInputRef.current?.click();
            }
        }));

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

        const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (file) {
                setAttachedFile(file);
                if (onFileUpload) {
                    onFileUpload(file);
                }
            }
            // Reset input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        };

        const handleRemoveFile = () => {
            setAttachedFile(null);
        };

        const handleDragOver = (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
        };

        const handleDrop = (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Check if this is a course tree node (JSON data)
            const nodeData = e.dataTransfer.getData('application/json');
            if (nodeData) {
                // Let the modal handle lesson/quiz/assignment nodes
                // Don't call onFileUpload for course tree nodes
                return;
            }
            
            // Handle file drops
            const file = e.dataTransfer.files?.[0];
            if (file) {
                setAttachedFile(file);
                if (onFileUpload) {
                    onFileUpload(file);
                }
            }
        };

        return (
            <form 
                className="chatbot-input-form" 
                onSubmit={handleSubmit}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
            >
                {attachedFile && (
                    <div className="chatbot-attached-file">
                        <Paperclip size={14} />
                        <span className="chatbot-attached-filename">
                            {attachedFile.name.length > 20 
                                ? attachedFile.name.substring(0, 17) + '...' 
                                : attachedFile.name}
                        </span>
                        <button 
                            type="button" 
                            className="chatbot-attached-remove"
                            onClick={handleRemoveFile}
                        >
                            <X size={12} />
                        </button>
                    </div>
                )}
                <input
                    type="text"
                    className="chatbot-input"
                    placeholder="Nhập tin nhắn..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isLoading}
                    maxLength={2000}
                />
                <input
                    ref={hiddenFileInputRef}
                    type="file"
                    className="chatbot-file-input-hidden"
                    onChange={handleFileSelect}
                    accept=".txt,.md,.pdf,.doc,.docx,.js,.ts,.py,.java,.cpp,.c,.cs"
                />
                <button
                    type="button"
                    className="chatbot-upload-btn"
                    onClick={() => hiddenFileInputRef.current?.click()}
                    title="Đính kèm file"
                >
                    <Upload size={18} />
                </button>
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
);
