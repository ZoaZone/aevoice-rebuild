# Sree Widget - Quick Testing Checklist

**Quick reference for manual testing of the Sree widget implementation**

📋 **Use this checklist for rapid verification before deployment**

---

## ✅ Pre-Deployment Checks

### Code Verification (Automated)
- [ ] Run `./scripts/verify-widget.sh` - all tests pass
- [ ] Run `npm run lint` - no errors
- [ ] Run `npm run build` - build succeeds
- [ ] Run `npm run typecheck` - no type errors

### Visual Verification (Manual)
- [ ] Widget button appears on page load
- [ ] Widget displays "Sree" branding
- [ ] Avatar shows correct image
- [ ] Greeting: "Hi! I'm Sree. How can I help you today?"

---

## 🌐 Production URL Testing

### Test Each URL (5 min per URL)

#### ✅ https://aevathon.aevoice.ai
- [ ] Widget loads without errors
- [ ] Chat functionality works
- [ ] Voice functionality works (if enabled)
- [ ] No console errors

#### ✅ https://aevoice.ai
- [ ] Widget loads without errors
- [ ] Chat functionality works
- [ ] Voice functionality works (if enabled)
- [ ] No console errors

#### ✅ https://aevathon.hellobiz.app
- [ ] Widget loads without errors
- [ ] HelloBiz branding correct
- [ ] Launch date visible: Feb 15, 2026
- [ ] No console errors

---

## 💬 Feature Quick Tests (10 minutes)

### Chat Mode
- [ ] Type message → Press Enter → Receive response
- [ ] Click Send button → Receive response
- [ ] Messages display correctly (user right, AI left)
- [ ] Scroll works for long conversations

### Voice Mode (if enabled)
- [ ] Click Voice button → Start recording
- [ ] Speak test phrase → Transcription appears
- [ ] Stop recording → Message sent automatically
- [ ] AI response plays via TTS

### Configuration
- [ ] Widget positioned correctly (default: bottom-right)
- [ ] Colors match configuration
- [ ] Panel size appropriate (380x560px)
- [ ] Open/close animation smooth

---

## 🖥️ Browser Quick Test (15 minutes)

Test on **3 browsers minimum**:

#### Chrome
- [ ] Desktop: Widget loads and works
- [ ] Mobile: Responsive layout correct

#### Firefox
- [ ] Desktop: Widget loads and works

#### Safari
- [ ] Desktop/Mobile: Widget loads and works
- [ ] Voice permissions work on iOS

---

## 📱 Mobile Quick Test (10 minutes)

### iPhone/iOS
- [ ] Widget button accessible
- [ ] Full-screen mode on open
- [ ] Keyboard doesn't cover input
- [ ] Touch interactions smooth

### Android
- [ ] Widget responsive
- [ ] Chat works
- [ ] Voice works (if supported)

---

## 🎯 HelloBiz Integration Check (5 minutes)

### FlowSync Page (/FlowSync)
- [ ] Badge shows: "HelloBiz Launch: Feb 15, 2026"

### HelloBiz Pricing (/HelloBizPricing)
- [ ] Shows: "Launching February 15, 2026"
- [ ] Shows: "3 MONTHS FREE for new providers"

### EmbedWidget Page (/EmbedWidget)
- [ ] FlowSync integration section visible
- [ ] WorkAutomation.app partner listed
- [ ] Test Integration button works

---

## 🚨 Critical Issues to Check

### Blockers (Must Fix)
- [ ] Widget doesn't load → Check console errors
- [ ] No chat responses → Check API endpoints
- [ ] agent_id error → Verify configuration
- [ ] Voice not working → Check HTTPS and permissions

### High Priority (Should Fix)
- [ ] Slow response time (>5s) → Check network
- [ ] Avatar doesn't load → Check URL
- [ ] Colors wrong → Verify config
- [ ] Mobile layout broken → Test on real device

---

## 📊 Performance Check (5 minutes)

### Load Times
- [ ] Widget button appears < 500ms
- [ ] Widget panel opens < 200ms
- [ ] First chat response < 3s
- [ ] Voice transcription < 2s

### Console Check
- [ ] No JavaScript errors
- [ ] No 404 network errors
- [ ] No CORS errors
- [ ] Debug logs minimal (if any)

---

## 🔒 Security Quick Check (5 minutes)

### Input Validation
- [ ] Try XSS: `<script>alert('test')</script>` → Should be escaped
- [ ] Try HTML: `<b>bold</b>` → Should be sanitized
- [ ] Long input (>1000 chars) → Handled gracefully

### Configuration
- [ ] agent_id validated (missing shows error)
- [ ] Invalid config handled gracefully
- [ ] No sensitive data in console logs

---

## ✅ Sign-Off

**Tested By:** _______________  
**Date:** _______________  
**Environment:** Production / Staging  

### Results
- [ ] All critical checks passed
- [ ] All high-priority checks passed
- [ ] Known issues documented below

### Known Issues
1. _________________________________
2. _________________________________
3. _________________________________

### Approval
- [ ] **Ready for Production**
- [ ] **Needs Fixes** (see issues above)

---

## 🚀 Post-Deployment Actions

After successful deployment:

1. [ ] Verify widget on all production URLs
2. [ ] Monitor error logs for 24 hours
3. [ ] Check analytics for widget usage
4. [ ] Collect user feedback
5. [ ] Update testing documentation if needed

---

## 📖 Reference Documents

- **Full Testing Guide**: SREE_WIDGET_TESTING.md
- **Test README**: test/widget/README.md
- **Automated Tests**: test/widget/widgetVerification.test.ts
- **Verification Script**: scripts/verify-widget.sh

---

## 🆘 Quick Troubleshooting

### Widget Not Appearing
1. Check script tag in HTML
2. Verify agent_id attribute
3. Check browser console
4. Test with simple HTML page

### Chat Not Working
1. Open Network tab
2. Check API endpoint calls
3. Verify agent_id is valid
4. Check knowledge base configured

### Voice Not Working
1. Ensure HTTPS connection
2. Check microphone permissions
3. Test browser Web Speech API
4. Try on different browser/device

---

**Total Estimated Time: ~1 hour for complete quick testing**

✅ **PASS** = Ready to deploy  
⚠️ **NEEDS WORK** = Fix issues first  
❌ **FAIL** = Do not deploy
