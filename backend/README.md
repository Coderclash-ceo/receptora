# RecepTora Backend Service 🚀

The core API and AI engine powering RecepTora. Handles Meta WhatsApp Cloud API webhooks, AI agent orchestration, multi-tenant scheduling, Google Calendar synchronization, and customer retention analytics.

---

## 🛠 Tech Stack
- **Runtime**: Node.js v20+ / Express
- **AI Engine**: Google Gemini API via official `@google/genai` SDK
- **Database**: Google Cloud Firestore (`firebase-admin`)
- **Calendar**: Google Calendar API v3 (`googleapis`)
- **Messaging**: Meta WhatsApp Cloud API (Graph API v20.0)
- **Job Scheduler**: `node-cron`

---

## 🤖 Agents Architecture
- **Receptionist Agent (`src/agents/reception`)**: Real-time natural language conversational scheduling, multi-step booking, availability checking, and cancellations.
- **Retention Agent (`src/agents/retention`)**: Churn detection and automated win-back message drafting/dispatching.
- **Revenue Agent (`src/agents/revenue`)**: Calendar density analyzer detecting underbooked slots and suggesting yield-optimizing actions.
- **Insight Agent (`src/agents/insight`)**: Executive KPI summarizer.
- **Onboarding Agent (`src/agents/onboarding`)**: Conversational onboarding helper.

---

## ⚙️ Environment Variables (`.env`)
```env
PORT=3000
NODE_ENV=production

# Gemini AI
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash

# Firebase Admin
GOOGLE_APPLICATION_CREDENTIALS=/path/to/firebase-credentials.json
# Or Base64-encoded for cloud deployment:
# GOOGLE_APPLICATION_CREDENTIALS_JSON=ey...

# Google Calendar
GOOGLE_CALENDAR_KEY_PATH=/path/to/calendar-credentials.json
# Or Base64-encoded:
# GOOGLE_CALENDAR_KEY_JSON=ey...

# Meta WhatsApp Cloud API
WHATSAPP_TOKEN=your_meta_system_user_access_token
WHATSAPP_PHONE_NUMBER_ID=your_meta_phone_number_id
WHATSAPP_VERIFY_TOKEN=receptora123
```

---

## 🧪 Testing
```bash
npm test
```
All unit and integration test suites are written with Jest.
