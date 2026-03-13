# 🚀 Load Testing Guide - 1000 Concurrent Sessions

## Overview

This guide provides instructions for load testing the AEVOICE AI platform with 1000 concurrent sessions to validate production readiness.

---

## Prerequisites

### Tools Required

1. **k6** (Recommended) - Modern load testing tool
   ```bash
   brew install k6  # macOS
   # OR
   curl -L https://github.com/grafana/k6/releases/download/v0.48.0/k6-v0.48.0-linux-amd64.tar.gz | tar xvz
   ```

2. **Artillery** (Alternative)
   ```bash
   npm install -g artillery
   ```

3. **Locust** (Python-based alternative)
   ```bash
   pip install locust
   ```

### Environment Setup

- Staging environment deployed and accessible
- Base44 database configured
- All 176 tests passing
- Monitoring tools configured (Datadog, New Relic, or similar)

---

## Load Testing Scenarios

### Scenario 1: Phone Conversation Load (k6)

**File**: `test/load/phone_conversation_load.js`

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up to 100 users
    { duration: '5m', target: 1000 },  // Ramp up to 1000 users
    { duration: '10m', target: 1000 }, // Stay at 1000 for 10 minutes
    { duration: '2m', target: 0 },     // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests must complete below 2s
    errors: ['rate<0.1'],              // Error rate must be below 10%
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://your-staging-url.base44.app';

export default function () {
  // Step 1: Create session
  const sessionPayload = JSON.stringify({
    agent_id: 'test-agent-1',
    client_id: 'test-client-1',
    mode: 'PHONE',
  });

  const sessionRes = http.post(
    `${BASE_URL}/functions/createConversationSession`,
    sessionPayload,
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  check(sessionRes, {
    'session created': (r) => r.status === 200,
    'has session_id': (r) => JSON.parse(r.body).session_id !== undefined,
  }) || errorRate.add(1);

  const sessionId = JSON.parse(sessionRes.body).session_id;

  // Step 2: Send 3 conversation turns
  const messages = [
    'Hello, what are your business hours?',
    'Do you offer pricing information?',
    'Thank you for your help!',
  ];

  for (const message of messages) {
    const turnPayload = JSON.stringify({
      session_id: sessionId,
      message: message,
    });

    const turnRes = http.post(
      `${BASE_URL}/functions/conversationOrchestrator`,
      turnPayload,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: '3s', // PHONE mode has 2s latency budget
      }
    );

    check(turnRes, {
      'turn processed': (r) => r.status === 200,
      'has response': (r) => JSON.parse(r.body).response !== undefined,
      'within latency budget': (r) => r.timings.duration < 2000,
    }) || errorRate.add(1);

    sleep(1); // Simulate user thinking time
  }

  sleep(2); // Simulate delay between sessions
}
```

### Scenario 2: Web Widget Load (k6)

**File**: `test/load/web_widget_load.js`

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '1m', target: 200 },   // Quick ramp to 200
    { duration: '3m', target: 1000 },  // Ramp to 1000
    { duration: '15m', target: 1000 }, // Sustain 1000 for 15min
    { duration: '1m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<5000'], // 95% under 5s (WEB mode)
    errors: ['rate<0.05'],             // Error rate under 5%
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://your-staging-url.base44.app';

export default function () {
  // Web widget conversation
  const sessionPayload = JSON.stringify({
    agent_id: 'test-agent-web',
    client_id: 'test-client-1',
    mode: 'WEB',
  });

  const sessionRes = http.post(
    `${BASE_URL}/functions/createConversationSession`,
    sessionPayload,
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(sessionRes, {
    'session created': (r) => r.status === 200,
  }) || errorRate.add(1);

  const sessionId = JSON.parse(sessionRes.body).session_id;

  // Single message (typical web widget usage)
  const turnPayload = JSON.stringify({
    session_id: sessionId,
    message: 'What are your hours?',
  });

  const turnRes = http.post(
    `${BASE_URL}/functions/conversationOrchestrator`,
    turnPayload,
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: '6s', // WEB mode 5s budget + buffer
    }
  );

  check(turnRes, {
    'response received': (r) => r.status === 200,
    'within budget': (r) => r.timings.duration < 5000,
  }) || errorRate.add(1);

  sleep(5); // Web users take longer between messages
}
```

---

## Running Load Tests

### Using k6

```bash
# Set environment variables
export BASE_URL=https://your-staging-url.base44.app
export K6_CLOUD_TOKEN=your-token  # Optional: for k6 Cloud

# Run phone conversation load test
k6 run test/load/phone_conversation_load.js

# Run web widget load test
k6 run test/load/web_widget_load.js

# Run with cloud reporting (recommended)
k6 cloud test/load/phone_conversation_load.js
```

### Using Artillery

**Config**: `test/load/artillery_config.yml`

```yaml
config:
  target: 'https://your-staging-url.base44.app'
  phases:
    - duration: 120
      arrivalRate: 10
      name: "Warm up"
    - duration: 600
      arrivalRate: 100
      name: "Sustained load - 1000 concurrent"
  processor: "./processor.js"

scenarios:
  - name: "Phone Conversation"
    flow:
      - post:
          url: "/functions/createConversationSession"
          json:
            agent_id: "test-agent-1"
            client_id: "test-client-1"
            mode: "PHONE"
          capture:
            - json: "$.session_id"
              as: "sessionId"
      - post:
          url: "/functions/conversationOrchestrator"
          json:
            session_id: "{{ sessionId }}"
            message: "What are your hours?"
          expect:
            - statusCode: 200
            - contentType: json
```

**Run**:
```bash
artillery run test/load/artillery_config.yml
```

---

## Metrics to Monitor

### System Metrics

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| **Response Time (p95)** | <2s (PHONE), <5s (WEB) | >3s (PHONE), >7s (WEB) |
| **Error Rate** | <1% | >5% |
| **CPU Usage** | <70% | >85% |
| **Memory Usage** | <80% | >90% |
| **Database Connections** | <80% of pool | >90% |

### Application Metrics

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| **Cache Hit Rate** | >80% | <60% |
| **KB Retrieval Time** | <300ms | >500ms |
| **LLM Response Time** | <1500ms | >2500ms |
| **Concurrent Sessions** | 1000+ | N/A |
| **Throughput** | 100 req/s | <50 req/s |

### Business Metrics

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| **Escalation Rate** | <10% | >20% |
| **Restricted Topic Rate** | <5% | >10% |
| **Session Success Rate** | >95% | <90% |
| **Average Turns/Session** | 2-5 | >10 (indicates loops) |

---

## Expected Results

### Baseline Performance (No Load)

- Response time (p50): 400ms
- Response time (p95): 800ms
- Response time (p99): 1200ms
- Error rate: 0%

### Under Load (1000 concurrent)

- Response time (p50): 600-900ms
- Response time (p95): 1500-2000ms (PHONE), 3000-5000ms (WEB)
- Response time (p99): 2500-3000ms (PHONE), 6000-8000ms (WEB)
- Error rate: <1%
- Throughput: 50-100 requests/second

### Stress Test (1500+ concurrent)

- Should gracefully degrade
- No crashes or data corruption
- Error rate may increase to 5-10%
- Circuit breakers should activate
- System should recover when load decreases

---

## Troubleshooting Load Test Issues

### Issue 1: High Response Times

**Symptoms**: p95 > 3s for PHONE, > 7s for WEB

**Diagnosis**:
```bash
# Check database query times
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;

# Check function execution logs
base44 logs functions/conversationOrchestrator --last 100

# Check Base44 metrics
base44 metrics --function conversationOrchestrator
```

**Solutions**:
- Add database indexes on frequently queried columns
- Increase cache TTL for frequently accessed data
- Optimize KB vector search queries
- Scale up Deno function instances

### Issue 2: High Error Rate

**Symptoms**: Error rate > 5%

**Diagnosis**:
```bash
# Check error logs
base44 logs --level error --last 500

# Check specific error types
grep "error_type" logs.json | sort | uniq -c | sort -rn
```

**Solutions**:
- Check API rate limits (OpenAI, ElevenLabs)
- Verify database connection pool size
- Check for timeout errors (increase if legitimate slow queries)
- Verify external API health

### Issue 3: Memory Leaks

**Symptoms**: Memory usage continuously increasing

**Diagnosis**:
```bash
# Monitor memory over time
base44 metrics --metric memory_usage --duration 1h

# Check for leaked timers/intervals
# (Already fixed in conversationOrchestrator.test.ts)
```

**Solutions**:
- Implement cache eviction policies (already done)
- Add garbage collection hints
- Restart functions periodically (Base44 handles this)

---

## Load Test Reporting

### Generate Report

After tests complete, generate summary report:

```bash
# k6 HTML report
k6 run --out json=results.json test/load/phone_conversation_load.js
k6 report results.json --output report.html

# Artillery report (auto-generated)
artillery run --output results.json test/load/artillery_config.yml
artillery report results.json
```

### Report Template

```markdown
# Load Test Results - [Date]

## Configuration
- Test Duration: 20 minutes
- Target Concurrency: 1000 users
- Scenario: Phone Conversation (3 turns)
- Environment: Staging

## Results Summary
- Total Requests: 45,000
- Success Rate: 99.2%
- Error Rate: 0.8%
- Average Response Time: 750ms
- p95 Response Time: 1800ms
- p99 Response Time: 2400ms
- Throughput: 75 req/s

## Pass/Fail Criteria
- ✅ p95 < 2000ms (PHONE mode)
- ✅ Error rate < 1%
- ✅ No system crashes
- ✅ Graceful degradation under stress
- ✅ System recovered after load

## Recommendations
- Increase cache TTL from 1min to 5min for safe responses
- Add 2 more Deno function instances for redundancy
- Monitor database connection pool (peaked at 75%)

## Production Readiness: ✅ PASS
```

---

## Next Steps After Load Testing

1. ✅ **Analyze Results** - Review all metrics and reports
2. ✅ **Fix Issues** - Address any performance bottlenecks
3. ✅ **Re-test** - Run load tests again after fixes
4. ✅ **Document** - Update documentation with findings
5. 🚀 **Deploy to Production** - See [PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md)

---

## Additional Resources

- [k6 Documentation](https://k6.io/docs/)
- [Artillery Documentation](https://www.artillery.io/docs)
- [Locust Documentation](https://docs.locust.io/)
- [Base44 Performance Guide](https://docs.base44.com/performance)
- [AEVOICE Monitoring Dashboard](https://your-monitoring-url.com)

---

**Last Updated**: January 23, 2026  
**Maintainer**: AEVOICE DevOps Team
