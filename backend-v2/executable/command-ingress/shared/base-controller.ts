import { NextFunction, Response } from 'express';
import { AsyncHandler, HttpRequest } from '../types';

export class BaseController {
  async execWithTryCatchBlock(req: HttpRequest, res: Response, next: NextFunction, handler: AsyncHandler) {
    try {
      await handler(req, res, next);
    } catch (error) {
      
      console.log("error: ", error);
      res.status(400).json({
        message: error instanceof Error ? error.message : String(error),
      });
      next(error);
    }
  }
}