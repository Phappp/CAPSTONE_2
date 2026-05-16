import crypto from 'crypto';
import { DataSource } from 'typeorm';
import AppDataSource from '../../../../../lib/database';
import OpenRouterKey from '../../../../../internal/model/openrouter_key';
import OpenRouterSetting from '../../../../../internal/model/openrouter_setting';

export class OpenRouterClient {
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
        const iv = Buffer.from(ivHex, 'hex');
        const encrypted = Buffer.from(encryptedHex, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', this.getEncryptionKey(), iv);
        const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
        return decrypted.toString('utf8');
    }

    async chat(messages: Array<{ role: string; content: string }>): Promise<string> {
        const settingRepo = this.dataSource.getRepository(OpenRouterSetting);
        const keyRepo = this.dataSource.getRepository(OpenRouterKey);

        const settings = await settingRepo.findOne({ where: {} });
        const model =
            String(settings?.default_model || '').trim() ||
            (Array.isArray(settings?.models) && settings?.models.length ? String(settings.models[0]) : '') ||
            'openai/gpt-4o-mini';

        const now = new Date();
        const keys = await keyRepo.find({
            where: { is_active: true } as any,
            order: { last_used_at: 'ASC', id: 'ASC' } as any,
        });

        const picked = keys.find((k) => !k.cooldown_until || new Date(k.cooldown_until) <= now);
        if (!picked) {
            throw new Error('Khong co OpenRouter key kha dung. Hay kiem tra tab Admin > Keys.');
        }

        const apiKey = this.decryptKey(String((picked as any).key_encrypted || ''));
        if (!apiKey) throw new Error('Khong the giai ma OpenRouter key.');

        console.log(`[Chatbot] Model: ${model}, KeyID: ${picked.id}`);

        try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': process.env.APP_URL || 'https://e-learning.com',
                    'X-Title': process.env.APP_NAME || 'e-Learning Platform',
                },
                body: JSON.stringify({
                    model,
                    messages,
                    temperature: 0.3,
                    max_tokens: 2000,
                    response_format: { type: 'json_object' },
                }),
            });

            if (!response.ok) {
                const raw = await response.text();
                console.error(`[Chatbot] OpenRouter error ${response.status}: ${raw?.slice(0, 200)}`);
                throw new Error(`OpenRouter loi HTTP ${response.status}`);
            }

            const data: any = await response.json();
            const content = data?.choices?.[0]?.message?.content;
            if (!content) throw new Error('OpenRouter khong tra ve noi dung.');

            (picked as any).last_used_at = new Date();
            await keyRepo.save(picked as any);

            return content;
        } catch (error: any) {
            (picked as any).last_error_at = new Date();
            (picked as any).error_count = Number((picked as any).error_count || 0) + 1;
            await keyRepo.save(picked as any);
            throw error;
        }
    }
}
