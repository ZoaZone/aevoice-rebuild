# Sree Feature Flags Reference

## Overview

The Sree platform uses a flexible feature flag system that allows tenant-level, agency-level, and URL-based control over features. This enables staged rollouts, A/B testing, and per-customer feature enablement.

---

## Feature Flag Hierarchy (Priority Order)

1. **URL Parameters** (Highest Priority)  
   Instant testing without code changes

2. **Admin Overrides** (localStorage)  
   Local testing and debugging

3. **Tenant-Level Flags** (Backend)  
   Per-customer feature enablement

4. **Agency-Level Flags** (Backend)  
   Agency-wide feature control

5. **Default Flags** (Lowest Priority)  
   System-wide defaults

---

## Available Feature Flags

### Sree Features

| Flag | Default | Description |
|------|---------|-------------|
| `enableSreeWeb` | `false` | Enable Sree web widget on website |
| `enableSreeDesktop` | `false` | Enable Sree desktop application features |
| `enableHotword` | `false` | Enable "Hey Sree" voice activation |
| `enableOfflineMode` | `false` | Enable offline LLM inference for privacy |
| `enableOverlay` | `false` | Enable screen overlay widget for context |
| `enableMultiWindow` | `false` | Enable multi-window desktop mode |

### System Features

| Flag | Default | Description |
|------|---------|-------------|
| `enableAutoUpdate` | `true` | Enable automatic application updates |
| `enableTelemetry` | `true` | Enable usage telemetry and analytics |
| `enableBetaFeatures` | `false` | Enable experimental beta features |
| `enableDebugMode` | `false` | Enable verbose debug logging |

### Voice & AI Features

| Flag | Default | Description |
|------|---------|-------------|
| `enableVoiceChat` | `true` | Enable voice chat functionality |
| `enableStreamingLLM` | `true` | Enable streaming LLM responses |
| `enableCustomVoices` | `false` | Enable custom voice cloning |
| `enableMultiLanguage` | `true` | Enable multi-language support |

### Desktop Features

| Flag | Default | Description |
|------|---------|-------------|
| `enableScreenContext` | `false` | Enable screen context awareness |
| `enableKeyboardShortcuts` | `true` | Enable global keyboard shortcuts |
| `enableSystemTray` | `true` | Enable system tray icon |
| `enableNotifications` | `true` | Enable desktop notifications |

### Integration Features

| Flag | Default | Description |
|------|---------|-------------|
| `enableTelephony` | `false` | Enable telephony integration for calls |
| `enableCRM` | `false` | Enable CRM system integrations |
| `enableCalendar` | `false` | Enable calendar integrations |
| `enableWebhooks` | `true` | Enable webhook support for events |

---

## Usage Examples

### Frontend (React Component)

```javascript
import { useFeatureFlags } from '@/config/featureFlags';

function MyComponent() {
  const { flags, loading } = useFeatureFlags();
  
  if (loading) {
    return <div>Loading...</div>;
  }
  
  return (
    <div>
      {flags.enableSreeWeb && <SreeWidget />}
      {flags.enableHotword && <HotwordListener />}
      {flags.enableTelephony && <PhoneIntegration />}
    </div>
  );
}
```

### Frontend (Direct API)

```javascript
import { getFeatureFlags, isFeatureEnabled } from '@/config/featureFlags';

// Get all flags
const flags = await getFeatureFlags();
console.log(flags.enableSreeDesktop); // true/false

// Check specific flag
const hotwordEnabled = await isFeatureEnabled('enableHotword');
if (hotwordEnabled) {
  startHotwordDetection();
}

// Force refresh from backend
const freshFlags = await getFeatureFlags({ forceRefresh: true });
```

### Backend (Deno Function)

```typescript
// The getFeatureFlags.ts function handles backend logic
// Frontend calls it via:
const response = await base44.functions.invoke('getFeatureFlags', { tenantId });
const flags = response.data.flags;
```

---

## URL Parameter Overrides

Enable features instantly without code changes or database updates.

### Format

```
?featureName=1
?enableFeatureName=1
```

### Examples

```bash
# Enable Sree widget on any page
https://app.aevoice.ai/?sree=1
https://app.aevoice.ai/?enableSreeWeb=1

# Enable hotword detection
https://app.aevoice.ai/?hotword=1
https://app.aevoice.ai/?enableHotword=1

# Enable debug mode
https://app.aevoice.ai/?debugMode=1

# Combine multiple flags
https://app.aevoice.ai/?sree=1&hotword=1&debugMode=1
```

### Use Cases

- **Testing:** Test new features without deployment
- **Demos:** Show features to specific customers
- **Debugging:** Enable debug mode on production
- **Support:** Help customers test features

---

## Admin Overrides (localStorage)

For local development and testing. Persists across page reloads.

### Set Overrides

```javascript
import { setAdminOverrides } from '@/config/featureFlags';

// Enable specific features
await setAdminOverrides({
  enableSreeDesktop: true,
  enableHotword: true,
  enableDebugMode: true
});

// Changes persist in localStorage
// Takes effect immediately (cache cleared)
```

### Clear Overrides

```javascript
import { clearAdminOverrides } from '@/config/featureFlags';

// Remove all local overrides
clearAdminOverrides();

// Will use backend flags again
```

### View Current Overrides

```javascript
// Check localStorage
const overrides = localStorage.getItem('sree_admin_overrides');
console.log(JSON.parse(overrides));
```

---

## Backend Configuration

### Database Schema

#### Client Table
```sql
ALTER TABLE clients
ADD COLUMN feature_flags JSONB DEFAULT '{}';
```

#### Agency Table
```sql
ALTER TABLE agencies
ADD COLUMN feature_flags JSONB DEFAULT '{}';
```

### Setting Flags Programmatically

```javascript
// Via Base44 SDK
await base44.entities.Client.update(clientId, {
  feature_flags: {
    enableSreeWeb: true,
    enableHotword: true,
    enableTelephony: true
  }
});

// Via SQL
UPDATE clients
SET feature_flags = '{"enableSreeWeb": true, "enableHotword": true}'
WHERE id = 'client-uuid';
```

### Agency-Wide Flags

```javascript
// Set flags for entire agency
await base44.entities.Agency.update(agencyId, {
  feature_flags: {
    enableSreeDesktop: true,
    enableOfflineMode: true,
    enableCustomVoices: true
  }
});

// All clients under this agency inherit these flags
// (Can be overridden at tenant level)
```

---

## Canary Rollout

Feature flags support staged rollouts via environment variable.

### Configuration

```bash
# In production environment
CANARY_PERCENTAGE=5  # 5% of users
```

### Behavior

- Users are assigned to canary group via hash-based selection
- Deterministic (same user always in/out of canary)
- Percentage can be gradually increased: 5% → 25% → 50% → 100%
- Canary users get all Sree features enabled automatically

### Backend Implementation

```typescript
// In getFeatureFlags.ts
const canaryPercentage = parseInt(Deno.env.get("CANARY_PERCENTAGE") || "0", 10);
const userHash = hashCode(user.id);
const isInCanary = (userHash % 100) < canaryPercentage;

if (isInCanary) {
  // Enable Sree features for canary users
  flags.enableSreeWeb = true;
  flags.enableSreeDesktop = true;
  flags.enableHotword = true;
  // ...
}
```

### Rollout Phases

```bash
# Phase A: Internal testing (0%)
CANARY_PERCENTAGE=0

# Phase B: Early adopters (5%)
CANARY_PERCENTAGE=5

# Phase C: Expanded testing (25%)
CANARY_PERCENTAGE=25

# Phase D: Majority rollout (50%)
CANARY_PERCENTAGE=50

# Phase E: Full rollout (100%)
CANARY_PERCENTAGE=100
```

---

## Caching Behavior

### Cache TTL
- **Default:** 5 minutes
- **Force Refresh:** Available via `getFeatureFlags({ forceRefresh: true })`

### Cache Locations
1. **Memory Cache** - Runtime cache in frontend
2. **localStorage** - Persists across reloads
3. **Backend** - Database (clients/agencies tables)

### Cache Invalidation

```javascript
// Clear all caches
clearAdminOverrides(); // Clear localStorage
await getFeatureFlags({ forceRefresh: true }); // Refresh from backend
```

---

## Best Practices

### 1. Feature Flag Naming
- Use `enable` prefix for boolean flags
- Use camelCase: `enableSreeWeb`, not `enable_sree_web`
- Be descriptive: `enableCustomVoices`, not `customVoice`

### 2. Default Values
- Default to `false` for new/beta features
- Default to `true` for stable core features
- Consider impact of default on new tenants

### 3. Gradual Rollout
```
1. Add flag with `default: false`
2. Enable for internal testing (URL params)
3. Enable for select customers (tenant flags)
4. Enable for canary group (5%)
5. Gradually increase canary (25% → 50% → 100%)
6. Change default to `true` after stable
7. Remove flag after 100% adoption
```

### 4. Testing
- Always test with URL parameters first
- Use admin overrides for local development
- Test both enabled and disabled states
- Verify graceful degradation

### 5. Documentation
- Document new flags in this file
- Include description and impact
- Note dependencies (e.g., `enableHotword` requires `enableVoiceChat`)

---

## Troubleshooting

### Flag Not Taking Effect

**Check priority order:**
1. Is there a URL parameter overriding it?
2. Are admin overrides set in localStorage?
3. Check browser console for SREE_DEBUG logs
4. Verify backend returned correct flags

**Force refresh:**
```javascript
// Clear cache and reload
await getFeatureFlags({ forceRefresh: true });
```

### Backend Returns Wrong Flags

**Check database:**
```sql
-- Check tenant flags
SELECT id, feature_flags FROM clients WHERE id = 'your-tenant-id';

-- Check agency flags
SELECT id, feature_flags FROM agencies WHERE id = 'your-agency-id';
```

**Check canary status:**
```bash
# Check environment variable
echo $CANARY_PERCENTAGE

# Check user hash (in backend logs)
# Look for: "User in canary group - enabled Sree features"
```

### localStorage Corrupted

**Clear and reset:**
```javascript
// Clear all Sree localStorage
localStorage.removeItem('sree_feature_flags');
localStorage.removeItem('sree_admin_overrides');

// Refresh page
window.location.reload();
```

---

## API Reference

### `getFeatureFlags(options?)`
Get all feature flags for current tenant.

**Parameters:**
- `options.forceRefresh` (boolean) - Force refresh from backend
- `options.tenantId` (string) - Specific tenant ID (optional)

**Returns:** `Promise<Object>` - Feature flags object

**Example:**
```javascript
const flags = await getFeatureFlags();
const flags = await getFeatureFlags({ forceRefresh: true });
const flags = await getFeatureFlags({ tenantId: 'tenant-uuid' });
```

### `isFeatureEnabled(featureName)`
Check if specific feature is enabled.

**Parameters:**
- `featureName` (string) - Feature flag name

**Returns:** `Promise<boolean>` - True if enabled

**Example:**
```javascript
if (await isFeatureEnabled('enableHotword')) {
  startHotword();
}
```

### `setAdminOverrides(overrides)`
Set local overrides for testing (requires admin permissions).

**Parameters:**
- `overrides` (Object) - Feature flag overrides

**Returns:** `Promise<boolean>` - Success status

**Example:**
```javascript
await setAdminOverrides({
  enableSreeDesktop: true,
  enableDebugMode: true
});
```

### `clearAdminOverrides()`
Clear all local overrides.

**Returns:** `void`

**Example:**
```javascript
clearAdminOverrides();
```

### `getAvailableFlags()`
Get list of all available feature flag keys.

**Returns:** `Array<string>` - List of flag names

**Example:**
```javascript
const flags = getAvailableFlags();
// ['enableSreeWeb', 'enableSreeDesktop', ...]
```

### `getFlagDescriptions()`
Get descriptions for all feature flags.

**Returns:** `Object` - Map of flag names to descriptions

**Example:**
```javascript
const descriptions = getFlagDescriptions();
console.log(descriptions.enableHotword);
// "Enable "Hey Sree" voice activation"
```

### `useFeatureFlags()` (React Hook)
React hook for feature flags.

**Returns:** `{ flags: Object, loading: boolean }`

**Example:**
```javascript
function MyComponent() {
  const { flags, loading } = useFeatureFlags();
  
  if (loading) return <Spinner />;
  
  return (
    <div>
      {flags.enableSreeWeb && <SreeWidget />}
    </div>
  );
}
```

---

## Migration Guide

### From Hardcoded Flags

**Before:**
```javascript
const showWidget = ['aevathon.aevoice.ai'].includes(window.location.hostname);
{showWidget && <SreeWidget />}
```

**After:**
```javascript
const { flags } = useFeatureFlags();
{flags.enableSreeWeb && <SreeWidget />}
```

### From Environment Variables

**Before:**
```javascript
const enableFeature = import.meta.env.VITE_ENABLE_FEATURE === 'true';
```

**After:**
```javascript
const enableFeature = await isFeatureEnabled('enableFeature');
```

---

## Security Considerations

1. **Admin Overrides:** Only for local testing, not production control
2. **URL Parameters:** Anyone can modify URLs, don't use for access control
3. **Database Flags:** Primary source of truth for production
4. **Sensitive Features:** Use backend validation in addition to flags
5. **Audit Logging:** Track who changes flags and when (future enhancement)

---

**Last Updated:** January 19, 2026  
**Phase:** 7 - Production Rollout  
**Version:** 1.0
