import { Bot } from 'lucide-react';

type ChatMessageProps = {
    message: {
        role: 'user' | 'assistant';
        content: string;
    };
};

function cleanMarkdownArtifacts(text: string): string {
    return text
        // Remove code blocks markers
        .replace(/```[\w]*\n?/g, '')
        // Handle --- followed by --- or ### (with or without newlines)
        .replace(/---+\s*###+/g, '\n')
        .replace(/---+\s*###\s+/g, '\n')
        .replace(/---+/g, '\n')
        // ### headings → bold + newline
        .replace(/^###\s+(.+)$/gm, '<strong>$1</strong>\n')
        .replace(/^###/gm, '\n')
        // Remove ## headings but add newline after
        .replace(/^##\s+(.+?)(?=\s*[-•]|$)/gm, '<strong>$1</strong>\n')
        .replace(/^##\s+/gm, '\n')
        // Split inline bullets (all - or • on same line become separate lines)
        .replace(/([^\n])([-•]\s+)/g, '\n$2')
        // Replace // comments with →
        .replace(/\/\/\s*(.+)/g, '→ $1')
        // Remove blockquote >
        .replace(/^>\s*/gm, '')
        // Clean up multiple newlines
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

function parseMarkdownTable(text: string): string {
    const lines = text.split('\n');
    const tableBlocks: Array<{ start: number; end: number }> = [];

    // Find all table blocks (consecutive lines with |)
    let i = 0;
    while (i < lines.length) {
        const line = lines[i];
        if (line.includes('|') && line.match(/\|.*\|/)) {
            // Find table end
            let end = i;
            while (end + 1 < lines.length && lines[end + 1].includes('|')) {
                end++;
            }
            // Check if valid table (at least header + 1 data row)
            if (end - i >= 1) {
                tableBlocks.push({ start: i, end: end + 1 });
                i = end + 1;
                continue;
            }
        }
        i++;
    }

    if (tableBlocks.length === 0) return text;

    let result = text;

    for (const block of tableBlocks) {
        const tableLines = lines.slice(block.start, block.end);
        const rows: string[][] = [];
        let hasSeparator = false;
        let headerProcessed = false;

        for (const line of tableLines) {
            const cells = line.split('|').map(c => c.trim()).filter(c => c !== '');
            
            // Skip separator lines
            if (cells.length > 0 && cells.every(c => /^[-:\s]+$/.test(c) || /^[|:-\s]+$/.test(c))) {
                hasSeparator = true;
                continue;
            }

            if (cells.length > 0) {
                if (!headerProcessed) {
                    // Header row - store but don't add yet
                    rows.push(cells);
                    headerProcessed = true;
                } else {
                    rows.push(cells);
                }
            }
        }

        if (rows.length < 2) continue;

        const headerRow = rows[0];
        const dataRows = rows.slice(1);

        // Build HTML table
        let html = '<div class="chatbot-table-wrapper"><table class="chatbot-table">';

        // Header (bold)
        html += '<thead><tr>';
        headerRow.forEach(cell => {
            html += `<th><strong>${cell}</strong></th>`;
        });
        html += '</tr></thead>';

        // Body
        html += '<tbody>';
        dataRows.forEach(row => {
            html += '<tr>';
            row.forEach((cell, idx) => {
                if (idx < headerRow.length) {
                    html += `<td>${cell}</td>`;
                }
            });
            html += '</tr>';
        });
        html += '</tbody></table></div>';

        // Replace in result
        const tableText = tableLines.join('\n');
        result = result.replace(tableText, html);
    }

    return result;
}

function renderMessage(text: string): string {
    // Step 0: Clean markdown artifacts first
    let processed = cleanMarkdownArtifacts(text);

    // Step 1: Parse markdown tables
    processed = parseMarkdownTable(processed);

    // Step 2: Unescape common JSON/string escape sequences
    processed = processed
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .replace(/\\'/g, "'")
        .replace(/\\\\/g, '\\');

    // Step 3: Convert **bold** to <strong>
    processed = processed.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Step 4: Convert markdown links [text](url) → text
    processed = processed.replace(/\[(.+?)\]\((.+?)\)/g, '$1');

    // Step 5: Convert bullet points
    processed = processed.replace(/^[-•]\s+/gm, '• ');

    // Step 6: Clean up multiple spaces and newlines
    processed = processed.replace(/ +/g, ' ');
    processed = processed.replace(/\n{3,}/g, '\n\n');

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
