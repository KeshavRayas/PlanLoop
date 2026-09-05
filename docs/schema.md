# Database Schema

## Enums

- `JobSource`: ADZUNA, JOOBLE, REMOTIVE, GREENHOUSE, LEVER, ASHBY
- `CompanyType`: STARTUP, MNC
- `ExperienceLevel`: ENTRY, MID, SENIOR, LEAD
- `JobType`: FULL_TIME, PART_TIME, CONTRACT, INTERNSHIP

## Models (13)

### Core Domain

| Model    | Key Fields                                                                                         | Notes                                |
| -------- | -------------------------------------------------------------------------------------------------- | ------------------------------------ |
| Company  | name, slug (unique), companyType, atsType, atsBoard                                                | Curated list seeded manually         |
| Job      | externalId + source (unique pair), title, description, skills[], searchVector (tsvector), postedAt | GIN indexes on skills & searchVector |
| SavedJob | userId + jobId (unique pair)                                                                       | Many-to-many between User and Job    |
| Alert    | userId, query, location, skills[], companyTypes[], token (unique)                                  | token used for unsubscribe           |

### Auth (Auth.js)

| Model             | Notes                                         |
| ----------------- | --------------------------------------------- |
| User              | email unique, has alerts + savedJobs + resume |
| Account           | OAuth accounts                                |
| Session           | User sessions                                 |
| VerificationToken | Email verification                            |

### Observability

| Model           | Notes                                                                                                |
| --------------- | ---------------------------------------------------------------------------------------------------- |
| SearchEvent     | Logs every search query with timestamp                                                               |
| SourceSync      | Tracks each cron run per source (startedAt, finishedAt, jobsFetched/Created/Updated, success, error) |
| JobIngestionLog | Raw JSON payload per external job fetched                                                            |

### v2 Placeholder

| Model  | Notes                                 |
| ------ | ------------------------------------- |
| Resume | userId (unique), parsedText, skills[] |

## Indexes

- `Job`: `@@unique([externalId, source])`, `@@index([source])`, `@@index([postedAt])`, `@@index([companyId])`, `@@index([remote])`, `@@index([skills], type: Gin)`
- `SearchEvent`: `@@index([createdAt])`
- `JobIngestionLog`: `@@index([source, createdAt])`
