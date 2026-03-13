/**
 * Shared TypeScript types used across backend (if using TS) and frontend.
 * Import in frontend with: import type { Agent } from '@aevoice/shared/types';
 */

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'user' | 'agency_owner' | 'agency_manager';
  client_id?: string;
}

export interface Client {
  id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended' | 'pending' | 'churned';
  account_type: string;
  contact_email?: string;
  contact_phone?: string;
  industry?: string;
  timezone?: string;
}

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
  language: string;
  status: 'active' | 'inactive' | 'draft';
  created_date?: string;
  updated_date?: string;
}

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

export interface CallSession {
  id: string;
  client_id: string;
  agent_id: string;
  direction: 'inbound' | 'outbound';
  channel: 'voice' | 'sms' | 'web_chat' | 'whatsapp' | 'email';
  from_number?: string;
  to_number?: string;
  duration_seconds?: number;
  status: 'in_progress' | 'completed' | 'failed' | 'no_answer' | 'busy' | 'transferred';
  transcript?: string;
  summary?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  started_at?: string;
  ended_at?: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}