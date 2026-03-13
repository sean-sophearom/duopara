import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_EXPIRY } from '../lib/constants.js';

export interface AuthRequest extends Request {
  userId?: string;
}

export interface JwtPayload {
  userId: string;
  email: string;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not configured');
  return secret;
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  // Try Authorization header first, then fall back to httpOnly cookie
  let token: string | undefined;
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.cookies?.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const payload = jwt.verify(token, getJwtSecret()) as JwtPayload;
    req.userId = payload.userId;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function generateToken(userId: string, email: string): string {
  return jwt.sign(
    { userId, email } as JwtPayload,
    getJwtSecret(),
    { expiresIn: JWT_EXPIRY }
  );
}
