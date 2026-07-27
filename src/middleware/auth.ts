import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface AuthPayload { sub: number; role: string; admin?: boolean }

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ success: false, message: 'Authentication required' });
  try {
    (req as Request & { auth: AuthPayload }).auth = jwt.verify(token, env.JWT_SECRET) as unknown as AuthPayload;
    return next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  return requireAuth(req, res, () => {
    const auth = (req as Request & { auth: AuthPayload }).auth;
    if (!auth.admin) return res.status(403).json({ success: false, message: 'Admin access required' });
    next();
  });
}
