import { DataSource } from 'typeorm';
import AppDataSource from '../../../../../lib/database';
import OpenRouterKey from '../../../../../internal/model/openrouter_key';
import OpenRouterSetting from '../../../../../internal/model/openrouter_setting';
import crypto from 'crypto';
import {
  GenerateShortAnswerPayload,
  GenerateShortAnswerResult,
} from './types';

export class AiShortAnswerServiceImpl {
  private dataSource: DataSource;

  constructor() {
    this.dataSource = AppDataSource;
  }

  private getEncryptionKey(): Buffer {
    const base = process.env.OPENROUTER_ENCRYPTION_SECRET || process.env.JWT_SECRET || 'mindbridge-openrouter-secret';
    return crypto.createHash('sha256').update(base).digest();
  }

  private decryptKey(payload: string): string {
    const [ivHex, encryptedHex] = String(payload || '').split(':');
    if (!ivHex || !encryptedHex) return '';
    try {
      const iv = Buffer.from(ivHex, 'hex');
      const encrypted = Buffer.from(encryptedHex, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', this.getEncryptionKey(), iv);
      const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
      return decrypted.toString('utf8');
    } catch {
      return '';
    }
  }

  private async pickActiveKey(): Promise<{ id: number; apiKey: string }> {
    const keyRepo = this.dataSource.getRepository(OpenRouterKey);
    const now = new Date();
    const keys = await keyRepo.find({
      where: { is_active: true } as any,
      order: { last_used_at: 'ASC', id: 'ASC' } as any,
    });
    const picked = keys.find((k) => !k.cooldown_until || new Date(k.cooldown_until) <= now);
    if (!picked) {
      throw new Error('Không có OpenRouter key khả dụng. Hãy kiểm tra tab Admin > Keys.');
    }
    const apiKey = this.decryptKey(String(picked.key_encrypted || ''));
    if (!apiKey) throw new Error('Không thể giải mã OpenRouter key.');
    return { id: picked.id, apiKey };
  }

  private async getModel(): Promise<string> {
    const settingRepo = this.dataSource.getRepository(OpenRouterSetting);
    const settings = await settingRepo.findOne({ where: {} });
    const model =
      String(settings?.default_model || '').trim() ||
      (Array.isArray(settings?.models) && settings?.models.length ? String(settings.models[0]) : '') ||
      'openai/gpt-4o-mini';
    return model;
  }

  private async recordKeySuccess(keyId: number): Promise<void> {
    const keyRepo = this.dataSource.getRepository(OpenRouterKey);
    const key = await keyRepo.findOne({ where: { id: keyId } as any });
    if (key) {
      (key as any).last_used_at = new Date();
      await keyRepo.save(key);
    }
  }

  private async recordKeyError(keyId: number): Promise<void> {
    const keyRepo = this.dataSource.getRepository(OpenRouterKey);
    const key = await keyRepo.findOne({ where: { id: keyId } as any });
    if (key) {
      (key as any).last_error_at = new Date();
      (key as any).error_count = Number((key as any).error_count || 0) + 1;
      await keyRepo.save(key);
    }
  }

  async generateShortAnswerQuestions(payload: GenerateShortAnswerPayload): Promise<GenerateShortAnswerResult> {
    const topic = String(payload.topic || '').trim();
    if (!topic) throw new Error('Vui lòng nhập chủ đề.');

    const questionCount = Math.max(1, Math.min(20, Number(payload.question_count) || 5));
    const model = await this.getModel();
    const { id: keyId, apiKey } = await this.pickActiveKey();

    const userPrompt = [
      `Hãy tạo ${questionCount} câu hỏi trả lời ngắn theo format JSON sau:`,
      '{ "questions": ["câu hỏi 1", "câu hỏi 2", ...] }',
      `Chủ đề: ${topic}`,
      '- Câu hỏi ngắn gọn, rõ ràng, yêu cầu học viên trả lời trong 1-3 câu.',
      '- Trả nội dung tiếng Việt.',
      payload.extra_instructions ? `- Yêu cầu bổ sung: ${String(payload.extra_instructions).trim()}` : '',
      'Trả về DUY NHẤT JSON object hợp lệ. Không markdown, không giải thích.',
    ].filter(Boolean).join('\n');

    const systemPrompt = 'Bạn là trợ lý tạo câu hỏi cho LMS. Trả về DUY NHẤT 1 JSON object hợp lệ. Không markdown, không code block, không giải thích, không chữ nào khác ngoài JSON.';

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
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
        await this.recordKeyError(keyId);
        throw new Error(`OpenRouter lỗi HTTP ${response.status}: ${raw?.slice(0, 180) || 'Unknown error'}`);
      }

      const data: any = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      if (!content) throw new Error('OpenRouter không trả về nội dung.');

      let parsed: any = null;
      try {
        const cleaned = String(content).replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
        parsed = JSON.parse(cleaned);
      } catch {
        throw new Error('Không parse được JSON từ AI.');
      }

      const rawQuestions: string[] = Array.isArray(parsed?.questions) ? parsed.questions : [];
      if (!rawQuestions.length) throw new Error('AI không trả về câu hỏi nào.');

      await this.recordKeySuccess(keyId);

      return {
        questions: rawQuestions.slice(0, questionCount).map((q) => ({ question_text: q })),
        model,
        usedKeyId: keyId,
      };
    } catch (error) {
      await this.recordKeyError(keyId);
      throw error;
    }
  }
}
