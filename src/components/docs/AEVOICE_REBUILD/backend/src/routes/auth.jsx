import { Router } from 'express';
import { getMe } from '../lib/base44Client.js';
import { requireAuth, issueToken } from '../middleware/auth.js';

const router = Router();

/**
 * GET /auth/me
 * Returns the authenticated user profile.
 * Expects: Authorization: Bearer <token>
 */
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

/**
 * POST /auth/session
 * Exchange a Base44 bearer token for a local JWT session.
 * Body: { token: string }
 */
router.post('/session', async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'token is required' });

    const user = await getMe(token);
    const sessionToken = issueToken(user);

    res.json({ user, token: sessionToken });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /auth/logout
 * Clears any server-side session.
 */
router.post('/logout', (req, res) => {
  req.session?.destroy?.();
  res.json({ success: true });
});

export default router;