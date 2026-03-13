// ── Core User Types ────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'user' | 'agency_owner' | 'agency_manager';
  client_id?: string;
  data?: Record<string, unknown>;
}

// ── Agent ──────────────────────────────────────────────────────────────────────

export interface Agent {
  id: string;
  client_id: string;
  name: string;
  description?: string;
  agent_type: 'receptionist' | 'sales' | 'support' | 'appointment' | 'general' | 'site_assistant';
  system_prompt: string;
  greeting_message?: string;
  voice_provider?: string;
  voice_id?: string;
  language?: string;
  status: 'active' | 'inactive' | 'draft';
  created_date?: string;
  updated_date?: string;
}

// ── Knowledge Base ─────────────────────────────────────────────────────────────

export interface KnowledgeBase {
  id: string;
  client_id: string;
  name: string;
  description?: string;
  type: 'faq' | 'documents' | 'website' | 'api' | 'mixed';
  status: 'active' | 'processing' | 'error' | 'inactive' | 'reindexing';
  chunk_count: number;
  total_words: number;
  last_synced_at?: string;
  created_date?: string;
}

// ── Client / Tenant ────────────────────────────────────────────────────────────

export interface Client {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended' | 'pending' | 'churned';
  account_type: string;
  contact_email?: string;
  contact_phone?: string;
}

// ── API Responses ──────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success?: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ── Session ────────────────────────────────────────────────────────────────────

export interface SessionState {
  user: User | null;
  client: Client | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}