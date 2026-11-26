# VRAP — Vendor Risk Assessment Portal

A traceable, risk-based third-party risk management (TPRM) portal for vendor assessment and operational-resilience review. The portal supports a complete vendor lifecycle — central inventory, tailored questionnaires, evidence tracking, explainable risk scoring, regulatory coverage, continuous monitoring, human approvals, audit reporting, and role-based access control (RBAC) with per-account credentials.

> **Status:** complete and verified end-to-end — production build passes, lint is clean, and every role/page/permission path was exercised against a running instance (see [Verification & testing](#verification--testing)).

---

## Table of contents

1. [About](#about)
2. [Audience & intended use](#audience--intended-use)
3. [Demo accounts (sign in with email + password)](#demo-accounts-sign-in-with-email--password)
4. [Core capabilities](#core-capabilities)
5. [Standards & regulatory coverage](#standards--regulatory-coverage)
6. [Risk-scoring model](#risk-scoring-model)
7. [Access control & RBAC](#access-control--rbac)
8. [Getting started](#getting-started)
9. [Deploying to Vercel](#deploying-to-vercel)
10. [Suggested demo walkthrough](#suggested-demo-walkthrough)
11. [Architecture & data model](#architecture--data-model)
12. [Verification & testing](#verification--testing)
13. [Security notes](#security-notes)
14. [Evaluation & validation](#evaluation--validation)
15. [Limitations & out of scope](#limitations--out-of-scope)
16. [Changelog](#changelog)

---

## About

**VRAP exists to make third-party risk visible, traceable and human.** Instead of a spreadsheet graveyard, every vendor gets one profile — services they touch, their inherent exposure, their evidence over time, their resilience readiness, their compliance coverage against 14 frameworks — and every decision (approve / conditionally approve / hold) is made by a named human, recorded with a rationale, and written to an immutable audit trail.

**Who it is for**

| Persona | Role in VRAP | What they do all day |
|---------|--------------|----------------------|
| Administrator (Dhanraj Rana) | Full control | Provision accounts, reset passwords, configure the scoring model, oversee everything |
| Reviewer (Raj Jadav) | Evidence & rationale | Verify evidence, raise findings/actions, send assessments for decision |
| Approver (Chaitanya Nagre) | Human decision | Approve, conditionally approve or hold assessments; approve exceptions |
| Vendor representative (Jenil Dalal — Nimbus) | Scoped supplier | Answer the questionnaire and register evidence — only for their own vendor record |
| Auditor (Elena Rossi) | Read-only | Reports, compliance matrix, monitoring log and the audit trail — cannot change anything |

**What makes it different**

- **Explainable scoring** — every number on screen decomposes into factors you can inspect and tune (never a black box).
- **Evidence confidence, not evidence theatre** — expired evidence quietly lowers confidence; it never auto-fails a control and never silently disappears.
- **Resilience kept separate** — continuity plan and exercise readiness are reported next to cyber risk, not averaged into it.
- **Human decisions only** — scores rank and inform; people decide, and the audit trail proves it.
- **Works out of the box** — PGlite (WASM Postgres) means zero external database; `npm install && npm run dev` is the whole setup.

The in-app **About & help** page (`/about`) mirrors this section for signed-in users.

---

## Audience & intended use

VRAP supports five role-based personas (four operational roles plus a read-only auditor). Evaluation of the prototype is intended to be conducted through scenario-based tasks and intended-user feedback, subject to required approvals (faculty guide / institutional ethics clearance as applicable).

## Demo accounts (sign in with email + password)

Sign in at `/login` with your **email (user ID)** and **password**. Passwords are stored as scrypt hashes — never in plain text.

| Persona | Email / user ID | Password | Role | Scope |
|---------|-----------------|----------|------|-------|
| Dhanraj Rana | `dhanraj.rana@demo.vrap` | `admin123` | Administrator | Full system access (users, scoring model, everything) |
| Raj Jadav | `raj.jadav@demo.vrap` | `reviewer123` | Reviewer | Evidence verification, findings, review flow |
| Chaitanya Nagre | `chaitanya.nagre@demo.vrap` | `approver123` | Approver | Assessment decisions, exception approvals |
| Jenil Dalal (Nimbus) | `jenil.dalal@demo.vrap` | `vendor123` | Vendor representative | Nimbus Cloud Hosting only — answers & evidence |
| Elena Rossi | `elena.rossi@demo.vrap` | `auditor123` | Auditor | Read-only portfolio, reports, compliance, monitoring, audit trail |

> These are demonstration credentials for fictional users. Change them (Access control → Reset password) before any real use, and never commit real credentials. When the demo database is re-seeded (CLI, `POST /api/seed`), these accounts are recreated with exactly these passwords.

New accounts are provisioned by an administrator on the **Access control** page (`/access`): name, email, role, vendor scope (for vendor reps) and a temporary password. The administrator can reset any account's password at any time; resetting invalidates the old password immediately.

## Core capabilities

### Central vendor inventory

Maintain a single register of vendors with:
- Vendor profile: name, category, country, owner, contacts
- Inherent exposure factors (1–5): service criticality, data sensitivity, system access, geographic exposure
- Personal-data and AI-use screening flags (DPDP / GDPR / ISO 42001 scoping)
- Contract, DPA status, data categories, cross-border transfers, exit-plan status, and insurance expiry
- Lifecycle status: intake, assessment, review, monitoring, reassessment_due, offboarded

### Service & dependency mapping

Map vendors to business services with dependency level (primary / partial / backup) and concentration percentage. Criticality and concentration feed the inherent risk score and surface single-point-of-failure warnings.

### Tailored questionnaires

Versioned questionnaire templates with weighted questions grouped by domain. Questionnaires are tailored to the vendor's risk tier, and each question carries standards/regulatory traceability (control references). Responses (yes / partial / no / N/A) auto-submit and feed control-effectiveness scoring.

### Evidence register & review

Register evidence items per vendor with type, owner, validity date, version, and reviewer status (submitted / verified / rejected / clarification requested). Expired or stale evidence automatically lowers evidence confidence and surfaces attention items.

### Explainable risk scoring

- **Inherent exposure** — weighted sum of five intake factors.
- **Control effectiveness** — weighted average of questionnaire responses.
- **Residual view** — inherent × (1 − mitigation cap × control effectiveness / 100).
- **Evidence confidence** — based on evidence completeness and freshness.
- **Resilience readiness** — reported separately (continuity plan 50%, exercise outcome 40%, exercise recency 10%).

All scoring parameters are configurable by the administrator and persisted, with changes recorded in the audit trail. No score alone approves a supplier — every decision is human, recorded, and auditable.

### Standards & regulatory coverage

Fourteen frameworks are pre-catalogued with regional scope, category, and applicability rules:
- ISO/IEC 27001:2022, NIST CSF 2.0, NIST SP 800-161 Rev.1 (C-SCRM)
- SOC 2 (TSC), PCI-DSS 4.0.1
- EU GDPR, EU DORA, EU NIS2 Directive
- India DPDP Act 2023, CERT-In Directions 2022
- RBI / SEBI / IRDAI regulated outsourcing frameworks
- CSA Cloud Controls Matrix, Shared Assessments SIG
- ISO/IEC 42001 (AI Management System)

Each vendor is automatically mapped to applicable frameworks based on its profile, and compliance status (not assessed / compliant / partial / non-compliant / N/A) is recorded per framework and exposed through a coverage heatmap.

### Continuous monitoring

Record vendor incidents with severity and status, register fourth parties / sub-processors with DPA status and data categories, and manage reassessment triggers (scheduled, incident, evidence expiry, contract change, regulatory, manual). High-severity incidents automatically raise a reassessment trigger.

### Findings, actions, exceptions & approvals

Raise severity-rated findings, create time-bound remediation actions with owners, propose and approve/retire risk exceptions with compensating controls, and record human assessment decisions with rationale and reassessment horizons.

### Audit reporting & audit trail

Generate stored, reproducible audit reports (portfolio, vendor, compliance, audit trail, evidence, findings, access, evaluation) with a point-in-time snapshot. Every significant action — including sign-ins, failed sign-ins, deactivations and password resets — is written to an immutable audit trail with actor, entity, action, detail, and timestamp.

### Access control & RBAC

Role-based permissions are enforced on every server action **and** every page guard. Vendor representatives are scoped to their own vendor record. Deactivated accounts cannot sign in (and existing sessions lose access immediately). An administrator provisions users, assigns roles, resets passwords and manages account state through the access-control page.

### Prototype evaluation

Scenario-based evaluation tasks with a Likert feedback instrument (completion, ease, clarity, traceability, usefulness) capture intended-user feedback for review and validation.

## Standards & regulatory coverage

| Code | Name | Region | Category | Applies when |
|------|------|--------|----------|--------------|
| ISO27001-2022 | ISO/IEC 27001 ISMS | Global | Cyber | All vendors |
| NIST-CSF-2.0 | NIST Cybersecurity Framework 2.0 | Global | Cyber | All vendors |
| NIST-CSCRM | NIST SP 800-161 Rev.1 C-SCRM | Global | Cyber | All vendors |
| SOC2 | AICPA SOC 2 Trust Services Criteria | Global | Cyber | All vendors |
| PCI-DSS-4.0 | PCI DSS Payment Card Industry | Global | Financial | Payment-card handling |
| GDPR | EU General Data Protection Regulation | EU | Privacy | Processes personal data |
| DPDP-2023 | India Digital Personal Data Protection Act | India | Privacy | Processes personal data |
| DORA | EU Digital Operational Resilience Act | EU | Financial | ICT / cloud / payments |
| NIS2 | EU NIS2 Directive | EU | Cyber | Critical / cloud services |
| CERT-IN-2022 | CERT-In Incident Reporting Directions | India | Operational | All vendors |
| RBI-SEBI | RBI / SEBI / IRDAI outsourcing frameworks | India | Financial | Payments / personal data |
| CSA-CCM | CSA Cloud Controls Matrix & CAIQ | Global | Cyber | Cloud / SaaS vendors |
| SIG | Shared Assessments Standardized Information Gathering | Global | Cyber | All vendors |
| ISO42001-AI | ISO/IEC 42001 AI Management System | Global | AI | AI use flag set |

## Risk-scoring model

The scoring model is documented and configurable:

**Inherent exposure (0–100):**
- Service criticality — 30%
- Data sensitivity — 25%
- System access / integration — 20%
- Dependency / concentration — 15%
- Geographic exposure — 10%

Each factor is captured on a 1–5 scale at intake and mapped to 20/40/60/80/100.

**Control effectiveness:** weighted average of questionnaire responses (yes = 100, partial = 50, no = 0; N/A excluded).

**Residual view:** inherent × (1 − mitigation cap × CE / 100), with a default mitigation cap of 65%.

**Tier thresholds (inherent score):** low < 40, moderate 40–59, high 60–79, critical ≥ 80 (configurable).

**Evidence confidence:** weighted by question importance and evidence status (verified / submitted / stale / missing / rejected).

**Resilience readiness:** plan 50% + exercise outcome 40% + exercise recency 10%, reported separately from cyber risk.

The administrator can adjust weights, the mitigation cap, and tier thresholds on the Scoring model page; changes apply to all assessments and are audited.

## Access control & RBAC

| Permission | Admin | Reviewer | Approver | Vendor | Auditor |
|------------|-------|----------|----------|--------|---------|
| Vendor intake & service mapping | ✓ | ✓ | | | |
| Answer questionnaires & register evidence | ✓ | | | ✓ (own vendor) | |
| Verify evidence, findings, rationale | ✓ | ✓ | | | |
| Approve / hold assessments | ✓ | | ✓ | | |
| Approve exceptions | ✓ | | ✓ | | |
| Manage users & access (incl. password resets) | ✓ | | | | |
| Configure scoring model | ✓ | | | | |
| Manage questionnaires | ✓ | ✓ | | | |
| Manage compliance records | ✓ | ✓ | | | |
| Manage monitoring (incidents, triggers) | ✓ | ✓ | | | view |
| Generate audit reports | ✓ | ✓ | ✓ | | ✓ |
| View audit trail & reports | ✓ | ✓ | ✓ | | ✓ |
| Submit evaluation feedback | ✓ | ✓ | ✓ | ✓ | ✓ |

**Enforcement summary**

- Every server action calls `can(user, action)` (or an equivalent role/ownership check) and writes an audit event.
- Every page under `(app)` requires a session; role-specific pages redirect otherwise (e.g. `/access` and `/settings` are admin-only; `/monitoring` is admin/reviewer/auditor-view).
- Vendor representatives are double-scoped: page redirects **and** per-action `vendorId` ownership checks.
- Auditors are strictly read-only; their navigation omits all write surfaces and the server rejects write attempts.
- Deactivated accounts fail sign-in and lose existing sessions immediately (sessions re-check `isActive` on every request).

## Getting started

VRAP runs on **PGlite**, a real PostgreSQL database compiled to WebAssembly. No external database server, `DATABASE_URL`, or migration step is required for the demonstration.

### Prerequisites

- Node.js v20 or later
- npm

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Load the fictional demonstration dataset (wipes and re-seeds, incl. passwords)
npm run db:seed

# 3. Start the development server
npm run dev
```

The application is available at `http://localhost:3000` — sign in with any [demo account](#demo-accounts-sign-in-with-email--password).

> `npm run db:seed` runs `tsx src/db/seed.ts`. On first app start with an empty PGlite data directory the schema is created and demo data is auto-seeded automatically.

### Using an external PostgreSQL database (optional)

To run against a real PostgreSQL instance instead of PGlite:

```bash
# Create .env with your connection string
echo "DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db" > .env
echo "VRAP_SESSION_SECRET=$(openssl rand -hex 32)" >> .env

# Create tables
npx drizzle-kit push --force

# Seed demonstration data
npm run db:seed

# Start
npm run dev
```

## Deploying to Vercel

VRAP deploys to [Vercel](https://vercel.com) with zero configuration. On Vercel, PGlite runs **in-memory** (the serverless filesystem is ephemeral), so the database is auto-created and auto-seeded with the fictional demo dataset on every cold start — including user accounts (it takes a few seconds on the first hit per instance).

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/dhanraj5893/VRAP1)

### Manual deploy

1. Push this repository to GitHub.
2. In the Vercel dashboard, click **Add New Project** and import your GitHub repo.
3. Under **Environment Variables**, add:
   - `VRAP_SESSION_SECRET` — any long random string (used to sign session cookies). Generate one with `openssl rand -hex 32`.
4. Leave `DATABASE_URL` **unset** — this tells VRAP to use PGlite instead of external Postgres.
5. Click **Deploy**. `vercel.json` pins the `bom1` (Mumbai) region, framework `nextjs`, and the default install/build commands.

### Notes for the Vercel deployment

- Each serverless cold start creates a fresh in-memory PGlite database, auto-seeded with demo data (8 vendors, 14 standards, 5 role accounts, questionnaires, evidence, audit reports, etc.).
- **Sessions survive cold starts.** Session tokens key the user by email (not just serial id), so signing out is not forced when the demo database is re-created.
- To force a re-seed without redeploying, call `POST /api/seed` (e.g. `curl -X POST https://your-app.vercel.app/api/seed`).
- Data does **not** persist across cold starts on Vercel (ephemeral filesystem). For persistent data, connect an external PostgreSQL via `DATABASE_URL` (e.g. Vercel Postgres, Neon, Supabase) and run `npm run db:seed` once against it.
- `POST /api/seed` refuses to run in external-Postgres mode (it is a PGlite demo convenience only).

## Suggested demo walkthrough

1. **Sign in as Dhanraj Rana (`dhanraj.rana@demo.vrap` / `admin123`)** — review the portfolio command center: KPIs, tier distribution, evidence freshness, resilience watch, focus cards.
2. **Vendor register → Nimbus Cloud Hosting** — examine inherent exposure, service dependencies (90% concentration on the customer portal), evidence register, resilience gap, and contract / DPDP / exit record.
3. **Regulatory coverage** — open the standards × vendor heatmap; record compliance status for applicable frameworks.
4. **Incidents & triggers** — review recorded incidents and sub-processors; raise or resolve a reassessment trigger.
5. **Assessments → Nimbus v2 (in review)** — walk the explainable scoring panel, questionnaire, linked evidence, and reviewer workspace.
6. **Sign in as Chaitanya Nagre (`approver123`)** — record a conditional approval with rationale and reassessment horizon from the decision inbox.
7. **Sign in as Jenil Dalal (`vendor123`)** — confirm the vendor-scoped view showing only Nimbus data; submit responses and register evidence.
8. **Sign in as Elena Rossi (`auditor123`)** — confirm read-only mode: reports, compliance matrix and monitoring visible; no edit affordances anywhere; write actions are rejected server-side.
9. **Scoring model (administrator)** — adjust inherent weights, mitigation cap, or tier thresholds and observe the impact.
10. **Access control (administrator)** — provision an account, reset a password, deactivate/reactivate it, review the RBAC matrix.
11. **Reports → Generate reports** — produce a portfolio, vendor, compliance, audit-trail, evidence, findings, access, or evaluation report; view or print it.
12. **Evaluation** — complete the four scenario tasks and submit Likert feedback.
13. **About & help** — the in-app guide to roles, modules and the scoring model.

## Architecture & data model

- **Framework:** Next.js 16 (App Router, server actions), React 19, TypeScript, Tailwind CSS 4
- **Database:** PGlite (WASM Postgres) by default; PostgreSQL via `pg` / `node-postgres` when `DATABASE_URL` is set
- **ORM:** Drizzle ORM 0.45
- **Auth:** email + password (scrypt hashes), HMAC-signed httpOnly session cookies, email-keyed sessions
- **Charts:** recharts

Core tables: `users`, `business_services`, `vendors`, `vendor_services`, `question_templates`, `questions`, `assessments`, `answers`, `evidence`, `resilience_records`, `findings`, `actions`, `exceptions`, `audit_events`.

TPRM extension tables: `standards`, `vendor_compliance`, `scoring_config`, `audit_reports`, `sub_processors`, `incidents`, `reassessment_triggers`, `evaluation_tasks`, `evaluation_feedback`.

Server actions (`src/app/actions.ts`) enforce `can(role, action)` permissions and write audit events for every state-changing operation. Page-level RBAC guards live in each `page.tsx`. The permission matrix is defined once in `src/lib/auth.ts` (`PERMISSION_MATRIX`) and rendered on the Access control page.

## Verification & testing

Everything below was run against the production build (`npm run build && npm start`):

**Build & static checks**
- `npm run build` — clean (10 routes dynamic, type-checked).
- `npm run lint` — 0 errors, 0 warnings.
- `npm run typecheck` — clean.

**Authentication lifecycle (HTTP, cookie jars per persona)**
- All 5 demo accounts sign in → 303 redirect to `/` (vendor rep → `/vendors/<own id>`).
- Wrong password, unknown email → 303 `/login?error=invalid`; deactivated account → `/login?error=disabled`; no-password account → `/login?error=nopassword`.
- Admin provisions a new account via `/access` → the new credentials work; deactivation blocks sign-in; admin resets the password → old password rejected, new one works; old sessions invalidated appropriately.
- Garbage/forged `vrap_session` cookie → redirect to `/login`.

**RBAC page-permission matrix (all roles × all routes)** — `/`, `/vendors`, `/vendors/[id]`, `/assessments`, `/assessments/[id]`, `/services`, `/actions`, `/exceptions`, `/compliance`, `/monitoring`, `/reports`, `/reports/generated`, `/access`, `/settings`, `/evaluation`, `/roadmap`, `/about` — each role sees exactly what the matrix allows; vendor rep is redirected away from other vendors' records to their own; admin-only pages refuse everyone else.

**Resilience**
- Fresh boot with empty PGlite data directory auto-creates schema and auto-seeds (verified — this fixed a first-request deadlock).
- `POST /api/seed` re-seeds cleanly; sessions keyed by email survive re-seeds (verified).
- Audit trail records sign-ins, failed sign-ins, deactivations, password resets and all business actions (verified on dashboard + reports).

## Security notes

- Passwords hashed with **scrypt** (Node `crypto`), per-user random salt, timing-safe comparison; never logged, never stored in plain text.
- Sessions are HMAC-SHA256 signed, httpOnly, `sameSite=lax`, 7-day expiry; the signature check uses a timing-safe comparison; deactivated accounts are re-checked on every request.
- Sign-in attempts (success **and** failure) are written to the audit trail with timestamp and actor.
- Server actions re-authorise on every call; client-side hiding is never the only control.
- Failed logins use a constant-work dummy hash so response timing does not reveal whether an email exists.
- Reporting bugs: this is an academic prototype — see [Limitations](#limitations--out-of-scope).

## Evaluation & validation

The prototype is evaluated through scenario-based tasks and intended-user feedback. Four scenario tasks cover:
1. Triage of an event-triggered reassessment
2. Regulatory coverage gap evaluation
3. Conditional approval with traceability
4. Vendor-representative access scoping

Intended users rate each task on completion, ease of use, clarity, traceability, and usefulness (1–5 Likert), with optional free-text comments. Feedback is stored in `evaluation_feedback` and is visible to auditors.

Evaluation proceeds only after faculty-guide and any required institutional approvals, using fictional vendor data.

## Limitations & out of scope

This is a demonstration prototype, not a production system. The following are intentionally out of scope at this stage:
- Integrations with procurement, identity, or ticketing systems
- Multi-tenant production hardening and single sign-on (SAML/OIDC)
- Threat-intel feeds and automated external data ingestion
- Dedicated AI-governance and DPDP privacy-assessment workflows (partial coverage exists via the standards matrix)
- Password self-service reset via email (resets are admin-performed on the Access control page)

No score, report, or automated output in VRAP constitutes a compliance determination, supplier approval, or substitute for professional judgement.

## Changelog

### v1.0 — completion & hardening (2026-11-26)

- **Credential sign-in:** replaced the pick-a-persona login with manual email + password entry; scrypt-hashed credentials; forgot-nothing flow (admin resets); plaintext secrets never stored.
- **Account lifecycle on `/access`:** provision with temporary password, per-user password reset, role/vendor edits, activate/deactivate — all audited.
- **New About & help page** (`/about`) with roles, capabilities, stack, standards and disclaimer; linked from sidebar for all roles.
- **Redesigned portfolio dashboard** — role-aware focus cards, decision inbox for approvers, personalized greeting, compliance-coverage KPI, denser KPI strip.
- **RBAC gaps closed:** any-signed-in-user could register evidence/submit assessments/flip action statuses — now role-checked; auditors blocked from findings/exceptions (read-only elsewhere); monitoring create-forms had an impossible empty `vendorId` (they now carry a vendor picker); 36 hidden inputs across pages were rendered as visible text boxes (now `type="hidden"`).
- **Critical boot fix:** fresh PGlite databases deadlocked the first request (auto-seed awaited a promise that itself awaited the seed). Schema bootstrap and auto-seed are now re-entrancy safe; sessions keyed by email survive re-seeds (Vercel cold starts no longer log everyone out); the import-time double-seed side effect was removed (CLI seeding is guarded to direct execution and seeds exactly once).
- **README rewritten** with demo accounts, security notes, verification evidence and Vercel deploy guide; lint clean (0 errors, 0 warnings).

---

*VRAP — Vendor Risk Assessment Portal. Built for demonstration and evaluation of risk-based third-party assessment and operational-resilience review.*
