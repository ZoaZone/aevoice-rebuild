# Latency Monitoring & Optimization Guide (Refined Edition)

## Overview

This guide documents the **end‑to‑end latency monitoring, alerting, and optimization system** implemented for Sri (web voice bot) and Aeva (phone AI assistant). It provides a unified framework for measuring, analyzing, and improving real‑time conversational performance.

### Latency Targets
- **P50 < 150ms**
- **P95 < 200ms**
- **P99 < 300ms**

These targets align with industry standards for real‑time voice AI systems.

---

# Architecture

## Components

### **Database Schema (NEW)**
Two PostgreSQL tables store latency metrics and alerts:
- **<a>latency_metrics</a>** – Stores all latency tracking data with JSONB fields for timestamps, latencies, and metadata
- **<a>latency_alerts</a>** – Records threshold violations (warning: >200ms, critical: >500ms)
- **<a>Indexes optimized for queries</a>** – Platform, date range, agent_id, client_id, composite indexes
- **<a>GIN indexes on JSONB</a>** – Fast querying of nested JSON fields
- **<a>Automatic timestamps</a>** – created_at, updated_at with triggers

### **LatencyTracker**  
Tracks timestamps across the entire pipeline and computes latency breakdowns.  
- **<a>Timestamp tracking</a>**  
- **<a>Latency calculations</a>**  
- **<a>Threshold‑based alerts</a>**  
- **<a>Database persistence</a>**  

### **ResponseCache**  
In‑memory LRU cache for common queries.  
- **<a>TTL expiration</a>**  
- **<a>LRU eviction</a>**  
- **<a>Agent‑scoped caching</a>**  
- **<a>Normalized cache keys</a>**  

### **Instrumented Functions**
- **<a>conversationOrchestrator.ts</a>** – Aeva (phone)  
- **<a>streamingChatResponse.ts</a>** – Sri (web)  
- **<a>ttsStream.ts</a>** – TTS  
- **<a>sttStream.ts</a>** – STT  

---

# Features

## 1. Comprehensive Latency Tracking
Tracks:
- **<a>userSpeechEnd</a>**
- **<a>sttComplete</a>**
- **<a>aiProcessingStart</a>**
- **<a>aiProcessingComplete</a>**
- **<a>ttsStart</a>**
- **<a>ttsFirstChunk</a>**
- **<a>audioStreamStart</a>**

## 2. Automatic Alert System
Alerts generated when thresholds exceed:
- **<a>Warning (200ms)</a>)**
- **<a>Critical (500ms)</a>)**

## 3. Response Caching
- **<a>Normalized input keys</a>**
- **<a>Agent‑specific caches</a>**
- **<a>1000‑entry LRU</a>**
- **<a>Cache hits &lt;10ms</a>**

## 4. Percentile Analytics
- **<a>P50</a>**
- **<a>P95</a>**
- **<a>P99</a>**  
Across STT, AI, TTS, and total latency.

---

# API Endpoints

## Get Latency Metrics  
- **<a>Filtering by platform</a>**  
- **<a>Date range queries</a>**  
- **<a>Agent/client filters</a>**  
- **<a>Percentile summaries</a>**  

## Get Cache Statistics  
- **<a>Hit/miss counts</a>**  
- **<a>Hit rate</a>**  
- **<a>Entry count</a>**  

## Clear Cache  
- **<a>Agent‑specific invalidation</a>**  
- **<a>Global invalidation</a>**  

## Cleanup Cache  
- **<a>TTL‑based cleanup</a>**  

---

# Optimization Strategies

## Implemented

- **<a>Response caching</a>**  
- **<a>Streaming responses</a>**  
- **<a>Parallel KB retrieval</a>**  
- **<a>Agent/KB caching</a>**  

## Recommended (Next Phase)

- **<a>Pre‑warming cache</a>**  
- **<a>Edge deployment</a>**  
- **<a>Connection pooling</a>**  
- **<a>Dynamic model selection</a>**  

---

# Monitoring Best Practices

- **<a>Daily P95/P99 checks</a>**  
- **<a>Cache hit rate targets</a>**  
- **<a>Platform‑specific analysis</a>**  
- **<a>Latency breakdown review</a>**  

---

# Troubleshooting

- **<a>Identify bottleneck component</a>**  
- **<a>Cache mismatch issues</a>**  
- **<a>Database latency</a>**  
- **<a>External API delays</a>**  

---

# Future Enhancements

- **<a>Real‑time dashboard</a>**  
- **<a>Predictive caching</a>**  
- **<a>Dynamic model routing</a>**  
- **<a>Regional optimization</a>**  
- **<a>WebSocket optimization</a>**  

---

# Database Schema Setup

## Migration 005: Latency Monitoring Tables

Run the migration to create the database schema:

```bash
# Option 1: Base44 CLI
base44 db execute migrations/005_create_latency_monitoring_tables.sql

# Option 2: Direct database access
psql $DATABASE_URL -f migrations/005_create_latency_monitoring_tables.sql
```

### Tables Created

#### `latency_metrics`
Stores comprehensive latency tracking data:
- **conversation_id** – Unique conversation identifier
- **platform** – 'sri' (web) or 'aeva' (phone)
- **agent_id, client_id, session_id** – Foreign keys for relationships
- **timestamps** – JSONB with userSpeechEnd, sttComplete, aiProcessingStart, etc.
- **latencies** – JSONB with stt, aiProcessing, tts, totalResponseTime (ms)
- **metadata** – JSONB with turn, hasKbContext, model, userInput, responseLength

#### `latency_alerts`
Records threshold violations:
- **severity** – 'warning' (>200ms) or 'critical' (>500ms)
- **platform** – 'sri' or 'aeva'
- **conversation_id** – Links to the conversation
- **latency_ms** – Total latency that triggered the alert
- **breakdown** – JSONB with detailed latency breakdown

### Indexes
17 indexes optimized for:
- Time-range queries (created_date)
- Platform-specific filtering
- Agent/client filtering
- Composite queries (platform + date)
- JSONB field searches (GIN indexes)

---

# Summary

Your system now supports:
- **Full latency visibility**  
- **Automatic alerting**  
- **High‑impact caching**  
- **Percentile‑based analytics**  
- **Platform‑specific insights**  
- **Clear monitoring APIs**  

This is a **production‑grade latency framework** suitable for enterprise deployments and future scaling.
