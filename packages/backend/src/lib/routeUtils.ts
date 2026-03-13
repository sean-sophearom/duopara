import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth.js';

/**
 * Wraps an async route handler with standardized error handling:
 * - Zod validation errors → 400 with details
 * - Other errors → 500 with logged error
 */
export function asyncHandler(
  handler: (req: AuthRequest, res: Response, next: NextFunction) => Promise<any>,
  errorMessage = 'Internal server error'
) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid input', details: error.errors });
      }
      console.error(`${errorMessage}:`, error);
      res.status(500).json({ error: errorMessage });
    }
  };
}
