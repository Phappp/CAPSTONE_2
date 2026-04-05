import { NextFunction, Response } from 'express';
import env from '../utils/env';
import jwt from 'jsonwebtoken';
import { HttpRequest } from '../types';

const requireAuthorizedUser = (req: HttpRequest, res: Response, next: NextFunction) => {
  try {
    const bearerToken = req.headers['authorization'];
    const jwtToken = bearerToken?.split(' ')[1];

    if (!jwtToken) {
      res.sendStatus(401);
      return;
    }

    const payload = jwt.verify(jwtToken, env.JWT_SECRET) as jwt.JwtPayload;

    if (!payload.sub) {
      res.sendStatus(401);
      return;
    }

    req.getSubject = () => String(payload.sub);
    // (req as HttpRequest).getSubject = () => String(payload.sub);
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional auth middleware:
 * - If Authorization header is present and valid -> attach req.getSubject()
 * - If missing/invalid -> continue as unauthenticated (public route)
 */
export const optionalAuthorizedUser = (req: HttpRequest, _res: Response, next: NextFunction) => {
  try {
    const bearerToken = req.headers['authorization'];
    const jwtToken = bearerToken?.split(' ')[1];
    if (!jwtToken) return next();

    const payload = jwt.verify(jwtToken, env.JWT_SECRET) as jwt.JwtPayload;
    if (!payload?.sub) return next();

    req.getSubject = () => String(payload.sub);
    next();
  } catch {
    // Invalid token should not break public routes
    next();
  }
};

export default requireAuthorizedUser;
