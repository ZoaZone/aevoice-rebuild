/**
 * Frontend Base44 API Client (Pure JavaScript / JSX compatible)
 * All API calls go through the backend proxy — no secrets exposed to frontend.
 */
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

class Base44Client {
  constructor() {
    this._token = null;

    this.http = axios.create({
      baseURL: API_BASE,
      withCredentials: true,
      timeout: 30_000,
      headers: { 'Content-Type': 'application/json' },
    });

    // Attach token to every request
    this.http.interceptors.request.use((config) => {
      if (this._token) {
        config.headers.Authorization = `Bearer ${this._token}`;
      }
      return config;
    });

    // Global error normalizer
    this.http.interceptors.response.use(
      (res) => res,
      (err) => {
        const message = err.response?.data?.error || err.message || 'Request failed';
        return Promise.reject(new Error(message));
      }
    );

    // Restore token from localStorage on init
    const stored = localStorage.getItem('aevoice_token');
    if (stored) this._token = stored;
  }

  // ── Token Management ──────────────────────────────────────────────────────────

  setToken(token) {
    this._token = token;
    if (token) {
      localStorage.setItem('aevoice_token', token);
    } else {
      localStorage.removeItem('aevoice_token');
    }
  }

  getToken() {
    return this._token;
  }

  isAuthenticated() {
    return Boolean(this._token);
  }

  // ── Auth ──────────────────────────────────────────────────────────────────────

  async me() {
    const res = await this.http.get('/auth/me');
    return res.data.user;
  }

  async createSession(externalToken) {
    const res = await this.http.post('/auth/session', { token: externalToken });
    this.setToken(res.data.token);
    return res.data;
  }

  async logout() {
    await this.http.post('/auth/logout').catch(() => {});
    this.setToken(null);
  }

  // ── Clients ───────────────────────────────────────────────────────────────────

  async getClient(clientId) {
    const res = await this.http.get(`/clients/${clientId}`);
    return res.data.client;
  }

  // ── Entities ──────────────────────────────────────────────────────────────────

  get appId() {
    return import.meta.env.VITE_BASE44_APP_ID || '';
  }

  async listEntities(entityName, filters = {}) {
    const params = new URLSearchParams(filters).toString();
    const res = await this.http.get(
      `/apps/${this.appId}/entities/${entityName}${params ? `?${params}` : ''}`
    );
    return res.data;
  }

  async getEntity(entityName, id) {
    const res = await this.http.get(`/apps/${this.appId}/entities/${entityName}/${id}`);
    return res.data;
  }

  async createEntity(entityName, data) {
    const res = await this.http.post(`/apps/${this.appId}/entities/${entityName}`, data);
    return res.data;
  }

  async updateEntity(entityName, id, data) {
    const res = await this.http.put(`/apps/${this.appId}/entities/${entityName}/${id}`, data);
    return res.data;
  }

  async deleteEntity(entityName, id) {
    await this.http.delete(`/apps/${this.appId}/entities/${entityName}/${id}`);
  }

  // ── Functions (via proxy) ─────────────────────────────────────────────────────

  async invokeFunction(functionName, payload = {}) {
    const res = await this.http.post(`/proxy/functions/${functionName}`, payload);
    return res.data;
  }
}

// Singleton export
export const base44 = new Base44Client();
export default base44;