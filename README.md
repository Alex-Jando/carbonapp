# Next.js API Snippets (Suggestions + Questionnaire)

This folder now contains only the reusable pieces you asked for:
- Next.js API endpoint for suggestions: `app/api/suggestions/route.ts`
- Next.js API endpoint for questionnaire: `app/api/questionnaire/v1/route.ts`
- Questionnaire definition: `src/questionnaire.ts`
- Validation + footprint + OpenRouter helper logic under `src/`

Prisma/Fastify server code was removed.

## Environment
Create `.env.local` (or your existing Next env file) in your Next.js app:

```env
OPENROUTER_API_KEY=
MODEL_ID=google/gemini-2.0-flash-001
```

## API Endpoints

### `POST /api/suggestions`
Body:
```json
{
  "questionnaireVersion": "v1",
  "answers": {
    "q_transport_car_own": true,
    "q_transport_km_per_week": 120,
    "q_transport_fuel_type": "Gasoline/Petrol",
    "q_home_electricity_usage": "Average (typical household usage)",
    "q_diet_meat_frequency": "A few times per week",
    "q_diet_primary_meat_type": "Mix of different meats"
  }
}
```

Response includes:
- computed footprint
- assumptions
- missingQuestionIds
- AI suggestions (or `aiError: true` if model call fails)

### `GET /api/questionnaire/v1`
Returns full `QUESTIONNAIRE_V1`.
