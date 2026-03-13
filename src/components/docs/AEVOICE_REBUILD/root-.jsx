# ═══════════════════════════════════════════════════════════
# AEVOICE Root Environment Variables
# Copy this file to .env and fill in your values.
# ═══════════════════════════════════════════════════════════

# ── Base44 Platform ─────────────────────────────────────────
BASE44_APP_ID=your_base44_app_id_here
BASE44_CLIENT_ID=your_base44_client_id_here
BASE44_API_KEY=your_base44_api_key_here
BASE44_APP_BASE_URL=https://api.base44.com

# ── Backend Server ───────────────────────────────────────────
PORT=3001
NODE_ENV=development

# ── Frontend ─────────────────────────────────────────────────
VITE_API_BASE_URL=http://localhost:3001
VITE_BASE44_APP_ID=your_base44_app_id_here

# ── Auth ──────────────────────────────────────────────────────
SESSION_SECRET=change_this_to_a_random_64_char_secret
JWT_SECRET=change_this_to_another_random_64_char_secret

# ── External APIs (already set as Base44 secrets) ────────────
OPENAI_API_KEY=
ELEVENLABS_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
STRIPE_API_KEY=
SENDGRID_API_KEY=

# ── Logging ──────────────────────────────────────────────────
LOG_LEVEL=info
RUST_LOG=info