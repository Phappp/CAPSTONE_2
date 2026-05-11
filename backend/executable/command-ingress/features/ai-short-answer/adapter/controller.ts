import express, { Request, Response, NextFunction } from 'express';
import requireAuthorizedUser from '../../../middlewares/auth';

export class AiShortAnswerController {
  async generateShortAnswerQuestions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const uid = Number((req as any).user?.sub);
      if (!uid || Number.isNaN(uid)) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { topic, count = 5, extra_instructions = '' } = req.body || {};
      if (!topic || !String(topic).trim()) {
        res.status(400).json({ error: 'Vui lòng nhập chủ đề.' });
        return;
      }

      const questionCount = Math.max(1, Math.min(20, Number(count) || 5));
      const userPrompt = [
        `Hãy tạo ${questionCount} câu hỏi trả lời ngắn theo format JSON sau:`,
        '{ "questions": ["câu hỏi 1", "câu hỏi 2", ...] }',
        `Chủ đề: ${String(topic).trim()}`,
        '- Câu hỏi ngắn gọn, rõ ràng, yêu cầu học viên trả lời trong 1-3 câu.',
        '- Trả nội dung tiếng Việt.',
        extra_instructions ? `- Yêu cầu bổ sung: ${String(extra_instructions).trim()}` : '',
        'Trả về DUY NHẤT JSON object hợp lệ. Không markdown, không giải thích.',
      ].filter(Boolean).join('\n');

      const systemPrompt = 'Bạn là trợ lý tạo câu hỏi cho LMS. Trả về DUY NHẤT 1 JSON object hợp lệ. Không markdown, không code block, không giải thích, không chữ nào khác ngoài JSON.';

      // Use environment variable for API key
      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        res.status(503).json({ error: 'OpenRouter API key chưa được cấu hình (OPENROUTER_API_KEY).' });
        return;
      }

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'openai/gpt-4o-mini',
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.6,
        }),
      });

      if (!response.ok) {
        const raw = await response.text();
        res.status(502).json({ error: `OpenRouter lỗi: ${raw?.slice(0, 200)}` });
        return;
      }

      const data: any = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      if (!content) {
        res.status(502).json({ error: 'OpenRouter không trả về nội dung.' });
        return;
      }

      let parsed: any = null;
      try {
        const cleaned = String(content).replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
        parsed = JSON.parse(cleaned);
      } catch {
        res.status(502).json({ error: 'Không parse được JSON từ AI.' });
        return;
      }

      const questions: string[] = Array.isArray(parsed?.questions) ? parsed.questions : [];
      if (!questions.length) {
        res.status(502).json({ error: 'AI không trả về câu hỏi nào.' });
        return;
      }

      res.status(200).json({ success: true, questions: questions.slice(0, questionCount) });
    } catch (err) {
      next(err);
    }
  }
}
