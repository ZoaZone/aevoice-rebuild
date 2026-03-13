/**
 * Backend Base44 API Client
 * Makes authenticated server-to-server calls to the Base44 platform.
 */

const BASE_URL = process.env.BASE44_APP_BASE_URL || 'https://api.base44.com';
const APP_ID   = process.env.BASE44_APP_ID;
const API_KEY  = process.env.BASE44_API_KEY;

if (!APP_ID)  console.warn('[Base44Client] BASE44_APP_ID not set');
if (!API_KEY) console.warn('[Base44Client] BASE44_API_KEY not set');

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
      'X-App-ID': APP_ID,
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Base44 API error ${res.status}: ${body}`);
  }

  return res.json();
}

// ── Auth ───────────────────────────────────────────────────────────────────────

export async function getMe(bearerToken) {
  return request('/auth/me', {
    headers: { Authorization: `Bearer ${bearerToken}` },
  });
}

// ── Clients ────────────────────────────────────────────────────────────────────

export async function getClient(clientId) {
  return request(`/clients/${clientId}`);
}

// ── Entities ───────────────────────────────────────────────────────────────────

export async function listEntities(appId, entityName, filters = {}) {
  const params = new URLSearchParams(filters).toString();
  return request(`/apps/${appId}/entities/${entityName}?${params}`);
}

export async function getEntity(appId, entityName, id) {
  return request(`/apps/${appId}/entities/${entityName}/${id}`);
}

export async function createEntity(appId, entityName, data) {
  return request(`/apps/${appId}/entities/${entityName}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateEntity(appId, entityName, id, data) {
  return request(`/apps/${appId}/entities/${entityName}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteEntity(appId, entityName, id) {
  return request(`/apps/${appId}/entities/${entityName}/${id}`, {
    method: 'DELETE',
  });
}

// ── Functions ──────────────────────────────────────────────────────────────────

export async function invokeFunction(appId, functionName, payload = {}) {
  return request(`/apps/${appId}/functions/${functionName}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export default {
  getMe,
  getClient,
  listEntities,
  getEntity,
  createEntity,
  updateEntity,
  deleteEntity,
  invokeFunction,
};