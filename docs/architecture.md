# Architecture

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Database**: Neon PostgreSQL + Prisma ORM
- **Cache**: Upstash Redis (frequent query caching only)
- **Auth**: Auth.js (NextAuth v5) — Google + GitHub OAuth
- **Email**: Resend (alert dispatch)
- **Hosting**: Vercel (frontend + API + cron)

## Data Flow

```
User Request
    │
    ▼
Next.js Server Component
    │
    ▼
Repository Layer (src/lib/repositories/)
    │
    ▼
Prisma ORM
    │
    ▼
PostgreSQL (Neon)
    │
   ─── tsvector GIN index for full-text search
   ─── GIN index on skills array
```

```
Ingestion (Vercel Cron, every 6 hours)
    │
    ▼
JobSource[] (src/lib/sources/)
    │
    ▼
Pipeline (src/lib/ingestion/pipeline.ts)
    │
    ├── Dedup by @@unique([externalId, source])
    ├── Skills extraction via SKILL_ALIASES
    ├── Write JobIngestionLog for each payload
    ├── Upsert to PostgreSQL
    └── Record SourceSync
```

## Engineering Rules

1. **Source adapters never touch Prisma** — they only return `RawJob[]`
2. **All external payloads normalize to `RawJob`** — validated with Zod
3. **Ingestion is idempotent** — `@@unique([externalId, source])` prevents duplicates
4. **Prisma queries live in repositories** — Server Components call repositories
5. **Zod everywhere** — validate API requests, source payloads, query params

## Scale Targets

| Metric | Target |
|--------|--------|
| Jobs | 50,000+ |
| Companies | 5,000+ |
| Users | 10,000+ |
| Searches/month | 100,000+ |
| Source feeds | 6 |

All on Vercel + Neon + Upstash free tiers.
