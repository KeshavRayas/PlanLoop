# Ingestion Flow

## Trigger

Vercel Cron Job runs every 6 hours: `GET /api/cron/ingest`

## Pipeline Steps

```
1. Create SourceSync record (success=false)
2. For each JobSource implementation:
   a. Call fetchJobs()
   b. Validate each RawJob with Zod
   c. Write JobIngestionLog with raw JSON payload
   d. Extract & normalize skills via SKILL_ALIASES
   e. Upsert job to database
      ON CONFLICT (externalId, source) DO UPDATE
      SET title, description, ... , searchVector = to_tsvector(...)
   f. Update SourceSync counters
3. Mark SourceSync success=true
4. Invalidate Redis cache keys
```

## Idempotency

Running the cron multiple times is safe:

- `@@unique([externalId, source])` prevents duplicate jobs
- Prisma `upsert` updates existing records instead of creating duplicates

## Source Adapters

Each adapter implements:

```typescript
interface JobSource {
  readonly name: string;
  fetchJobs(): Promise<RawJob[]>;
}
```

| Source     | Method      | Notes                               |
| ---------- | ----------- | ----------------------------------- |
| Adzuna     | REST API    | Free tier, India/Bangalore focused  |
| Jooble     | REST API    | Free tier, global + India           |
| Remotive   | JSON feed   | No auth needed, remote jobs         |
| Greenhouse | Board JSON  | Scrapes company-specific board URLs |
| Lever      | Public API  | Scrapes company-specific postings   |
| Ashby      | Posting API | Scrapes company-specific postings   |

## Debugging

- Check `SourceSync` for per-source success/failure
- Check `JobIngestionLog` for raw payloads when sources change their response shape
