# Aevathon Architecture

## Overview

**Aevathon** is an enterprise-grade, multitenant agentic platform and event operating system (Event OS) built on top of the AEVOICE AI voice automation platform. It provides unified agentic workflows, real-time observability through Mini Monitor, and subdomain-based routing for events, tenants, and teams.

Aevathon is designed for:
- **Hackathons**: Rapid deployment of AI assistants for event participants
- **Proof of Concepts (PoCs)**: Testing AI voice solutions before full deployment
- **Pilot Programs**: Limited-scale rollouts for enterprise customers
- **Tenant-Scoped Workspaces**: Isolated "Aevathon" environments per customer

---

## Layered Architecture

Aevathon follows a seven-layer architecture model that builds on top of AEVOICE's voice automation core:

### 1. Edge Routing Layer
- **Subdomain-based request routing**: Parses hostname to extract tenant, event, and team context
- **DNS resolution**: Routes `event-code.aevathon.example.com` and variants to appropriate handlers
- **Request context injection**: Adds `X-Tenant-ID`, `X-Event-ID`, `X-Team-ID` headers for downstream services
- **Load balancing**: Distributes traffic across Base44 edge functions

### 2. Tenant & Event Layer
- **Multi-tenant isolation**: Strict separation of data and resources per tenant
- **Event scoping**: Each Aevathon event operates as an independent workspace
- **Hierarchy model**: `Tenant → Workspace → Environment (dev/staging/prod) → Aevathon Event`
- **Access control**: Role-based permissions (admin, participant, viewer) per event

### 3. Agentic Engine Layer
- **Conversational orchestrator**: Manages multi-turn conversations with context
- **Safety classification**: Content filtering (safe/restricted/unsafe) with PII detection
- **Escalation logic**: Automatic and forced escalation to human agents
- **Latency budgeting**: Mode-aware timeouts (phone: 2s, web: 5s) with fallbacks

### 4. Voice & Telephony Core
- **Twilio integration**: Inbound/outbound calling with webhook handlers
- **BSNL WINGS SIP**: Enterprise SIP integration for telecom providers
- **Call session management**: Real-time tracking of call state and analytics
- **Multi-provider routing**: Automatic failover between telephony providers

### 5. Auto-Learning Knowledge Layer
- **Website scraping**: Automated content extraction from URLs
- **Vector embeddings**: OpenAI embeddings with semantic search
- **Knowledge scoping**: Private, shared, and global knowledge per agent
- **Real-time sync**: Cross-platform synchronization (AEVOICE ↔ HelloBiz)
- **Chunk limits**: Tiered limits (Regular: 100, White Glove: 500, Free Partner: unlimited)

### 6. Observability & Monitoring
- **Mini Monitor (Sree)**: Real-time dashboard for conversation metrics
- **Latency tracking**: Per-request timing for KB retrieval and LLM calls
- **Cost accounting**: Token usage and TTS character tracking
- **Error aggregation**: Centralized logging with request ID tracing

### 7. Admin & User Experience
- **Hostname-conditional rendering**: Different UIs for `aevathon.aevoice.ai` vs `app.aevoice.ai`
- **Quick Start wizard**: Guided onboarding for new Aevathon events
- **Widget deployment**: Embeddable voice assistants with branding customization
- **Analytics dashboards**: Event-level and tenant-level reporting

---

## Multi-Tenant Environment Model

### Hierarchy Structure

```
Organization (Tenant)
  └── Workspace
       └── Environment (dev / staging / prod)
            └── Aevathon Event
                 └── Teams (optional)
```

### Tenant Isolation

**Database Level:**
- All queries filtered by `tenant_id` and `event_id`
- Row-level security policies enforce isolation
- Foreign key constraints prevent cross-tenant access

**API Level:**
- Base44 SDK enforces user authentication
- Service role used only for system operations
- `tenantValidation.ts` utility validates ownership before modifications

**Frontend Level:**
- Hostname detection determines tenant context
- Navigation filtered per tenant permissions
- Client-side checks prevent unauthorized actions

### Environment Scoping

Each Aevathon event can exist in multiple environments:

| Environment | Purpose | Data Sync | URL Pattern |
|------------|---------|-----------|-------------|
| **Development** | Testing new features | Isolated | `dev.event-code.aevathon.example.com` |
| **Staging** | Pre-production validation | Mirrors prod schema | `staging.event-code.aevathon.example.com` |
| **Production** | Live event | Real-time | `event-code.aevathon.example.com` |

### Team-Based Segmentation

For large events, teams provide additional segmentation:

```
event-code.aevathon.example.com        → Main event admin
admin.event-code.aevathon.example.com  → Admin dashboard
plan.event-code.aevathon.example.com   → Event planning tools
team-alpha.event-code.aevathon.example.com → Team Alpha workspace
team-beta.event-code.aevathon.example.com  → Team Beta workspace
```

---

## Subdomain & DNS Routing

### Hostname Parsing Strategy

The ingress layer (Deno Edge Functions) parses the `Host` header to extract context:

**Pattern:**
```
[subdomain-type].[event-code].aevathon.[domain]
```

**Examples:**

| Hostname | Extracted Context |
|----------|------------------|
| `hackathon2026.aevathon.aevoice.ai` | Event: `hackathon2026`, Role: participant |
| `admin.hackathon2026.aevathon.aevoice.ai` | Event: `hackathon2026`, Role: admin |
| `plan.hackathon2026.aevathon.aevoice.ai` | Event: `hackathon2026`, Tool: planning |
| `team-alpha.hackathon2026.aevathon.aevoice.ai` | Event: `hackathon2026`, Team: `alpha` |

### Context Injection

Once parsed, the edge function injects headers for downstream services:

```http
X-Tenant-ID: tenant-uuid-from-event-mapping
X-Event-ID: hackathon2026
X-Team-ID: alpha (if team subdomain present)
X-User-Role: admin | participant | viewer
```

### Frontend Routing

**Utility:** `/src/utils/hostname.js`

```javascript
import { isAevathonHost, getBrandContext } from '@/utils/hostname';

// Detects if current hostname matches Aevathon patterns
const isAevathon = isAevathonHost(); // true/false

// Returns 'AEVOICE' or 'Aevathon'
const brand = getBrandContext();
```

**Allowed Hosts (Environment Variable):**
```bash
VITE_AEVATHON_ALLOWED_HOSTS=aevathon.aevoice.ai,aevathon.hellobiz.app
```

### DNS Configuration

For production deployment:

1. **Create A/CNAME records** pointing to Base44 edge deployment
2. **Wildcard subdomain** (optional): `*.aevathon.aevoice.ai` → Base44
3. **SSL certificates**: Automatic via Base44 Let's Encrypt integration
4. **Health checks**: `/health` endpoint for uptime monitoring

---

## Integration Points

### AEVOICE Core Integration

Aevathon reuses AEVOICE's backend functions:
- **Agent creation**: Same `/functions/createAgent.ts` endpoint
- **Knowledge base**: Shared KB infrastructure with event scoping
- **Telephony**: Same Twilio/SIP integration
- **Payments**: Stripe subscriptions apply to both platforms

### HelloBiz Platform Integration

**SSO (Single Sign-On):**
- Shared JWT tokens across AEVOICE, Aevathon, HelloBiz
- Secret: `HELLOBIZ_JWT_SECRET`

**Knowledge Base Sync:**
- Real-time synchronization of embeddings
- Unified search across platforms
- Endpoint: `/functions/knowledgeUnified.ts`

### FlowSync Automation Workflows

**Trigger Integration:**
- Aevathon events can trigger FlowSync automations
- HMAC signature verification via `FLOWSYNC_TRIGGER_SECRET`
- Webhook endpoint: `/functions/flowsyncTriggers.ts`

---

## Security Model

### Request Validation

**Host Gating (Production Only):**
```typescript
// functions/lib/security/hostGuard.ts
export function validateHost(request: Request): boolean {
  const host = extractHost(request);
  return isAllowedHost(host);
}
```

**HMAC Signature Verification:**
- FlowSync webhooks: 5-minute timestamp window
- Stripe webhooks: Signature verification with `STRIPE_WEBHOOK_SECRET`

### PII Protection

**Automatic Masking:**
- SSN detection: `\d{3}-\d{2}-\d{4}`
- Email masking: `user@example.com` → `u***@e***.com`
- Phone number redaction

**Test Coverage:**
- 15 PII masking tests in `/test/piiMasking.test.ts`
- All security tests must pass before deployment

### Tenant Data Isolation

**Validation Function:**
```typescript
// functions/utils/tenantValidation.ts
export async function validateAgentOwnership(
  base44: Base44Client,
  userId: string,
  agentId: string
): Promise<boolean> {
  const agent = await base44.entities.Agent.findById(agentId);
  const client = await base44.entities.Client.findById(agent.client_id);
  return client.user_id === userId;
}
```

**Test Coverage:**
- 22 tenant validation tests in `/test/tenantValidation.test.ts`

---

## Performance Characteristics

### Latency Budgets

| Mode | Total Budget | KB Retrieval | LLM Call | Fallback Behavior |
|------|-------------|--------------|----------|------------------|
| **Phone** | 2000ms | 500ms | 1200ms | Return cached or generic response |
| **Web** | 5000ms | 2000ms | 3000ms | Return fallback with retry option |

### Caching Strategy

**Knowledge Base:**
- Vector embeddings cached in-memory for 5 minutes
- Invalidation on knowledge update

**Agent Configurations:**
- Cached per-request (no cross-request cache)
- Fresh fetch ensures latest settings

---

## Observability & Debugging

### Mini Monitor (Sree)

Real-time dashboard showing:
- Active conversations per event
- Average response latency
- KB retrieval success rate
- LLM timeout frequency
- Cost per conversation

**Component:** `/src/components/sree/SreeMiniMonitor.jsx`

### Logging Standards

**Structured Logging:**
```typescript
import { logger } from './lib/infra/logger.js';

logger.info("Agent created", {
  request_id: requestId,
  agent_id: agentId,
  tenant_id: tenantId,
  event_id: eventId
});
```

**Log Levels:**
- `info`: Normal operations
- `warn`: Degraded performance or fallback used
- `error`: Failures requiring attention

### Request Tracing

Every request gets a unique ID for end-to-end tracing:

```typescript
const requestId = crypto.randomUUID();
// Passed through all function calls and logged
```

---

## Development Workflow

### Local Testing

**Run Both Experiences:**
```bash
# AEVOICE (default)
npm run dev
# Visit: http://localhost:5173

# Aevathon (modify /etc/hosts)
echo "127.0.0.1 aevathon.aevoice.ai" | sudo tee -a /etc/hosts
# Visit: http://aevathon.aevoice.ai:5173
```

**Test Edge Functions:**
```bash
# Using Base44 CLI
base44 dev

# Test specific function
curl -X POST http://localhost:54321/functions/createAgent \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Agent"}'
```

### Deployment Pipeline

1. **Commit changes** to feature branch
2. **CI tests run** (GitHub Actions)
   - ESLint (frontend)
   - TypeScript type checking
   - Deno formatting check
   - Security tests (PII, tenant validation)
3. **Manual review** and approval
4. **Merge to main** triggers production deployment
5. **Base44 auto-deployment** to edge functions

---

## Common Patterns

### Creating a New Aevathon Event

**Steps:**
1. User creates event via `/src/components/aevathon/AevathonQuickStart.jsx`
2. Backend generates unique event code
3. DNS subdomain configured (manual or automatic)
4. Event-scoped knowledge base initialized
5. Default agents provisioned (if template selected)
6. Team invitations sent (optional)

**Database Schema:**
```sql
CREATE TABLE aevathon_events (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  event_code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255),
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  environment VARCHAR(20) DEFAULT 'production',
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Team Member Onboarding

**Flow:**
1. Admin sends invitation link with team code
2. Team member visits `team-alpha.event-code.aevathon.example.com/join`
3. Frontend detects team context from hostname
4. User authenticates or signs up
5. Backend associates user with team and event
6. User redirected to team dashboard

---

## Scalability Considerations

### Horizontal Scaling

**Edge Functions:**
- Stateless design allows unlimited horizontal scaling
- Base44 automatically scales based on traffic
- No session affinity required

**Database:**
- Connection pooling via Base44 managed PostgreSQL
- Read replicas for analytics queries (future)
- Partitioning by tenant_id for large datasets (future)

### Rate Limiting

**Per-Event Limits:**
- 100 requests/minute per event (configurable)
- 1000 KB retrievals/hour per event
- 500 agent creations/day per tenant

**Implementation:**
```typescript
// functions/lib/rateLimiter.ts (future)
export async function checkRateLimit(
  eventId: string,
  operation: string
): Promise<boolean> {
  // Redis-based rate limiting
}
```

---

## Future Enhancements

### Planned Features

1. **Event Analytics Dashboard**
   - Real-time participant engagement metrics
   - Team leaderboards for hackathons
   - Conversation quality scores

2. **Multi-Language Support**
   - Automatic language detection per team
   - Localized UI for non-English events
   - Voice synthesis in 40+ languages

3. **Advanced Team Features**
   - Cross-team collaboration spaces
   - Team-specific knowledge repositories
   - Inter-team challenges and competitions

4. **White-Label Deployment**
   - Custom domain support (e.g., `hackathon.yourcompany.com`)
   - Fully branded UI with customer logos and colors
   - Isolated tenant infrastructure

### Research Areas

- **AI Agent Collaboration**: Multi-agent coordination for complex tasks
- **Voice Emotion Detection**: Sentiment analysis during calls
- **Predictive Escalation**: ML-based escalation before user requests it

---

## References

- **Parent Platform**: [AEVOICE AI README](../README.md)
- **Hostname Architecture**: [HOSTNAME_ARCHITECTURE.md](../HOSTNAME_ARCHITECTURE.md)
- **Testing Guide**: [testing-and-ci-notes.md](./testing-and-ci-notes.md)
- **CI Failures Analysis**: [ci-failures-analysis.md](./ci-failures-analysis.md)
- **HelloBiz Integration**: [HELLOBIZ_INTEGRATION.md](../HELLOBIZ_INTEGRATION.md)

---

*Last Updated:* 2026-01-25  
*Maintained by:* AEVOICE Platform Team
