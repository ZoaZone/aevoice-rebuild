import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import {
  listEntities,
  getEntity,
  createEntity,
  updateEntity,
  deleteEntity,
} from '../lib/base44Client.js';

const router = Router();

// Base route: /apps/:appId/entities/:entityName

/**
 * GET /apps/:appId/entities/:entityName
 * List all records of the given entity.
 * Supports query params as filters.
 */
router.get('/:appId/entities/:entityName', requireAuth, async (req, res, next) => {
  try {
    const { appId, entityName } = req.params;
    const data = await listEntities(appId, entityName, req.query);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /apps/:appId/entities/:entityName/:id
 * Get a single entity record by ID.
 */
router.get('/:appId/entities/:entityName/:id', requireAuth, async (req, res, next) => {
  try {
    const { appId, entityName, id } = req.params;
    const data = await getEntity(appId, entityName, id);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /apps/:appId/entities/:entityName
 * Create a new entity record.
 */
router.post('/:appId/entities/:entityName', requireAuth, async (req, res, next) => {
  try {
    const { appId, entityName } = req.params;
    const data = await createEntity(appId, entityName, req.body);
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /apps/:appId/entities/:entityName/:id
 * Update an entity record by ID.
 */
router.put('/:appId/entities/:entityName/:id', requireAuth, async (req, res, next) => {
  try {
    const { appId, entityName, id } = req.params;
    const data = await updateEntity(appId, entityName, id, req.body);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /apps/:appId/entities/:entityName/:id
 * Delete an entity record by ID.
 */
router.delete('/:appId/entities/:entityName/:id', requireAuth, async (req, res, next) => {
  try {
    const { appId, entityName, id } = req.params;
    await deleteEntity(appId, entityName, id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;