# ARCHITECTURE DECISION REPORT

**Date:** June 10, 2026  
**Auditor:** Buffy — Principal Software Architect  
**Subject:** Backend Platform Selection for CP Designer ICCP Engineering Platform  
**Status:** DECISION REQUIRED — Do not implement until approved

---

## Executive Summary

CP Designer is transitioning from a localStorage-only SPA to a professional multi-user engineering platform. This report evaluates three backend architectures for cloud synchronization, multi-user support, and long-term SaaS readiness.

**Recommendation: Supabase (PostgreSQL)** as the primary backend, with Firebase Auth as an optional secondary authentication provider.

**Rationale:** Engineering data is deeply relational (projects → stations → segments → calculations → revisions). PostgreSQL's relational model, ACID transactions, row-level security, and data portability are fundamentally better suited than Firestore's NoSQL document model for this domain. Supabase provides all of this with lower vendor lock-in and more predictable pricing.

---

## Current Architecture Assessment

### Data Model (from projectStore.js)

```
Project (1)
├── id, projectNumber, clientName, status, designStandard
├── stations[] (N)
│   ├── id, name, location, designMode
│   ├── pipelineSegments[] (N)
│   │   └── id, od, wallThk, lengthM, opTempC, coatingType...
│   ├── groundbed { type, startDepthM, anodeLengthM, boreholeDiaM... }
│   ├── anodeSpec { id, type, weightKg, outputAmps, consumptionRate... }
│   ├── cables { anodeTailLengths[], posMainLengthM, negMainLengthM... }
│   ├── tr { ratedVoltage, ratedCurrent, backEMF, structureResistance }
│   ├── lastCalcResult { 30+ fields: current, groundbed, cable, TR, life, BOM }
│   ├── insights[] (N)
│   ├── alternatives[] (N)
│   └── validationErrors
├── revisions[] (N)
│   └── id, revNumber, description, snapshot (full project copy)
└── attenuationInput/result
```

### Current Persistence

| Layer | Technology | Status |
|-------|-----------|--------|
| State | Zustand + Immer | ✅ Production-ready |
| Persistence | localStorage (via persist middleware) | ⚠️ Works but 5MB limit, no multi-user |
| Auth | Firebase Auth (partially wired) | ⚠️ Auth only, no data sync |
| Calculation Engine | Pure JS modules | ✅ Stateless, testable |
| Reporting | jsPDF + xlsx | ✅ Client-side generation |

### Engineering Data Characteristics

| Characteristic | Value | Implication |
|---------------|-------|-------------|
| Data type | Deeply relational, hierarchical | Relational DB preferred |
| Typical project size | 1-5 stations × 10-50 fields each | Small-to-medium documents |
| Calculation results | 30+ numeric fields per station | Structured, queryable data |
| Revisions | Full project snapshots (~50KB each) | Version control needed |
| Attachments | PDF reports, Excel files, images | Object storage needed |
| Access pattern | Read-heavy (dashboard loads, validation) | Read replicas helpful |
| Concurrent users | 1-5 per project (engineering team) | Low concurrency, high consistency |
| Offline requirement | Field work in remote pipeline areas | Offline-first important |

---

## Option 1: Firebase (Full Stack)

### Architecture

```
Browser (Zustand) ←→ Firebase SDK ←→ Firestore (NoSQL)
                                    ←→ Firebase Auth
                                    ←→ Firebase Storage
```

### Pros

| Advantage | Detail |
|-----------|--------|
| Offline-first | Best-in-class offline persistence with automatic sync |
| Real-time sync | Native real-time listeners, instant updates |
| Setup speed | Fastest to prototype, minimal backend code |
| Auth ecosystem | Google, Apple, email/password, SAML — all built-in |
| CDN | Global edge network for hosting and storage |
| Mobile-ready | Native SDKs for iOS, Android, Flutter |

### Cons

| Disadvantage | Detail |
|-------------|--------|
| NoSQL data model | **Critical mismatch.** Engineering data is relational. Firestore's document/collection model forces denormalization and makes JOINs impossible. |
| Query limitations | Cannot do `SELECT * FROM stations WHERE lastCalcResult.designLifeYears < target` without client-side filtering |
| No transactions across collections | Cannot atomically update project + station + revision in a single transaction |
| Vendor lock-in | Highest of all options. Firestore is proprietary GCP. Migration requires rewriting all data access layers |
| Pricing unpredictability | Pay-per-read/write. A dashboard load that scans 50 documents = 50 reads. At scale, costs are hard to predict |
| No SQL queries | Cannot run complex engineering queries (e.g., "find all projects with failing validation checks across all stations") |
| Data export | No native SQL export. Must write custom scripts to transform NoSQL documents |

### Pricing (Blaze Plan)

| Service | Free Tier | Pay-as-you-go |
|---------|-----------|---------------|
| Firestore Reads | 50K/day | $0.06/100K |
| Firestore Writes | 20K/day | $0.18/100K |
| Firestore Storage | 1 GB | $0.18/GB/month |
| Auth Users | 50K MAU | $0.01-0.05/MAU |
| Storage | 5 GB | $0.026/GB/month |
| Hosting | 10 GB | $0.026/GB |

**Estimated monthly cost at 100 projects, 500 stations, 10 users:**
- ~2K reads/day (dashboard loads) = ~$0.36/month
- ~500 writes/day (edits) = ~$2.70/month
- Storage (100 projects × 50KB) = ~$0.01/month
- Auth (10 users) = Free
- **Total: ~$3-5/month** (but scales unpredictably with usage)

### Engineering Data Suitability: ⭐⭐ (Poor)

The NoSQL model forces the engineering data into awkward document structures. Revision snapshots (full project copies) work in documents, but relational queries across projects/stations don't. The attenuation data (timeseries arrays) fits documents well, but the BOM, validation checks, and optimization alternatives are better modeled as relational tables.

### Multi-Project Suitability: ⭐⭐⭐ (Adequate)

Each project can be a Firestore document. But cross-project queries (e.g., "all projects by client X with failing stations") require client-side filtering.

### Audit Trail Support: ⭐⭐ (Poor)

Firestore has no native audit trail. You'd need Cloud Functions to log every write to a separate audit collection. Revision snapshots work but are expensive (full document copies).

---

## Option 2: Supabase (Full Stack)

### Architecture

```
Browser (Zustand) ←→ Supabase JS Client ←→ PostgreSQL (Relational)
                                          ←→ Supabase Auth
                                          ←→ Supabase Storage
```

### Pros

| Advantage | Detail |
|-----------|--------|
| **Relational model** | Perfect fit for engineering data. Projects, stations, segments, calculations, revisions — all modeled as proper tables with foreign keys |
| SQL queries | Full PostgreSQL power: JOINs, CTEs, window functions, aggregations |
| Row-Level Security | Database-enforced access control that cannot be bypassed by client code |
| ACID transactions | Atomic updates across project + station + revision |
| Data portability | Standard PostgreSQL. Migrate to any provider (AWS RDS, self-hosted) with zero code changes |
| Predictable pricing | Tiered plans, not per-operation. Budget forecasting is straightforward |
| Open source | Supabase is open-source. Self-host if needed |
| Extensions | `pgvector` for AI, `pg_cron` for scheduled tasks, `pgaudit` for audit trails |
| Edge Functions | Serverless Deno functions for complex business logic |

### Cons

| Disadvantage | Detail |
|-------------|--------|
| Offline support | **Not native.** Must implement with service workers + IndexedDB sync queue. More work than Firebase |
| Real-time | Good (Postgres logical replication) but not as seamless as Firestore |
| Setup complexity | Requires schema design, RLS policies, API configuration |
| Mobile SDKs | Less mature than Firebase for native mobile |
| Free tier pauses | Projects pause after 1 week of inactivity on free tier |

### Pricing

| Tier | Monthly Cost | Key Features |
|------|-------------|--------------|
| Free | $0 | 500MB DB, 1GB storage, 50K MAU, pauses after 1 week inactivity |
| Pro | $25 | 8GB DB, 100GB storage, 100K MAU, spend cap, email support |
| Team | $599 | SOC2/ISO 27001, team access controls, higher limits |
| Enterprise | Custom | Dedicated support, SLAs, custom security |

**Estimated monthly cost at 100 projects, 500 stations, 10 users:**
- Pro plan: $25/month
- Storage (100 projects × 50KB + PDFs) = ~$0.50/month
- Auth (10 users) = Free (under 100K MAU)
- **Total: ~$25-30/month** (predictable, no surprise bills)

### Engineering Data Suitability: ⭐⭐⭐⭐⭐ (Excellent)

PostgreSQL is the gold standard for structured engineering data:

```sql
-- Find all projects with failing validation checks
SELECT p.project_number, s.name, COUNT(vc.*) as fail_count
FROM projects p
JOIN stations s ON s.project_id = p.id
JOIN validation_checks vc ON vc.station_id = s.id AND vc.status = 'fail'
GROUP BY p.id, s.id
HAVING COUNT(vc.*) > 0;

-- Compare design alternatives across all projects
SELECT p.project_number, a.label, a.design_life_years
FROM alternatives a
JOIN stations s ON s.id = a.station_id
JOIN projects p ON p.id = s.project_id
WHERE a.design_life_years > s.target_design_life
ORDER BY a.design_life_years DESC;
```

### Multi-Project Suitability: ⭐⭐⭐⭐⭐ (Excellent)

Native relational queries across projects. Dashboard queries, cross-project analytics, and reporting are trivial SQL.

### Audit Trail Support: ⭐⭐⭐⭐⭐ (Excellent)

PostgreSQL triggers + `pgaudit` extension provide database-level audit trails:
```sql
CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  table_name TEXT,
  record_id UUID,
  action TEXT,
  old_data JSONB,
  new_data JSONB,
  user_id UUID,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Option 3: Hybrid (Firebase Auth + PostgreSQL Data)

### Architecture

```
Browser (Zustand) ←→ Firebase Auth (authentication only)
                  ←→ Supabase/PostgreSQL (all data)
```

### Pros

| Advantage | Detail |
|-----------|--------|
| Best auth ecosystem | Firebase Auth's Google/Apple/SAML providers are unmatched |
| Best data model | PostgreSQL for all engineering data |
| Incremental migration | Can keep existing Firebase Auth code, just add data layer |
| Auth portability | Firebase Auth is free up to 50K MAU |
| Data independence | Data layer is not tied to auth provider |

### Cons

| Disadvantage | Detail |
|-------------|--------|
| Two vendors | Auth from Google, data from Supabase. Two dashboards, two billing accounts |
| Auth sync | Must sync Firebase Auth UIDs to PostgreSQL users table |
| Added complexity | Two SDKs, two config files, two sets of credentials |
| RLS integration | Row-level security must map Firebase Auth UIDs to PostgreSQL user IDs |

### Pricing

| Service | Cost |
|---------|------|
| Firebase Auth | Free up to 50K MAU |
| Supabase Pro | $25/month |
| **Total** | **~$25-30/month** (same as Supabase alone) |

### Engineering Data Suitability: ⭐⭐⭐⭐⭐ (Same as Supabase)

### Multi-Project Suitability: ⭐⭐⭐⭐⭐ (Same as Supabase)

### Audit Trail Support: ⭐⭐⭐⭐⭐ (Same as Supabase)

---

## Comparison Matrix

| Criteria | Firebase | Supabase | Hybrid | Winner |
|----------|:--------:|:--------:|:------:|:------:|
| **Data model fit** | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Supabase |
| **Query power** | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Supabase |
| **Offline support** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | Firebase |
| **Auth ecosystem** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Firebase/Hybrid |
| **Vendor lock-in** | ⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Supabase |
| **Pricing predictability** | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Supabase |
| **Audit trail** | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Supabase |
| **Data portability** | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Supabase |
| **Setup speed** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | Firebase |
| **Future SaaS readiness** | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Supabase |
| **Revision/versioning** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Supabase |
| **Multi-project queries** | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Supabase |
| **Collaboration features** | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Supabase/Hybrid |
| **Offline-first field work** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | Firebase |

---

## Cost Analysis (3-Year Projection)

### Scenario: 200 projects, 1000 stations, 25 users, 500 PDF reports

| Year | Firebase (Blaze) | Supabase (Pro) | Hybrid |
|------|------------------|----------------|--------|
| Year 1 | $60-120/month | $25-50/month | $25-50/month |
| Year 2 | $150-400/month | $50-100/month | $50-100/month |
| Year 3 | $300-800/month | $100-200/month | $100-200/month |
| **3-Year Total** | **$3,000-10,000** | **$1,000-2,500** | **$1,000-2,500** |

Firebase costs scale with operations (reads/writes), making them unpredictable. Supabase costs scale with compute/storage, making them predictable.

---

## Offline Strategy Comparison

### Firebase: Native Offline
- Automatic IndexedDB persistence
- Automatic sync when online
- Conflict resolution built-in
- **Zero code required**

### Supabase: Custom Offline (Recommended Approach)
```
1. Service Worker caches SPA shell (instant load)
2. IndexedDB stores pending writes (offline queue)
3. On sync: push pending writes, pull latest state
4. Optimistic UI updates (show changes immediately)
5. Conflict resolution: last-write-wins (simplest) or CRDT (collaborative)
```

**Estimated effort:** 2-3 weeks to implement a robust offline layer with Supabase.

### Hybrid: Same as Supabase
- Auth works offline (Firebase Auth has offline persistence)
- Data offline requires the same custom implementation

**Verdict:** Firebase wins on offline, but the offline layer for Supabase is implementable and gives you full control.

---

## Recommendation

### Primary Recommendation: Supabase

**Choose Supabase if:**
- Engineering data integrity is paramount (it is)
- You need complex queries across projects/stations (you will)
- You want predictable costs at scale
- You need audit trails for regulatory compliance
- You want data portability and no vendor lock-in
- You're building a B2B SaaS platform

### Implementation Roadmap

| Phase | Effort | Description |
|-------|--------|-------------|
| Phase 1 | 1 week | Set up Supabase project, design PostgreSQL schema, implement auth |
| Phase 2 | 2 weeks | Data sync layer (Zustand ↔ Supabase), offline queue with IndexedDB |
| Phase 3 | 1 week | Row-level security policies, multi-tenancy |
| Phase 4 | 1 week | PDF/Excel report storage in Supabase Storage |
| Phase 5 | 2 weeks | Real-time collaboration features |
| Phase 6 | 1 week | Audit trail with pg_audit triggers |

### Recommended Schema (PostgreSQL)

```sql
-- Core tables
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  role TEXT DEFAULT 'engineer',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  project_number TEXT NOT NULL,
  client_name TEXT,
  project_name TEXT,
  status TEXT DEFAULT 'draft',
  design_standard TEXT DEFAULT 'saudiAramco',
  system_design_life_years INTEGER DEFAULT 25,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  location TEXT,
  design_mode TEXT DEFAULT 'deepwell',
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE pipeline_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID REFERENCES stations(id) ON DELETE CASCADE,
  name TEXT,
  od NUMERIC,
  wall_thk NUMERIC,
  length_m NUMERIC,
  op_temp_c NUMERIC,
  current_density_base NUMERIC,
  coating_type TEXT,
  coating_efficiency NUMERIC
);

CREATE TABLE groundbeds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID REFERENCES stations(id) ON DELETE CASCADE,
  type TEXT DEFAULT 'deepwell',
  start_depth_m NUMERIC,
  anode_length_m NUMERIC,
  borehole_dia_m NUMERIC,
  num_holes INTEGER DEFAULT 1
);

CREATE TABLE calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_id UUID REFERENCES stations(id) ON DELETE CASCADE,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  result JSONB NOT NULL,
  checks JSONB,
  insights JSONB,
  alternatives JSONB,
  bom JSONB
);

CREATE TABLE revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  rev_number TEXT NOT NULL,
  description TEXT,
  created_by TEXT,
  snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit trail
CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  table_name TEXT,
  record_id UUID,
  action TEXT,
  old_data JSONB,
  new_data JSONB,
  user_id UUID,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Attenuation data (per-project)
CREATE TABLE attenuation_inputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  input_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE attenuation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  input_id UUID REFERENCES attenuation_inputs(id) ON DELETE CASCADE,
  result_data JSONB NOT NULL,
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_stations_project_id ON stations(project_id);
CREATE INDEX idx_calculations_station_id ON calculations(station_id);
CREATE INDEX idx_revisions_project_id ON revisions(project_id);
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp);

-- Note: audit_log intentionally has no foreign key to users
-- for flexibility (deleted users' audit history preserved)

-- Row-Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own projects" ON projects
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own projects" ON projects
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own projects" ON projects
  FOR DELETE USING (auth.uid() = user_id);
```

---

## What NOT to Change

| Item | Rationale |
|------|-----------|
| Zustand store architecture | The store is already well-structured with services layer. Just replace the persistence adapter. |
| Calculation engine | Pure, stateless, testable. No changes needed. |
| Reporting engines | Client-side PDF/Excel generation. Upload to Supabase Storage after generation. |
| UI components | Domain-agnostic. No changes needed. |
| Standards framework | Config objects. No changes needed. |

---

## Migration Path from Current Architecture

The current Zustand + localStorage architecture maps cleanly to Supabase:

```
Current:                          Target:
─────────────────────────────     ──────────────────────────────
useProjectStore (Zustand)    →    useProjectStore (Zustand)
  ↓                                  ↓
persist middleware            →    Supabase sync adapter
  ↓                                  ↓
localStorage                 →    PostgreSQL (Supabase)
```

The key change is replacing the `persist` middleware's localStorage adapter with a Supabase sync adapter. The store API remains identical — pages and components don't change.

---

## Disaster Recovery & Compliance

| Concern | Supabase Pro | Details |
|---------|-------------|----------|
| **Backups** | Daily automatic (7-day retention) | RPO ≈ 24 hours. Point-in-time recovery available on Team plan |
| **RTO** | < 1 hour (self-service restore) | For critical data, consider pg_dump to external storage |
| **Encryption at rest** | AES-256 (AWS/gcp managed) | All data encrypted on disk |
| **Encryption in transit** | TLS 1.2+ enforced | All API connections encrypted |
| **SOC2** | Team plan ($599/month) | Required if selling to enterprise clients |
| **Data residency** | Choose region at project creation | EU, US, Asia-Pacific available |
| **GDPR** | Supabase supports data deletion | Export/delete user data on request |

**Recommendation:** For an engineering platform handling project data, Supabase Pro with daily backups is sufficient. If selling to enterprise clients (oil & gas companies), upgrade to Team for SOC2 compliance.

## Decision Record

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Primary backend** | Supabase (PostgreSQL) | Best fit for relational engineering data |
| **Authentication** | Supabase Auth (built-in) | Simpler than Firebase Auth hybrid, native RLS integration |
| **File storage** | Supabase Storage | PDF reports, Excel exports, project attachments |
| **Offline strategy** | Custom (Service Worker + IndexedDB) | 2-3 weeks implementation, full control |
| **Real-time** | Supabase Realtime (Postgres logical replication) | Sufficient for 1-5 concurrent users per project |
| **Audit trail** | pg_audit + triggers | Database-level,不可 bypassed by client code |
| **State management** | Keep Zustand (replace persistence layer) | Store architecture is already clean |

---

*This report should be reviewed by the project owner before implementation begins. The recommended next step is to prototype the Supabase schema and sync adapter in a proof-of-concept branch.*
