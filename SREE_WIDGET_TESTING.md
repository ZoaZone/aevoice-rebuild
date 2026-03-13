# Sree Widget Testing & Verification Guide

## Overview
This document provides comprehensive testing procedures for the Sree widget implementation. The Sree widget is AEVOICE's AI chatbot interface deployed across multiple platforms.

## Implementation Summary (Completed Jan 16, 2026)

### 1. Sri → Sree Widget Replacement ✅
- **WidgetHost.jsx**: Updated with Sree defaults (name, avatar, greeting)
- **widgetLoader.ts**: Updated with Sree branding
- **Default Greeting**: "Hi! I'm Sree. How can I help you today? 👋"
- **Avatar**: Configured with Sree profile image
- **Button Text**: Default "Sree"

### 2. Widget Features ✅
- Chat and Voice toggle modes
- Quick action buttons support
- Text input with contextual placeholder
- Knowledge Base (KB) powered responses
- Proactive greeting functionality
- Voice recognition (Web Speech API)
- Text-to-Speech (TTS) support

### 3. HelloBiz Launch Updates ✅
- Launch date: **February 15, 2026**
- Promotional offer: **3 months FREE subscription** for new providers
- FlowSync integration section added

---

## Testing Checklist

### A. Widget Deployment Verification

#### 1. Test on Production Sites
Test the Sree widget on all deployment URLs:

- [ ] **https://aevathon.aevoice.ai**
  - Load the page
  - Verify widget button appears in bottom-right corner
  - Click to open widget
  - Verify "Sree" branding (name, avatar, greeting)
  
- [ ] **https://aevoice.ai**
  - Load the page
  - Verify widget button appears
  - Test chat functionality
  - Test voice functionality
  
- [ ] **https://aevathon.hellobiz.app**
  - Load the page
  - Verify widget integration
  - Check HelloBiz-specific branding
  
- [ ] **https://flowsync.hellobiz.app** (if applicable)
  - Verify FlowSync integration
  - Test widget in automation context

#### 2. Visual Verification
For each deployment URL:

- [ ] Sree avatar displays correctly
- [ ] Default greeting message appears: "Hi! I'm Sree. How can I help you today?"
- [ ] Widget button shows "Sree" text
- [ ] Color scheme matches configuration (default: #0e4166)
- [ ] Widget position is correct (default: bottom-right)
- [ ] Widget dimensions are appropriate (380x560px default)

### B. Functional Testing

#### 1. Chat Mode Testing
- [ ] **Text Input**
  - Type a message in the input field
  - Verify placeholder text shows greeting message
  - Press Enter to send message
  - Verify message appears in chat history
  - Verify AI response is received
  - Check response streaming works correctly

- [ ] **Send Button**
  - Click Send button instead of Enter
  - Verify same functionality as Enter key
  - Check button disabled state during loading

- [ ] **Message Display**
  - User messages appear on the right (blue background)
  - AI responses appear on the left (white background)
  - Messages wrap correctly for long text
  - Emoji display correctly

- [ ] **Loading States**
  - "Thinking…" indicator appears while waiting for response
  - Loading prevents multiple simultaneous requests
  - Scroll automatically to latest message

#### 2. Voice Mode Testing
- [ ] **Voice Button Visibility**
  - Voice button appears in widget header if `enableVoice: true`
  - Button shows microphone icon 🎤
  - Button text shows "Voice"

- [ ] **Voice Recording**
  - Click Voice button to start recording
  - Microphone permission prompt appears (first time)
  - Button changes to "● Listening" state
  - Speak a test phrase
  - Verify interim results appear in input field
  - Check final transcript is sent automatically

- [ ] **Voice Playback (TTS)**
  - AI responses are spoken aloud when voice is enabled
  - Speech rate is appropriate (1.05x configured)
  - Language matches configuration (default: en-US)
  - Browser TTS voices work correctly

- [ ] **Voice Session Management**
  - Voice session stops after 10 seconds of silence
  - Manual stop works (click button again)
  - Voice continues listening until stopped
  - Multiple voice sessions can be started

#### 3. Knowledge Base Response Testing
- [ ] **KB Integration**
  - Ask questions related to configured knowledge base
  - Verify responses are contextually accurate
  - Check responses cite KB information
  - Test with various question formats

- [ ] **Conversation History**
  - Verify last 4 messages are sent for context
  - Check multi-turn conversations maintain context
  - Test conversation reset (page reload)

#### 4. Quick Action Buttons (if configured)
- [ ] "Tell me about pricing" button
- [ ] "How does voice AI work?" button
- [ ] "Book a demo" button
- [ ] "See features" button
- [ ] Custom quick actions work

#### 5. Widget Configuration Testing
Test various configuration options work correctly:

- [ ] **Position Settings**
  - bottom-right (default)
  - bottom-left
  - top-right
  - top-left

- [ ] **Color Customization**
  - Primary color changes widget header
  - Secondary color affects UI elements
  - Button color applies to chat button
  - User message color matches primary

- [ ] **Size Settings**
  - Panel width adjustment (380px default)
  - Panel height adjustment (560px default)
  - Offset X and Y positioning
  - Mobile responsive scaling

- [ ] **Behavior Settings**
  - Proactive greeting after delay (5 seconds default)
  - Open on load functionality
  - Show after seconds delay
  - Custom greeting messages

- [ ] **Avatar Configuration**
  - Default Sree avatar displays
  - Custom avatar URL works
  - Avatar fallback if URL fails
  - Avatar size and styling correct

### C. Cross-Browser Testing

Test on all major browsers:

#### Chrome (Latest)
- [ ] Desktop: Windows 10/11
- [ ] Desktop: macOS
- [ ] Desktop: Linux (Ubuntu)
- [ ] Mobile: Android

#### Firefox (Latest)
- [ ] Desktop: Windows 10/11
- [ ] Desktop: macOS
- [ ] Desktop: Linux (Ubuntu)

#### Safari (Latest)
- [ ] Desktop: macOS
- [ ] Mobile: iOS/iPadOS

#### Edge (Latest)
- [ ] Desktop: Windows 10/11
- [ ] Desktop: macOS

**For each browser, verify:**
- Widget loads without errors
- Chat functionality works
- Voice recording works (if supported)
- TTS works (if supported)
- UI renders correctly
- No console errors

### D. Mobile Responsiveness Testing

#### iOS Safari
- [ ] iPhone (Standard size)
  - Widget appears correctly
  - Touch interactions work
  - Voice permission flow works
  - Keyboard doesn't cover input
  - Full-screen mode on mobile works

- [ ] iPad (Tablet)
  - Widget scales appropriately
  - Layout adapts for larger screen
  - Split view compatibility

#### Android Chrome
- [ ] Phone (Standard size)
  - Widget button accessible
  - Chat interface responsive
  - Voice recording works
  - Keyboard handling correct

- [ ] Tablet
  - Appropriate sizing
  - Layout optimization
  - Multi-window support

**Mobile-Specific Tests:**
- [ ] Touch target sizes (minimum 44x44px)
- [ ] Zoom doesn't break layout
- [ ] Orientation change (portrait/landscape)
- [ ] Virtual keyboard interaction
- [ ] Accessibility on mobile

### E. HelloBiz Integration Verification

#### 1. Launch Date Display
- [ ] **FlowSync Page** (/FlowSync)
  - Badge shows: "HelloBiz Launch: Feb 15, 2026"
  - Badge styling correct (emerald background)

- [ ] **HelloBiz Pricing** (/HelloBizPricing)
  - Launch date displays: "Launching February 15, 2026"
  - Promotional content visible

#### 2. Sree Promotional Offer
- [ ] **Pricing Page** (/HelloBizPricing)
  - Text shows: "3 MONTHS FREE for new providers who join before Feb 15, 2026"
  - Offer styling prominent (emerald text)
  - Call-to-action clear

#### 3. FlowSync Integration Section
- [ ] **EmbedWidget Page** (/EmbedWidget)
  - FlowSync section displays in "Connected Automation Platforms"
  - WorkAutomation.app partner info shown
  - API credentials section present
  - Test Integration button works

---

## Automated Testing

### Test Script Location
Automated tests should be added to `/test/` directory:

```
test/
  └── widget/
      ├── widgetLoader.test.ts
      ├── widgetHost.test.ts
      └── widgetIntegration.test.ts
```

### Recommended Test Framework
- **Unit Tests**: Vitest (already in dependencies)
- **E2E Tests**: Playwright or Cypress
- **API Tests**: Vitest + fetch mocking

### Sample Test Cases

#### Widget Loader Test
```typescript
// test/widget/widgetLoader.test.ts
import { describe, it, expect } from 'vitest';

describe('widgetLoader', () => {
  it('should include Sree default greeting', () => {
    const expectedGreeting = "Hi! I'm Sree. How can I help you today?";
    // Test implementation
  });

  it('should configure Sree avatar URL', () => {
    const expectedAvatar = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/692b24a5bac54e3067972063/1e23c85b7_Gemini_Generated_Image_4njbwr4njbwr4njb.jpg";
    // Test implementation
  });

  it('should set button text to "Sree"', () => {
    // Test implementation
  });
});
```

#### Widget Host Test
```typescript
// test/widget/widgetHost.test.ts
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('WidgetHost', () => {
  it('should display Sree title by default', () => {
    // Test implementation
  });

  it('should show correct greeting placeholder', () => {
    // Test implementation
  });

  it('should render Sree avatar', () => {
    // Test implementation
  });
});
```

---

## Performance Testing

### Load Time Metrics
- [ ] Widget script loads in < 1 second
- [ ] Widget button appears in < 500ms
- [ ] First interaction ready in < 2 seconds
- [ ] Chat response time < 3 seconds average

### Resource Usage
- [ ] Widget bundle size < 50KB (gzipped)
- [ ] No memory leaks in long sessions
- [ ] Voice recording cleanup works
- [ ] No orphaned event listeners

---

## Security Testing

### Input Validation
- [ ] XSS protection in chat messages
- [ ] HTML sanitization works
- [ ] Script injection prevented
- [ ] Safe URL handling for avatars

### API Security
- [ ] Agent ID validation required
- [ ] Client ID validation works
- [ ] Rate limiting applied
- [ ] CORS headers correct

### Privacy
- [ ] No sensitive data logged to console
- [ ] Microphone permission requested properly
- [ ] Session data cleared on close
- [ ] No PII in error messages

---

## Accessibility Testing

### Keyboard Navigation
- [ ] Tab through all interactive elements
- [ ] Enter key sends messages
- [ ] Escape key closes widget
- [ ] Focus indicators visible

### Screen Reader Support
- [ ] Widget button has aria-label
- [ ] Chat messages have appropriate roles
- [ ] Loading states announced
- [ ] Error messages accessible

### WCAG Compliance
- [ ] Color contrast ratio > 4.5:1
- [ ] Text resizable up to 200%
- [ ] No keyboard traps
- [ ] Focus order logical

---

## Error Handling Testing

### Network Errors
- [ ] Graceful degradation on API failure
- [ ] Retry mechanism works
- [ ] User-friendly error messages
- [ ] Fallback UI displays

### Configuration Errors
- [ ] Missing agent_id shows error
- [ ] Invalid configuration handled
- [ ] Console warnings helpful
- [ ] No silent failures

### Browser Compatibility Errors
- [ ] Voice API not supported message
- [ ] TTS fallback works
- [ ] Polyfills load correctly
- [ ] Feature detection works

---

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] No linting errors
- [ ] Build succeeds
- [ ] Environment variables set

### Post-Deployment
- [ ] Widget loads on all URLs
- [ ] No console errors in production
- [ ] Analytics tracking works
- [ ] Monitoring alerts configured

### Rollback Plan
- [ ] Previous version tagged
- [ ] Rollback procedure documented
- [ ] Database migrations reversible
- [ ] Cache invalidation strategy

---

## Known Issues & Limitations

### Current Limitations
1. Voice mode requires HTTPS
2. Some browsers don't support Web Speech API
3. TTS voices vary by platform
4. Mobile Safari has microphone permission quirks

### Browser-Specific Issues
- **iOS Safari**: Requires user gesture for TTS
- **Firefox**: Web Speech API limited support
- **Edge**: Legacy versions not supported

---

## Support & Troubleshooting

### Common Issues

#### Widget Not Appearing
1. Check script tag has correct URL
2. Verify agent_id and client_id attributes
3. Check browser console for errors
4. Confirm CORS headers allow origin

#### Voice Not Working
1. Check HTTPS connection
2. Verify microphone permissions
3. Test browser Web Speech API support
4. Check console for errors

#### Responses Not Loading
1. Verify agent_id is valid
2. Check network tab for API calls
3. Confirm knowledge base configured
4. Test API endpoint directly

### Debug Mode
Enable debug logging in widget configuration:
```javascript
window.aevoiceConfig = {
  debug: true,
  // ... other config
};
```

### Contact Support
For issues not covered in this guide:
- Email: care@aevoice.ai
- Documentation: https://docs.aevoice.ai
- Status Page: https://status.aevoice.ai

---

## Testing Sign-Off

### Test Execution Record
- **Tester Name**: _________________
- **Date**: _________________
- **Environment**: _________________
- **Browser/Device**: _________________

### Test Results Summary
- Total Tests: _____
- Passed: _____
- Failed: _____
- Blocked: _____
- Not Tested: _____

### Critical Issues Found
1. _________________________________________________
2. _________________________________________________
3. _________________________________________________

### Approval
- [ ] All critical tests passed
- [ ] Known issues documented
- [ ] Ready for production deployment

**Approved By**: _________________ **Date**: _________________

---

## Version History

| Version | Date | Changes | Tester |
|---------|------|---------|--------|
| 1.0 | 2026-01-16 | Initial testing guide created | - |
| | | | |
| | | | |
