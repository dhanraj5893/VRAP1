import {
  pgTable,
  serial,
  integer,
  text,
  boolean,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/* -------------------------------------------------------------------------- */
/*  VRAP - Vendor Risk Assessment Portal schema                                */
/*  Core lifecycle tables + TPRM extensions: standards & regulatory coverage,  */
/*  configurable scoring, audit/report generation, access control, continuous  */
/*  monitoring (incidents / fourth parties / triggers) and user evaluation.    */
/* -------------------------------------------------------------------------- */

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  // admin | reviewer | approver | vendor | auditor (read-only)
  role: text("role").notNull().default("reviewer"),
  // for vendor representatives: which vendor they belong to
  vendorId: integer("vendor_id"),
  // access control: deactivated accounts cannot sign in
  isActive: boolean("is_active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const businessServices = pgTable("business_services", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description").notNull().default(""),
  // low | medium | high | critical
  criticality: text("criticality").notNull().default("medium"),
  owner: text("owner").notNull().default(""),
  rtoHours: integer("rto_hours"),
});

export const vendors = pgTable("vendors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  category: text("category").notNull().default("General"),
  // intake | assessment | review | monitoring | reassessment_due | offboarded
  status: text("status").notNull().default("intake"),
  country: text("country").notNull().default(""),
  ownerName: text("owner_name").notNull().default(""), // internal relationship owner
  contactName: text("contact_name").notNull().default(""),
  contactEmail: text("contact_email").notNull().default(""),
  // inherent exposure inputs, 1 (very low) .. 5 (very high)
  serviceCriticality: integer("service_criticality").notNull().default(3),
  dataSensitivity: integer("data_sensitivity").notNull().default(3),
  systemAccess: integer("system_access").notNull().default(3),
  geographicExposure: integer("geographic_exposure").notNull().default(2),
  personalDataFlag: boolean("personal_data_flag").notNull().default(false),
  aiUseFlag: boolean("ai_use_flag").notNull().default(false),
  notes: text("notes").notNull().default(""),
  onboardedAt: timestamp("onboarded_at", { mode: "date" })
    .notNull()
    .defaultNow(),
  nextReassessmentAt: timestamp("next_reassessment_at", { mode: "date" }),
  // --- contract, privacy & exit tracking (DPDP / GDPR / DORA) ---
  contractStart: timestamp("contract_start", { mode: "date" }),
  contractEnd: timestamp("contract_end", { mode: "date" }),
  // not_signed | signed | na
  dpaStatus: text("dpa_status").notNull().default("not_signed"),
  // free-text list of personal-data categories processed (DPDP/GDPR scope)
  dataCategories: text("data_categories").notNull().default(""),
  // cross-border transfer description (e.g. "India → EU (Ireland)")
  crossBorder: text("cross_border").notNull().default(""),
  // none | draft | approved | tested  (exit / portability plan)
  exitPlanStatus: text("exit_plan_status").notNull().default("none"),
  insuranceExpiry: timestamp("insurance_expiry", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const vendorServices = pgTable(
  "vendor_services",
  {
    id: serial("id").primaryKey(),
    vendorId: integer("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "cascade" }),
    serviceId: integer("service_id")
      .notNull()
      .references(() => businessServices.id, { onDelete: "cascade" }),
    // primary | partial | backup
    dependencyLevel: text("dependency_level").notNull().default("partial"),
    // optional concentration indicator 0-100 (% of service delivery via vendor)
    concentration: integer("concentration"),
    notes: text("notes").notNull().default(""),
  },
  (t) => [uniqueIndex("vendor_service_unique").on(t.vendorId, t.serviceId)],
);

export const questionTemplates = pgTable("question_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  version: text("version").notNull().default("1.0"),
  description: text("description").notNull().default(""),
  active: boolean("active").notNull().default(true),
  // tailored questionnaire tier: critical | high | medium | low | all
  applicableTier: text("applicable_tier").notNull().default("all"),
  // primary standard this template is aligned to (e.g. "ISO 27001:2022")
  standardRef: text("standard_ref").notNull().default(""),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id")
    .notNull()
    .references(() => questionTemplates.id, { onDelete: "cascade" }),
  domain: text("domain").notNull().default("General"),
  text: text("text").notNull(),
  weight: integer("weight").notNull().default(10),
  evidenceRequired: boolean("evidence_required").notNull().default(true),
  position: integer("position").notNull().default(0),
  // standards / regulatory traceability for this control question
  standardRef: text("standard_ref").notNull().default(""),
  controlRef: text("control_ref").notNull().default(""),
});

export const assessments = pgTable("assessments", {
  id: serial("id").primaryKey(),
  vendorId: integer("vendor_id")
    .notNull()
    .references(() => vendors.id, { onDelete: "cascade" }),
  templateId: integer("template_id")
    .notNull()
    .references(() => questionTemplates.id),
  version: integer("version").notNull().default(1),
  // draft | issued | in_review | decision_pending | approved |
  // conditionally_approved | on_hold | expired
  status: text("status").notNull().default("draft"),
  triggerReason: text("trigger_reason"),
  issuedAt: timestamp("issued_at", { mode: "date" }),
  dueAt: timestamp("due_at", { mode: "date" }),
  submittedAt: timestamp("submitted_at", { mode: "date" }),
  reviewerId: integer("reviewer_id"),
  reviewerRationale: text("reviewer_rationale"),
  decision: text("decision"), // approved | conditionally_approved | on_hold | rejected
  decidedById: integer("decided_by_id"),
  decidedAt: timestamp("decided_at", { mode: "date" }),
  decisionRationale: text("decision_rationale"),
  nextReassessmentAt: timestamp("next_reassessment_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const answers = pgTable(
  "answers",
  {
    id: serial("id").primaryKey(),
    assessmentId: integer("assessment_id")
      .notNull()
      .references(() => assessments.id, { onDelete: "cascade" }),
    questionId: integer("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    // yes | partial | no | na | null (unanswered)
    response: text("response"),
    comment: text("comment").notNull().default(""),
    evidenceId: integer("evidence_id"),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("assessment_question_unique").on(t.assessmentId, t.questionId)],
);

export const evidence = pgTable("evidence", {
  id: serial("id").primaryKey(),
  vendorId: integer("vendor_id")
    .notNull()
    .references(() => vendors.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  // policy | certificate | report | test | contract | other
  type: text("type").notNull().default("other"),
  fileName: text("file_name").notNull().default(""),
  owner: text("owner").notNull().default(""),
  // missing is a placeholder row (nothing uploaded yet)
  // missing | submitted | verified | rejected | clarification_requested
  status: text("status").notNull().default("submitted"),
  version: integer("version").notNull().default(1),
  uploadedAt: timestamp("uploaded_at", { mode: "date" }).notNull().defaultNow(),
  validUntil: timestamp("valid_until", { mode: "date" }),
  reviewerNote: text("reviewer_note").notNull().default(""),
  uploadedById: integer("uploaded_by_id"),
  // which standard/regulation this evidence supports (e.g. "ISO 27001:2022 A.8.13")
  standardRef: text("standard_ref").notNull().default(""),
});

export const resilienceRecords = pgTable("resilience_records", {
  id: serial("id").primaryKey(),
  vendorId: integer("vendor_id")
    .notNull()
    .unique()
    .references(() => vendors.id, { onDelete: "cascade" }),
  // none | draft | approved | tested
  continuityPlanStatus: text("continuity_plan_status").notNull().default("none"),
  lastExerciseAt: timestamp("last_exercise_at", { mode: "date" }),
  // passed | partial | failed | not_run
  exerciseOutcome: text("exercise_outcome").notNull().default("not_run"),
  rtoHours: integer("rto_hours"),
  notes: text("notes").notNull().default(""),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const findings = pgTable("findings", {
  id: serial("id").primaryKey(),
  vendorId: integer("vendor_id")
    .notNull()
    .references(() => vendors.id, { onDelete: "cascade" }),
  assessmentId: integer("assessment_id"),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  // low | medium | high | critical
  severity: text("severity").notNull().default("medium"),
  // open | in_progress | mitigated | accepted | closed
  status: text("status").notNull().default("open"),
  createdById: integer("created_by_id"),
  // regulatory/standard clause this finding maps to
  standardRef: text("standard_ref").notNull().default(""),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const actions = pgTable("actions", {
  id: serial("id").primaryKey(),
  vendorId: integer("vendor_id")
    .notNull()
    .references(() => vendors.id, { onDelete: "cascade" }),
  findingId: integer("finding_id"),
  title: text("title").notNull(),
  ownerName: text("owner_name").notNull().default(""),
  dueAt: timestamp("due_at", { mode: "date" }),
  // open | in_progress | done
  status: text("status").notNull().default("open"),
  completedAt: timestamp("completed_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const exceptions = pgTable("exceptions", {
  id: serial("id").primaryKey(),
  vendorId: integer("vendor_id")
    .notNull()
    .references(() => vendors.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  rationale: text("rationale").notNull().default(""),
  compensatingControls: text("compensating_controls").notNull().default(""),
  // proposed | active | retired
  status: text("status").notNull().default("proposed"),
  expiresAt: timestamp("expires_at", { mode: "date" }),
  approvedById: integer("approved_by_id"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const auditEvents = pgTable("audit_events", {
  id: serial("id").primaryKey(),
  actorId: integer("actor_id"),
  actorName: text("actor_name").notNull().default("System"),
  entityType: text("entity_type").notNull().default(""), // vendor | assessment | evidence | action ...
  entityId: integer("entity_id"),
  action: text("action").notNull().default(""),
  detail: text("detail").notNull().default(""),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

/* ------------------- standards & regulatory coverage ---------------------- */

export const standards = pgTable("standards", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(), // e.g. "ISO27001-2022"
  name: text("name").notNull(),
  version: text("version").notNull().default(""),
  region: text("region").notNull().default("Global"), // India | EU | Global | US
  category: text("category").notNull().default("Cyber"), // Cyber | Privacy | Operational | Financial | AI
  description: text("description").notNull().default(""),
  // vendor attributes that make this standard applicable (comma list of flags)
  applicability: text("applicability").notNull().default(""),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const vendorCompliance = pgTable(
  "vendor_compliance",
  {
    id: serial("id").primaryKey(),
    vendorId: integer("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "cascade" }),
    standardId: integer("standard_id")
      .notNull()
      .references(() => standards.id, { onDelete: "cascade" }),
    // not_assessed | compliant | partial | non_compliant | na
    status: text("status").notNull().default("not_assessed"),
    evidenceId: integer("evidence_id"),
    notes: text("notes").notNull().default(""),
    assessedById: integer("assessed_by_id"),
    assessedAt: timestamp("assessed_at", { mode: "date" }),
    nextReviewAt: timestamp("next_review_at", { mode: "date" }),
  },
  (t) => [uniqueIndex("vendor_standard_unique").on(t.vendorId, t.standardId)],
);

/* ----------------------- configurable scoring ----------------------------- */

export const scoringConfig = pgTable("scoring_config", {
  id: serial("id").primaryKey(),
  // e.g. w_serviceCriticality, mitigation_cap, tier_high, tier_critical
  key: text("key").notNull().unique(),
  value: integer("value").notNull(), // weights stored x1000 (300 = 0.30)
  label: text("label").notNull().default(""),
  updatedById: integer("updated_by_id"),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

/* ---------------------- audit reports generation -------------------------- */

export const auditReports = pgTable("audit_reports", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  // portfolio | vendor | compliance | audit_trail | evidence | findings | access | evaluation
  reportType: text("report_type").notNull().default("portfolio"),
  vendorId: integer("vendor_id"),
  generatedById: integer("generated_by_id"),
  generatedByName: text("generated_by_name").notNull().default("System"),
  // JSON snapshot of the report inputs at generation time (for reproducibility)
  snapshot: text("snapshot").notNull().default("{}"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

/* ------------------- continuous monitoring: fourth parties ---------------- */

export const subProcessors = pgTable("sub_processors", {
  id: serial("id").primaryKey(),
  vendorId: integer("vendor_id")
    .notNull()
    .references(() => vendors.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  country: text("country").notNull().default(""),
  purpose: text("purpose").notNull().default(""),
  dataCategories: text("data_categories").notNull().default(""),
  // not_signed | signed | na
  dpaStatus: text("dpa_status").notNull().default("not_signed"),
  notifiedAt: timestamp("notified_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const incidents = pgTable("incidents", {
  id: serial("id").primaryKey(),
  vendorId: integer("vendor_id")
    .notNull()
    .references(() => vendors.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  // low | medium | high | critical
  severity: text("severity").notNull().default("medium"),
  occurredAt: timestamp("occurred_at", { mode: "date" }),
  notifiedAt: timestamp("notified_at", { mode: "date" }),
  // open | investigating | contained | closed
  status: text("status").notNull().default("open"),
  description: text("description").notNull().default(""),
  createdById: integer("created_by_id"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const reassessmentTriggers = pgTable("reassessment_triggers", {
  id: serial("id").primaryKey(),
  vendorId: integer("vendor_id")
    .notNull()
    .references(() => vendors.id, { onDelete: "cascade" }),
  // scheduled | incident | evidence_expiry | contract_change | regulatory | manual
  triggerType: text("trigger_type").notNull().default("manual"),
  reason: text("reason").notNull().default(""),
  // open | converted | dismissed
  status: text("status").notNull().default("open"),
  createdById: integer("created_by_id"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

/* ------------------------- user evaluation -------------------------------- */

export const evaluationTasks = pgTable("evaluation_tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  scenario: text("scenario").notNull().default(""),
  instructions: text("instructions").notNull().default(""),
  expectedOutcome: text("expected_outcome").notNull().default(""),
  position: integer("position").notNull().default(0),
});

export const evaluationFeedback = pgTable("evaluation_feedback", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id"),
  respondentName: text("respondent_name").notNull().default(""),
  respondentRole: text("respondent_role").notNull().default(""),
  // 1-5 Likert scales (null = not rated)
  taskCompletion: integer("task_completion"),
  ease: integer("ease"),
  clarity: integer("clarity"),
  traceability: integer("traceability"),
  usefulness: integer("usefulness"),
  comments: text("comments").notNull().default(""),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});
