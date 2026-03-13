import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { invokeFunction } from '../lib/base44Client.js';

const router = Router();

const APP_ID = process.env.BASE44_APP_ID;

/**
 * POST /proxy/functions/:functionName
 * Proxy frontend requests to Base44 backend functions.
 * Adds server-side auth so the frontend doesn't need raw API keys.
 */
router.post('/functions/:functionName', requireAuth, async (req, res, next) => {
  try {
    const { functionName } = req.params;
    const result = await invokeFunction(APP_ID, functionName, {
      ...req.body,
      _caller_user_id: req.user?.id,
      _caller_email: req.user?.email,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;