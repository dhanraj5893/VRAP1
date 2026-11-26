# Contributing to VRAP

Thanks for your interest in improving VRAP. This document describes the workflow and the principles every contribution must respect.

## Ground rules

1. **Humans decide, software advises.** Never let a score approve, fail or close anything on its own — decisions are recorded human actions, always with a rationale and an actor.
2. **Everything meaningful is audited.** Any state-changing operation must write an `audit_events` row with actor, entity, action and detail.
3. **RBAC is enforced server-side.** Hiding a button is never the control — check `can()` / role + ownership inside every server action and page guard. Vendor representatives see only their own vendor record; auditors are strictly read-only.
4. **Demo data stays fictional.** No real vendor names, no real personal data — ever.
5. **Scores stay explainable.** New factors must decompose into named, weighted, visible components stored in `scoring_config`.

## Development setup

```bash
npm install          # Node.js 20+
npm run db:seed      # wipe + load the fictional demo dataset (incl. demo passwords)
npm run dev          # http://localhost:3000
```

## Before opening a pull request

All three gates must pass locally:

```bash
npm run build
npm run lint
npm run typecheck
```

…and exercise the RBAC matrix for any auth-touching change: every role × every affected route, plus the vendor-scope and auditor read-only paths.

## Commit style

Short imperative subject (`Fix first-request seed deadlock`), body explains *why*. Keep PRs focused; describe verification steps in the PR description.

## Code map

| Path | Responsibility |
|------|----------------|
| `src/app/(app)/*` | Pages (App Router, RSC + server actions) |
| `src/app/actions.ts` | All mutations (permission-checked, audited) |
| `src/lib/auth.ts` | Sessions (HMAC cookie), `can()`, `PERMISSION_MATRIX` |
| `src/lib/password.ts` | scrypt password hashing |
| `src/db/*` | PGlite/Postgres bootstrap, DDL, schema, seed |
| `src/lib/data.ts` | Query layer (portfolio snapshots, compliance matrix…) |
