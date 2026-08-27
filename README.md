# ReflectX — Empathetic Reflection Companion & Journaling Partner

An insightful, empathetic reflection companion and mindful journaling partner built to help individuals deepen self-awareness, explore emotions, process complex thoughts, and gain internal clarity. Rather than offering unsolicited advice, preachiness, or diagnostic therapy, the companion acts as a grounded mirror and Socratic guide.

---

## Features

- **Empathetic Reflection Mirror**: Real-time dialogue guided by active validation, pattern highlighting, and concise Socratic inquiry (at most 1–2 open-ended questions per turn).
- **Distraction-Free Journal Studio**: Mindful writing canvas with emotion tone tagging, word counter, and the ability to invite the companion to mirror a written page.
- **Cognitive & Emotional Synthesis**: Structured takeaways identifying core emotions, recognized behavioral/cognitive patterns, and grounding affirmations.
- **Socratic Prompt Explorer**: Curated and dynamically generated inquiry cards categorized across decision making, boundaries, self-compassion, transitions, and emotional clarity.
- **Grounding & Safety Architecture**: Integrated 4-7-8 breathing pacer and immediate crisis safety resources (988 Lifeline, Crisis Text Line 741741, and global directories).
- **Zero-Crash Persistent Archive**: Local persistence with defensive undefined-stripping, search, mood filters, Markdown export, and full JSON backup/restore.

---

## Production Security & Threat Model

| Threat Zone | Identified Risk | Production Countermeasure |
| :--- | :--- | :--- |
| **Input Surfaces** | Prompt injection, malicious payloads, payload bloat | Strict JSON payload limits (1MB), sanitization, defensive null-safe destructuring, plain-data system prompt framing. |
| **Planning & Reasoning** | System persona deviation, toxic positivity, prescriptive advice | Robust multi-layer system instructions with strict negative constraints ("No Prescriptive Advice", "Never say 'look on the bright side'"). |
| **Tool Execution & API** | Upstream API failure, rate limiting (429/503) | Resilient Gemini Model Fallback Ladder (`gemini-3.7-flash` &rarr; `gemini-3.1-flash-lite` &rarr; `gemini-flash-latest`). |
| **Memory & State** | Corrupted payloads, undefined property exceptions in persistence | Recursive `sanitizePayload` utility stripping all `undefined` values before serialization; safe error fallbacks. |
| **Inter-System / Secrets** | API Key leakage in client bundle | Zero client exposure; backend API proxy on Express with server-only `process.env.GEMINI_API_KEY`. |

---

## Google Cloud Run Deployment & Configuration Guide

### 1. Prerequisites & GCP API Activation

Ensure you have the Google Cloud SDK (`gcloud`) installed and authenticated:

```bash
# Set your active GCP project
gcloud config set project YOUR_PROJECT_ID

# Enable required Google Cloud APIs
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com
```

### 2. Secret Management Setup (Zero-Hardcoding)

Create and populate the `GEMINI_API_KEY` secret in Google Cloud Secret Manager:

```bash
# Create and populate the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# Grant the default Cloud Run service account access to read the secret
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:YOUR_PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 3. Firestore Database & Security Rules

When using Cloud Firestore for multi-device sync, enforce owner-bound data isolation:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/interactions/{interactionId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Deploy the rules via Firebase CLI:
```bash
firebase deploy --only firestore:rules
```

### 4. Deploy to Google Cloud Run

Build and deploy the application container to Cloud Run:

```bash
gcloud run deploy reflection-companion \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest \
  --port 3000
```

### 5. Mandatory Campaign Labeling

Apply the mandatory challenge verification label to your deployed Cloud Run service:

```bash
gcloud run services update reflection-companion \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=us-central1
```

---

## Local Development

1. Copy `.env.example` to `.env` and provide your `GEMINI_API_KEY`:
   ```bash
   cp .env.example .env
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Open `http://localhost:3000` in your browser.
