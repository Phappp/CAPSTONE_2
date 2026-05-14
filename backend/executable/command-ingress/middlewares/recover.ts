import { NextFunction, Request, Response } from 'express';
import env from '../utils/env';

const recoverMiddleware = (err: Error, req: Request, res: Response, _next: NextFunction) => {
  // eslint-disable-next-line no-console
  console.error('[recoverMiddleware]', {
    method: req.method,
    path: req.originalUrl,
    message: err?.message,
    stack: err?.stack,
  });

  res.status(500).json({
    error: 'internal server error',
    message: env.DEV ? (err?.message || 'unknown error') : undefined,
  });
};

export {
  recoverMiddleware,
};
