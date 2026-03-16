import { Response, Request, NextFunction } from 'express';
import env from '../../../utils/env';
import { AuthService } from '../types';
import {
  ExchangeGoogleTokenBody,
  LogoutRequestBody,
  RefreshTokenRequestBody,
  LoginRequestBody,
  RegisterRequestBody,
  VerifyOtpRequestBody,
} from './dto';
import { BaseController } from '../../../shared/base-controller';
import responseValidationError from '../../../shared/response';
import { HttpRequest } from '../../../types';



class AuthController extends BaseController {

  constructor(private readonly authService: AuthService) {
    super();
  }
  
  async exchangeGoogleToken(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res, _next) => {
      const exchangeGoogleTokenBody = new ExchangeGoogleTokenBody(req.query);

      const validateResult = await exchangeGoogleTokenBody.validate();
      if (!validateResult.ok) {
        responseValidationError(res, validateResult.errors[0]);
        return;
      }

      const exchangeResult = await this.authService.exchangeWithGoogleIDP({
        idp: 'google',
        code: exchangeGoogleTokenBody.code,
      });

      const params = new URLSearchParams({
        uid: exchangeResult.sub,
        access_token: exchangeResult.accessToken,
        refresh_token: exchangeResult.refreshToken
      });

      const redirectURL = `${env.CLIENT_URL}/oauth/redirect?${params.toString()}`;
      res.redirect(redirectURL);

      return;
    });
  }

  async login(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res, _next) => {
      const loginRequestBody = new LoginRequestBody(req.body);
      const validateResult = await loginRequestBody.validate();
      if (!validateResult.ok) {
        responseValidationError(res, validateResult.errors[0]);
        return;
      }

      const result = await this.authService.login({
        email: loginRequestBody.email,
        password: loginRequestBody.password,
      });

      res.status(200).json({
        access_token: result.accessToken,
        refresh_token: result.refreshToken,
        user: result.user,
      });
    });
  }

  async register(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res, _next) => {
      const body = new RegisterRequestBody(req.body);
      const validateResult = await body.validate();
      if (!validateResult.ok) {
        responseValidationError(res, validateResult.errors[0]);
        return;
      }

      await this.authService.register({
        email: body.email,
        password: body.password,
        fullName: body.fullName,
        role: body.role,
      });

      res.status(200).json({
        message: 'Đăng ký thành công. Vui lòng kiểm tra email để lấy mã OTP kích hoạt tài khoản.',
      });
    });
  }

  async verifyRegistrationOtp(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res, _next) => {
      const body = new VerifyOtpRequestBody(req.body);
      const validateResult = await body.validate();
      if (!validateResult.ok) {
        responseValidationError(res, validateResult.errors[0]);
        return;
      }

      const result = await this.authService.verifyRegistrationOtp(body.email, body.code);

      res.status(200).json({
        access_token: result.accessToken,
        refresh_token: result.refreshToken,
        user: result.user,
      });
    });
  }

  async logout(req: HttpRequest, res: Response, next: NextFunction): Promise<void> {
    await this.execWithTryCatchBlock(req, res, next, async (req, res, _next) => {
      const logoutRequestBody = new LogoutRequestBody(req.body);
      const validateResult = await logoutRequestBody.validate();
      if (!validateResult.ok) {
        responseValidationError(res, validateResult.errors[0]);
        return;
      }

      await this.authService.logout(logoutRequestBody.refreshToken);

      res.sendStatus(200);
      return;
    });
  }



  async refreshToken(req: Request, res: Response, _next: NextFunction): Promise<void> {
    const refreshTokenRequestBody = new RefreshTokenRequestBody(req.body);
    const validateResult = await refreshTokenRequestBody.validate();
    if (!validateResult.ok) {
      responseValidationError(res, validateResult.errors[0]);
      return;
    }

    const token = await this.authService.refreshToken(refreshTokenRequestBody.refreshToken);

    res.status(200).json({
      refresh_token: token.refreshToken,
      access_token: token.accessToken,
    });

    return;
  }

  verify2FA = async (req: HttpRequest, res: Response) => {
    try {
      const { email, code } = req.body;
      const result = await this.authService.verify2FA(email, code);
      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  };

}

export {
  AuthController,
};
