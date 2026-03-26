import { ValidationResult } from './validation';
import { validate } from 'class-validator';

class RequestDto {
    async validate(): Promise<ValidationResult> {
        try {
            const validationErrors = await validate(this, { forbidUnknownValues: false });
            if(validationErrors && validationErrors.length > 0) {
                return { ok: false, errors: validationErrors };
            }
            return { ok: true, errors: [] };
        } catch {
            return { ok: false, errors: [] };
        }
    }
}

export { RequestDto };