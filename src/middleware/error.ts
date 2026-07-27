import { NextFunction, Request, Response } from 'express';
import { MulterError } from 'multer';
import { env } from '../config/env';

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ success: false, message: 'Route not found' });
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  const declared = typeof error === 'object' && error && 'status' in error ? Number((error as { status: number }).status) : 0;
  const status = error instanceof MulterError ? 400 : declared >= 400 && declared < 600 ? declared : 500;
  const message = error instanceof Error ? error.message : 'Unexpected server error';
  res.status(status).json({
    success: false,
    message: env.NODE_ENV === 'production' && status === 500 ? 'Unexpected server error' : message
  });
}
