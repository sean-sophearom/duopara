import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticate, generateToken, AuthRequest } from '../middleware/auth.js';
import { asyncHandler } from '../lib/routeUtils.js';
import { BCRYPT_SALT_ROUNDS } from '../lib/constants.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
};

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional()
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

const formatUser = (user: { id: string; email: string; name: string | null; settings: any }) => ({
  id: user.id, email: user.email, name: user.name, settings: user.settings
});

// Register
authRouter.post('/register', asyncHandler(async (req, res) => {
  if (process.env.REGISTRATION_DISABLED === 'true') {
    return res.status(503).json({ error: 'Registration is currently disabled for maintenance. Please try again later.' });
  }
  const { email, password, name } = registerSchema.parse(req.body);
  
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) return res.status(400).json({ error: 'Email already registered' });

  const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  const user = await prisma.user.create({
    data: { email, passwordHash, name, settings: { create: {} } },
    include: { settings: true }
  });

  const token = generateToken(user.id, user.email);
  res.cookie('token', token, COOKIE_OPTIONS);
  res.status(201).json({ user: formatUser(user), token });
}, 'Registration failed'));

// Login
authRouter.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email }, include: { settings: true } });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const validPassword = await bcrypt.compare(password, user.passwordHash);
  if (!validPassword) return res.status(401).json({ error: 'Invalid credentials' });

  const token = generateToken(user.id, user.email);
  res.cookie('token', token, COOKIE_OPTIONS);
  res.json({ user: formatUser(user), token });
}, 'Login failed'));

// Get current user
authRouter.get('/me', authenticate, asyncHandler(async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    include: { settings: true }
  });
  if (!user) return res.status(404).json({ error: 'User not found' });

  res.json({ user: formatUser(user) });
}, 'Failed to get user'));

// Logout (clear httpOnly cookie)
authRouter.post('/logout', (_req, res) => {
  res.clearCookie('token', { path: '/' });
  res.json({ success: true });
});
