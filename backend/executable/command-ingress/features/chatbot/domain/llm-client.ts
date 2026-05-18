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

        if (keys.length === 0) {
            throw new Error('Khong co OpenRouter key kha dung. Hay kiem tra tab Admin > Keys.');
        }

        // Try each key with retry
        const MAX_RETRIES = 2;
        let lastError: Error | null = null;

        for (const key of keys) {
            const cooldownOk = !key.cooldown_until || new Date(key.cooldown_until) <= now;
            if (!cooldownOk) continue;

            const apiKey = this.decryptKey(String((key as any).key_encrypted || ''));
            if (!apiKey) continue;

            for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
                try {
                    console.log(`[Chatbot] Model: ${model}, KeyID: ${key.id}, Attempt: ${attempt + 1}`);

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
                        }),
                    });

                    if (!response.ok) {
                        const raw = await response.text();
                        console.error(`[Chatbot] OpenRouter error ${response.status}: ${raw?.slice(0, 200)}`);
                        throw new Error(`OpenRouter loi HTTP ${response.status}`);
                    }

                    const data: any = await response.json();
                    const content = data?.choices?.[0]?.message?.content;

                    if (!content) {
                        const errorDetail = data?.error?.message || data?.error?.type || JSON.stringify(data?.error || {});
                        console.error(`[Chatbot] OpenRouter empty response: ${errorDetail}`);
                        throw new Error(`OpenRouter khong tra ve noi dung: ${errorDetail}`);
                    }

                    (key as any).last_used_at = new Date();
                    await keyRepo.save(key as any);
                    return content;
                } catch (error: any) {
                    lastError = error;
                    console.error(`[Chatbot] Attempt ${attempt + 1} failed: ${error.message}`);
                    if (attempt < MAX_RETRIES) {
                        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
                    }
                }
            }

            // Mark key as having issues if all retries failed
            (key as any).last_error_at = new Date();
            (key as any).error_count = Number((key as any).error_count || 0) + 1;
            await keyRepo.save(key as any);
        }

        throw lastError || new Error('OpenRouter loi. Vui long thu lai sau.');
    }
}
