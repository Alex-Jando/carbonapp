# Carbon Pals

Hackathon project (GDG 2026). Carbon Pals helps users estimate their carbon footprint, complete AI‑tailored daily tasks, and track progress with social features.

## What This App Does

- Onboarding questionnaire to estimate baseline footprint.
- Daily AI-generated tasks (10 per day) tailored to the user.
- Task completion with optional photo proof (compressed + stored in Firebase Storage).
- Progress tracking (streaks, totals, charts).
- Social features: friends and communities.
- Public feed showing recent completed tasks.

## Tech Stack

- Next.js (App Router) + React + TypeScript
- Firebase Auth + Firestore + Firebase Storage
- OpenRouter (Gemini) for AI tasks
- Tailwind CSS + Framer Motion

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` with the following values:

```bash
OPENROUTER_API_KEY="..."
FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
NEXT_PUBLIC_FIREBASE_API_KEY="..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="..."
NEXT_PUBLIC_FIREBASE_PROJECT_ID="..."
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="..."
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="..."
NEXT_PUBLIC_FIREBASE_APP_ID="..."
BACKFILL_SECRET="..." # optional, for admin backfill route
```

Notes:

- `FIREBASE_SERVICE_ACCOUNT_JSON` must be the raw JSON string (minified is fine) wrapped in single quotes.
- If `private_key` contains `\n`, it will be normalized automatically.
- You must restart the dev server after editing `.env`.

3. Run the dev server:

```bash
npm run dev
```

## Key Pages

- `/` landing page
- `/login` and `/signup`
- `/questionnaire`
- `/home` main dashboard
- `/social` communities + friends
- `/community/[id]` community detail
- `/friend/[id]` friend profile
- `/feed` public feed

## Firestore Data Model

### `users/{uid}`

- `username: string`
- `email: string`
- `city: string`
- `initialFootprintKg: number | null`
- `carbonOffsetKgTotal: number`
- `tasksCompletedCount: number`
- `streakCurrent: number`
- `streakBest: number`
- `lastCompletionDateKey: string | null`
- `dailyTasksMeta: { dateKey: string, generatedAt: timestamp } | null`
- `dailyTasks: Array<{ id, title, carbonOffsetKg, difficulty?, reason?, dateKey, createdAt }>`
- `completedTaskIds: string[]`
- `friends: string[]`
- `communities: string[]`
- `questionnaireAnswers: object | null`
- `questionnaireVersion: string | null`
- `questionnaireCompression: object | null`
- `updatedAt: timestamp`

### `users/{uid}/completedTasks/{completionId}`

Duplicate of global completed task document for user-only access.

### `communities/{communityId}`

- `name: string`
- `members: string[]`
- `createdBy: string`
- `createdAt: timestamp`

### `completedTasks/{completionId}`

Global feed collection.

- `uid: string`
- `username: string`
- `userEmail: string | null`
- `title: string`
- `carbonOffsetKg: number`
- `imageUrl: string | null`
- `dateKey: string`
- `completedAt: timestamp`
- `sourceDailyTaskId: string | null`

### `users/{uid}/dailyStats/{dateKey}`

- `dateKey: string`
- `tasksCompleted: number`
- `carbonOffsetKg: number`
- `updatedAt: timestamp`

### `globalDailyStats/{dateKey}`

- `dateKey: string`
- `tasksCompleted: number`
- `carbonOffsetKg: number`
- `updatedAt: timestamp`

### `globalMeta/totals`

- `tasksCompleted: number`
- `carbonOffsetKg: number`
- `updatedAt: timestamp`

## API Routes (App Router)

### Auth + Profile

- `POST /api/signup`
- `POST /api/login`
- `POST /api/logout`
- `GET /api/profile`

### Questionnaire

- `GET /api/questionnaire/v1`
- `POST /api/questionnaire/submit`
- `POST /api/questionnaire/reset`

### Daily Tasks

- `GET /api/daily-tasks`
- `POST /api/complete-task`

### Social

- `POST /api/social/add-friend`
- `POST /api/social/create-community`
- `POST /api/social/join-community`
- `GET /api/social/me`
- `GET /api/social/user`
- `GET /api/social/community`
- `GET /api/social/all-communities`

### Feed / Stats

- `GET /api/feed`
- `GET /api/home-stats`
- `GET /api/completed-tasks`

### Admin

- `POST /api/admin/backfill-completed` (requires `BACKFILL_SECRET`)

## AI Task Generation

Tasks are generated via OpenRouter using the Gemini model:

- `google/gemini-2.0-flash-exp`
- Output is strict JSON
- Exactly 10 tasks per day
- Carbon reduction is clamped to 1–10 kg

## Image Proof Compression

On `/home`, task proof images are:

- Resized to 300x300
- Compressed to JPEG (quality 0.4)
- Uploaded to `taskProof/{uid}/{dateKey}/{taskId}.jpg`

## Common Issues

### "Unable to detect a Project Id"

- Ensure `FIREBASE_SERVICE_ACCOUNT_JSON` is valid JSON in `.env`
- Use single quotes around the JSON
- Restart the dev server

### Firestore Index Errors

Some queries may require composite indexes. The Firestore console link in the error will create the index automatically.

## Contributors

- Alexander Jando
- Chris Li
- Ben Rosa
- Sophia Bianchi

