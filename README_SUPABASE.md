# Supabase setup

You gave:
- project ref/id: `anixdzawchtmsalsvvmz`
- URL: `https://anixdzawchtmsalsvvmz.supabase.co`

## 1) Create table

In Supabase Dashboard → SQL Editor, run:
- `supabase/schema.sql`

Optional hardening:
- `supabase/rls.sql`

## 2) Netlify env vars

In Netlify → Site settings → Environment variables:
- `SUPABASE_URL` = `https://anixdzawchtmsalsvvmz.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` = (service role JWT)
- `INGEST_API_KEY` = (optional shared secret; recommended)

## 3) Endpoints

- List: `/.netlify/functions/events-list?limit=200&agent=A1&status=sent`
- Ingest (POST): `/.netlify/functions/events-ingest`

Example ingest payload:
```json
{
  "apiKey": "YOUR_INGEST_API_KEY",
  "row": {
    "agent": "agent-01",
    "platform": "Facebook",
    "source_group": "Skool - Freelance",
    "action_type": "comment",
    "status": "sent",
    "message": "Nice post — I can help...",
    "event_key": "oc_2026-03-02T17:00:00Z_agent-01_001"
  }
}
```

## Important

Never expose the `SUPABASE_SERVICE_ROLE_KEY` in frontend JS.
