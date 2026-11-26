# VRAP — Vendor Risk Assessment Portal

A traceable, risk-based third-party risk management (TPRM) prototype for vendor assessment and operational-resilience review. The portal supports a complete vendor lifecycle — central inventory, tailored questionnaires, evidence tracking, explainable risk scoring, regulatory coverage, continuous monitoring, human approvals, audit reporting, and role-based access control.

---

## Table of contents

1. [Overview](#overview)
2. [Audience & intended use](#audience--intended-use)
3. [Core capabilities](#core-capabilities)
4. [Standards & regulatory coverage](#standards--regulatory-coverage)
5. [Risk-scoring model](#risk-scoring-model)
6. [Access control & roles](#access-control--roles)
7. [Demo accounts](#demo-accounts)
8. [Getting started](#getting-started)
9. [Suggested demo walkthrough](#suggested-demo-walkthrough)
10. [Architecture & data model](#architecture--data-model)
11. [Evaluation & validation](#evaluation--validation)
12. [Limitations & out of scope](#limitations--out-of-scope)

---

## Overview

VRAP (Vendor Risk Assessment Portal) is a web-based prototype designed to support risk-based vendor assessment and operational-resilience review. It provides a central vendor inventory with owners, services, criticality, and data/system access; tailored questionnaires with evidence status, reviewer comments, and decision history; transparent, configurable risk factors; and visibility into evidence confidence and resilience readiness.

The prototype records findings, exceptions, actions, approvals, and reassessment triggers, and includes auditing report generation and access-control features. It is intended for demonstration and evaluation purposes using fictional vendor data.

## Audience & intended use

The portal supports four primary user roles plus a read-only auditor persona:

| Role | Typical user | Responsibility |
|------|-------------|----------------|
| Administrator | Dhanraj Rana | Full system access: user provisioning, access control, scoring-model configuration, all reports |
| Reviewer | Raj Jadav | Evidence verification, reviewer rationale, findings, sending assessments for decision |
| Approver | Chaitanya Nagre | Assessment decisions (approve / conditionally approve / hold), exception approval |
| Vendor representative | Jenil Dalal (Nimbus) | Vendor-scoped access to own assessment: responses and evidence registration only |
| Auditor | Elena Rossi | Read-only access to reports, compliance matrix, monitoring, and audit trail |

Evaluation of the prototype is intended to be conducted through scenario-based tasks and intended-user feedback, subject to required approvals (faculty guide / institutional ethics clearance as applicable).

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

Raise severity-rated findings, create time-bound remediation actions with owners, propose and approve/re retire risk exceptions with compensating controls, and record human assessment decisions with rationale and reassessment horizons.

### Audit reporting & audit trail

Generate stored, reproducible audit reports (portfolio, vendor, compliance, audit trail, evidence, findings, access, evaluation) with a point-in-time snapshot. Every significant action is written to an immutable audit trail with actor, entity, action, detail, and timestamp.

### Access control & RBAC

Role-based permissions are enforced on every server action. Vendor representatives are scoped to their own vendor record. Deactivated accounts cannot sign in. An administrator provisions users, assigns roles, and manages account state through the access-control page.

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

## Access control & roles

| Permission | Admin | Reviewer | Approver | Vendor | Auditor |
|------------|-------|----------|----------|--------|---------|
| Vendor intake & service mapping | ✓ | ✓ | | | |
| Answer questionnaires & register evidence | ✓ | | | ✓ (own vendor) | |
| Verify evidence, findings, rationale | ✓ | ✓ | | | |
| Approve / hold assessments | ✓ | | ✓ | | |
| Approve exceptions | ✓ | | ✓ | | |
| Manage users & access | ✓ | | | | |
| Configure scoring model | ✓ | | | | |
| Manage questionnaires | ✓ | ✓ | | | |
| Manage compliance records | ✓ | ✓ | | | |
| Manage monitoring (incidents, triggers) | ✓ | ✓ | | | |
| Generate audit reports | ✓ | ✓ | ✓ | | ✓ |
| View audit trail & reports | ✓ | ✓ | ✓ | | ✓ |
| Submit evaluation feedback | ✓ | ✓ | ✓ | ✓ | ✓ |

## Demo accounts

Sign in through the persona picker on the sign-in page:

| Persona | Email | Role | Scope |
|---------|-------|------|-------|
| Dhanraj Rana | dhanraj.rana@demo.vrap | Administrator | Full system access |
| Raj Jadav | raj.jadav@demo.vrap | Reviewer | Evidence, findings, review flow |
| Chaitanya Nagre | chaitanya.nagre@demo.vrap | Approver | Assessment decisions, exceptions |
| Jenil Dalal (Nimbus) | jenil.dalal@demo.vrap | Vendor representative | Nimbus Cloud Hosting only |
| Elena Rossi | elena.rossi@demo.vrap | Auditor | Read-only portfolio access |

## Getting started

VRAP runs on **PGlite**, a real PostgreSQL database compiled to WebAssembly. No external database server, `DATABASE_URL`, or migration step is required for the demonstration.

### Prerequisites

- Node.js v20 or later
- npm

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Load the fictional demonstration dataset (wipes and re-seeds)
npx tsx src/db/seed.ts

# 3. Start the development server
npm run dev
```

The application will be available at `http://localhost:3000`.

### Using an external PostgreSQL database (optional)

To run against a real PostgreSQL instance instead of PGlite:

```bash
# Create .env with your connection string
echo "DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db" > .env
echo "VRAP_SESSION_SECRET=change-me-in-production" >> .env

# Create tables
npx drizzle-kit push --force

# Seed demonstration data
npx tsx src/db/seed.ts

# Start
npm run dev
```

## Deploying to Vercel

VRAP is ready to deploy on [Vercel](https://vercel.com) with zero configuration. On Vercel, PGlite runs **in-memory** (the serverless filesystem is ephemeral), so the database is auto-seeded with the fictional demo dataset on each cold start.

### One-click deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Dhanrajrana/vendor-risk-assessment-portal)

### Manual deploy

1. Push this repository to GitHub.
2. In the Vercel dashboard, click **Add New Project** and import your GitHub repo.
3. Under **Environment Variables**, add:
   - `VRAP_SESSION_SECRET` — any random string (used to sign session cookies).
4. Leave `DATABASE_URL` **unset** — this tells VRAP to use PGlite instead of an external Postgres.
5. Click **Deploy**.

### Notes for the Vercel deployment

- Each serverless cold start creates a fresh in-memory PGlite database, which is auto-seeded with demo data (8 vendors, 14 standards, users, questionnaires, evidence, etc.).
- To force a re-seed without redeploying, call `POST /api/seed` (e.g. `curl -X POST https://your-app.vercel.app/api/seed`).
- Data does **not** persist across cold starts on Vercel (ephemeral filesystem). For persistent data, connect an external PostgreSQL via `DATABASE_URL`.

## Suggested demo walkthrough

1. **Sign in as Dhanraj Rana (Administrator)** — review the dashboard KPIs, tier distribution, evidence freshness, and resilience watch.
2. **Vendor register → Nimbus Cloud Hosting** — examine inherent exposure, service dependencies (90% concentration on the customer portal), evidence register, resilience gap, and contract / DPDP / exit record.
3. **Regulatory coverage** — open the standards × vendor heatmap; record compliance status for applicable frameworks.
4. **Incidents & triggers** — review recorded incidents and sub-processors; raise or resolve a reassessment trigger.
5. **Assessments → Nimbus v2 (in review)** — walk the explainable scoring panel, questionnaire, linked evidence, and reviewer workspace.
6. **Sign in as Chaitanya Nagre (Approver)** — record a conditional approval with rationale and reassessment horizon.
7. **Sign in as Jenil Dalal (Vendor representative)** — confirm the vendor-scoped view showing only Nimbus data; submit responses and register evidence.
8. **Scoring model (Administrator)** — adjust inherent weights, mitigation cap, or tier thresholds and observe the impact.
9. **Access control (Administrator)** — provision a user, assign a role, and review the RBAC matrix.
10. **Reports → Generate reports** — produce a portfolio, vendor, compliance, audit-trail, evidence, findings, access, or evaluation report; view or print it.
11. **Evaluation** — complete the four scenario tasks and submit Likert feedback.
12. **Project status** — review module-by-module implementation status.

## Architecture & data model

- **Framework:** Next.js 16 (App Server), React 19, TypeScript, Tailwind CSS 4
- **Database:** PGlite (WASM Postgres) by default; PostgreSQL via `pg` / `node-postgres` when `DATABASE_URL` is set
- **ORM:** Drizzle ORM 0.45
- **Charts:** recharts

Core tables: `users`, `business_services`, `vendors`, `vendor_services`, `question_templates`, `questions`, `assessments`, `answers`, `evidence`, `resilience_records`, `findings`, `actions`, `exceptions`, `audit_events`.

TPRM extension tables: `standards`, `vendor_compliance`, `scoring_config`, `audit_reports`, `sub_processors`, `incidents`, `reassessment_triggers`, `evaluation_tasks`, `evaluation_feedback`.

Server actions (`src/app/actions.ts`) enforce `can(role, action)` permissions and write audit events for every state-changing operation.

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
- Multi-tenant production hardening and single sign-on
- Threat-intel feeds and automated external data ingestion
- Dedicated AI-governance and DPDP privacy-assessment workflows (partial coverage exists via the standards matrix)

No score, report, or automated output in VRAP constitutes a compliance determination, supplier approval, or substitute for professional judgement.

---

*VRAP — Vendor Risk Assessment Portal. Built for demonstration and evaluation of risk-based third-party assessment and operational-resilience review.*
