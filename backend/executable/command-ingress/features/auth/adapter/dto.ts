import { IsEmail, Length, MinLength, ValidationError } from 'class-validator';
import { ValidationResult } from '../../../shared/validation';
import { RequestDto } from '../../../shared/request-dto';

export class ExchangeGoogleTokenBody extends RequestDto {
  @Length(1)
  code: string;

  constructor(body: any) {
    super();
    if (body && body.code) {
      this.code = String(body.code);
    }
  }
}

export class RegisterRequestBody extends RequestDto {
  @IsEmail()
  email: string;

  @Length(1, 255)
  fullName: string;

  @MinLength(6)
  password: string;

  // 'learner' hoặc 'course_manager'
  @Length(1, 50)
  role: string;

  constructor(body: any) {
    super();
    if (body) {
      this.email = String(body.email || '');
      this.fullName = String(body.full_name || body.fullName || '');
      this.password = String(body.password || '');
      this.role = String(body.role || 'learner');
    }
  }
}

export class LoginRequestBody extends RequestDto {
  @IsEmail()
  email: string;

  @MinLength(6)
  password: string;

  constructor(body: any) {
    super();
    if (body) {
      this.email = String(body.email || '');
      this.password = String(body.password || '');
    }
  }
}

export class VerifyOtpRequestBody extends RequestDto {
  @IsEmail()
  email: string;

  @Length(4, 10)
  code: string;

  constructor(body: any) {
    super();
    if (body) {
      this.email = String(body.email || '');
      this.code = String(body.code || '');
    }
  }
}

export class LogoutRequestBody extends RequestDto {
  constructor(body: any) {
    super();
    console.log('45: ', body);
    if (body && body.refresh_token) {
      this.refreshToken = String(body.refresh_token);
    }
  }

  @Length(1)
  refreshToken: string;
}

export class RefreshTokenRequestBody extends RequestDto {
  constructor(body: any) {
    super();
    if (body && body.refresh_token) {
      this.refreshToken = body.refresh_token;
    }
  }

  @Length(1)
  refreshToken: string;

  async validate(): Promise<ValidationResult> {
    const result = await super.validate();
    if (!result.ok) {
      return result;
    }

    // Adding another logic, token must have three parts, which are seprated by a dot.
    const parts = this.refreshToken.split('.');
    if (parts.length != 3) {
      const tokenInvalidError = new ValidationError();
      tokenInvalidError.constraints = {
        'jsonwebtoken': 'Invalid JSON Web Token format',
      };

      return {
        ok: false,
        errors: [tokenInvalidError],
      };
    }

    return {
      ok: true,
      errors: [],
    }
  }
}