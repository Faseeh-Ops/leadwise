import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  requireAuth,
} from '../middleware/auth';
import { env } from '../config/env';

const router = Router();

const COOKIE_OPTIONS_ACCESS = {
  httpOnly: true,
  sameSite: 'strict' as const,
  secure: env.NODE_ENV === 'production',
  maxAge: 15 * 60 * 1000,
  path: '/',
};

const COOKIE_OPTIONS_REFRESH = {
  httpOnly: true,
  sameSite: 'strict' as const,
  secure: env.NODE_ENV === 'production',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/',
};

const LoginSchema = z.object({
  username: z.string().min(1).max(100),
  password: z.string().min(1).max(200),
});

router.post('/login', validate(LoginSchema), async (req: Request, res: Response) => {
  const { username, password } = req.body as z.infer<typeof LoginSchema>;

  if (username !== env.ADMIN_USERNAME) {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
    return;
  }

  const isValid = await bcrypt.compare(password, env.ADMIN_PASSWORD_HASH);
  if (!isValid) {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
    return;
  }

  const payload = { sub: 'admin', username };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  res
    .cookie('access_token', accessToken, COOKIE_OPTIONS_ACCESS)
    .cookie('refresh_token', refreshToken, COOKIE_OPTIONS_REFRESH)
    .json({ success: true, user: { username } });
});

router.post('/refresh', (req: Request, res: Response) => {
  const token: string | undefined = req.cookies?.refresh_token;
  if (!token) {
    res.status(401).json({ success: false, message: 'No refresh token' });
    return;
  }

  try {
    const payload = verifyRefreshToken(token);
    const newAccessToken = signAccessToken({ sub: payload.sub, username: payload.username });
    const newRefreshToken = signRefreshToken({ sub: payload.sub, username: payload.username });

    res
      .cookie('access_token', newAccessToken, COOKIE_OPTIONS_ACCESS)
      .cookie('refresh_token', newRefreshToken, COOKIE_OPTIONS_REFRESH)
      .json({ success: true });
  } catch {
    res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
});

router.post('/logout', (_req: Request, res: Response) => {
  res
    .clearCookie('access_token', { path: '/' })
    .clearCookie('refresh_token', { path: '/' })
    .json({ success: true });
});

router.get('/me', requireAuth, (req: Request, res: Response) => {
  res.json({ success: true, user: req.user });
});

export default router;
