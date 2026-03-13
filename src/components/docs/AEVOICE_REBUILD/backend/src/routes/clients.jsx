import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getClient } from '../lib/base44Client.js';

const router = Router();

/**
 * GET /clients/:clientId
 * Returns client/tenant data.
 */
router.get('/:clientId', requireAuth, async (req, res, next) => {
  try {
    const client = await getClient(req.params.clientId);
    res.json({ client });
  } catch (err) {
    next(err);
  }
});

export default router;