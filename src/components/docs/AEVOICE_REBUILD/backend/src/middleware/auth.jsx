import jwt from 'jsonwebtoken';
import { getMe } from '../lib/base44Client.js';

const JWT_SECRET = process.env.JWT_SECRET || 'aevoice-dev-jwt-secret';

/**
 * Require authenticated user.
 * Accepts either a Base44 bearer token or a locally-issued JWT.
 */
export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    // Try local JWT first (issued by our backend on login)
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      req.user = payload;
      return next();
    } catch {
      // Not a local JWT — treat as a Base44 bearer token
    }

    // Verify with Base44
    const user = await getMe(token);
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized', detail: err.message });
  }
}

/**
 * Require admin role.
 */
export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }
  next();
}

/**
 * Issue a short-lived local JWT for session persistence.
 */
export function issueToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, full_name: user.full_name },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}