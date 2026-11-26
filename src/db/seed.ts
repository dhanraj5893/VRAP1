/* VRAP demo seed - fictional vendors only. Safe to re-run: it wipes all tables. */
import "dotenv/config";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { db, ensureDb, pool } from "./index";
import {
  actions,
  answers,
  assessments,
  auditEvents,
  auditReports,
  businessServices,
  evaluationFeedback,
  evaluationTasks,
  evidence,
  exceptions,
  findings,
  incidents,
  questionTemplates,
  questions,
  reassessmentTriggers,
  resilienceRecords,
  scoringConfig,
  standards,
  subProcessors,
  users,
  vendorCompliance,
  vendorServices,
  vendors,
} from "./schema";
import { eq } from "drizzle-orm";
import { STANDARDS_CATALOG, isStandardApplicable } from "../lib/standards";
import { hashPassword } from "../lib/password";

// Demo credentials — documented in README.md (demo data only, change before real deployment).
export const DEMO_PASSWORDS = {
  admin: "admin123",
  reviewer: "reviewer123",
  approver: "approver123",
  vendor: "vendor123",
  auditor: "auditor123",
} as const;

const days = (n: number) => new Date(Date.now() + n * 86400000);

export async function seedData(targetDb: typeof db) {
  // Callers (CLI, /api/seed, PGlite auto-bootstrap) guarantee the schema exists.
  console.log("Clearing existing data...");
  await targetDb.delete(auditEvents);
  await targetDb.delete(answers);
  await targetDb.delete(assessments);
  await targetDb.delete(questions);
  await targetDb.delete(questionTemplates);
  await targetDb.delete(evidence);
  await targetDb.delete(resilienceRecords);
  await targetDb.delete(findings);
  await targetDb.delete(actions);
  await targetDb.delete(exceptions);
  await targetDb.delete(vendorCompliance);
  await targetDb.delete(standards);
  await targetDb.delete(subProcessors);
  await targetDb.delete(incidents);
  await targetDb.delete(reassessmentTriggers);
  await targetDb.delete(auditReports);
  await targetDb.delete(scoringConfig);
  await targetDb.delete(evaluationFeedback);
  await targetDb.delete(evaluationTasks);
  await targetDb.delete(vendorServices);
  await targetDb.delete(users);
  await targetDb.delete(vendors);
  await targetDb.delete(businessServices);

  /* ------------------------------ users ----------------------------------- */
  const [admin, reviewer, approver] = await db
    .insert(users)
    .values([
      { name: "Dhanraj Rana", email: "dhanraj.rana@demo.vrap", role: "admin", passwordHash: hashPassword(DEMO_PASSWORDS.admin) },
      { name: "Raj Jadav", email: "raj.jadav@demo.vrap", role: "reviewer", passwordHash: hashPassword(DEMO_PASSWORDS.reviewer) },
      { name: "Chaitanya Nagre", email: "chaitanya.nagre@demo.vrap", role: "approver", passwordHash: hashPassword(DEMO_PASSWORDS.approver) },
    ])
    .returning();

  /* ------------------------------ services -------------------------------- */
  const [portal, payments, payroll, email, crm, analytics] = await db
    .insert(businessServices)
    .values([
      { name: "Customer Portal", description: "Public-facing self-service portal for ~120k customers.", criticality: "critical", owner: "Digital Channels", rtoHours: 4 },
      { name: "Payment Processing", description: "Card payment capture and settlement via gateway APIs.", criticality: "critical", owner: "Payments Ops", rtoHours: 2 },
      { name: "Payroll & HR", description: "Employee payroll, tax and leave records.", criticality: "high", owner: "People Team", rtoHours: 72 },
      { name: "Email & Collaboration", description: "Corporate email, chat and document collaboration.", criticality: "high", owner: "IT Operations", rtoHours: 24 },
      { name: "CRM", description: "Sales pipeline and customer relationship records.", criticality: "medium", owner: "Sales Ops", rtoHours: 48 },
      { name: "Analytics Platform", description: "Internal BI dashboards and warehouse exports.", criticality: "medium", owner: "Data Platform", rtoHours: 72 },
    ])
    .returning();

  /* ------------------------------ vendors --------------------------------- */
  const [nimbus, sentinel, payzen, databridge, cloudesk, routeone, mailrite, acme] = await db
    .insert(vendors)
    .values([
      {
        name: "Nimbus Cloud Hosting",
        category: "Cloud hosting / IaaS",
        status: "review",
        country: "India (data centers: Mumbai, Singapore)",
        ownerName: "K. Deshmukh (IT Infrastructure)",
        contactName: "Jenil Dalal",
        contactEmail: "jenil.dalal@nimbuscloud.example",
        serviceCriticality: 5,
        dataSensitivity: 4,
        systemAccess: 4,
        geographicExposure: 3,
        personalDataFlag: true,
        aiUseFlag: false,
        notes: "Hosts the customer portal and payments API. Contract renewal in Q3. One availability incident recorded this year.",
        onboardedAt: days(-430),
        nextReassessmentAt: days(24),
      },
      {
        name: "Sentinel Managed SOC",
        category: "Managed security services",
        status: "assessment",
        country: "India",
        ownerName: "R. Iyer (Security Operations)",
        contactName: "Dev Patel",
        contactEmail: "dev.patel@sentinelsoc.example",
        serviceCriticality: 4,
        dataSensitivity: 4,
        systemAccess: 5,
        geographicExposure: 2,
        personalDataFlag: false,
        aiUseFlag: true,
        notes: "Holds privileged access to SIEM and endpoint tooling. AI-assisted alert triage flagged for future AI-governance review.",
        onboardedAt: days(-210),
        nextReassessmentAt: days(45),
      },
      {
        name: "PayZen Payroll Platform",
        category: "SaaS - payroll",
        status: "review",
        country: "India",
        ownerName: "S. Kulkarni (People Team)",
        contactName: "Ananya Bose",
        contactEmail: "ananya.bose@payzen.example",
        serviceCriticality: 3,
        dataSensitivity: 5,
        systemAccess: 3,
        geographicExposure: 2,
        personalDataFlag: true,
        aiUseFlag: false,
        notes: "Processes full employee records. DPDP screening flag recorded; dedicated privacy module is future work.",
        onboardedAt: days(-365),
        nextReassessmentAt: days(60),
      },
      {
        name: "DataBridge Analytics",
        category: "SaaS - analytics",
        status: "monitoring",
        country: "EU (Ireland)",
        ownerName: "V. Menon (Data Platform)",
        contactName: "Eoin Farrell",
        contactEmail: "eoin.farrell@databridge.example",
        serviceCriticality: 3,
        dataSensitivity: 3,
        systemAccess: 3,
        geographicExposure: 4,
        personalDataFlag: false,
        aiUseFlag: true,
        notes: "Receives de-identified warehouse exports. Approved with annual cycle.",
        onboardedAt: days(-300),
        nextReassessmentAt: days(140),
      },
      {
        name: "CloudDesk CRM",
        category: "SaaS - CRM",
        status: "intake",
        country: "United States",
        ownerName: "P. Sharma (Sales Ops)",
        contactName: "Grace Lee",
        contactEmail: "grace.lee@cloudesk.example",
        serviceCriticality: 2,
        dataSensitivity: 3,
        systemAccess: 2,
        geographicExposure: 4,
        personalDataFlag: true,
        aiUseFlag: false,
        notes: "Intake in progress; awaiting questionnaire issue.",
        onboardedAt: days(-12),
      },
      {
        name: "RouteOne Logistics",
        category: "Logistics services",
        status: "assessment",
        country: "India",
        ownerName: "N. Kapoor (Operations)",
        contactName: "Harish Verma",
        contactEmail: "harish.verma@routeone.example",
        serviceCriticality: 3,
        dataSensitivity: 2,
        systemAccess: 2,
        geographicExposure: 3,
        personalDataFlag: false,
        aiUseFlag: false,
        notes: "Delivery tracking API integration with the customer portal.",
        onboardedAt: days(-150),
        nextReassessmentAt: days(90),
      },
      {
        name: "MailRite Email Services",
        category: "SaaS - email marketing",
        status: "monitoring",
        country: "India",
        ownerName: "A. Thomas (Marketing)",
        contactName: "Lena D'Souza",
        contactEmail: "lena.dsouza@mailrite.example",
        serviceCriticality: 2,
        dataSensitivity: 2,
        systemAccess: 1,
        geographicExposure: 2,
        personalDataFlag: true,
        aiUseFlag: false,
        notes: "Newsletter platform using opted-in contact lists.",
        onboardedAt: days(-500),
        nextReassessmentAt: days(200),
      },
      {
        name: "Acme Office Supplies",
        category: "Office supplies",
        status: "monitoring",
        country: "India",
        ownerName: "Facilities",
        contactName: "Rohit Jain",
        contactEmail: "rohit.jain@acme.example",
        serviceCriticality: 1,
        dataSensitivity: 1,
        systemAccess: 1,
        geographicExposure: 1,
        personalDataFlag: false,
        aiUseFlag: false,
        notes: "Low-risk vendor; no system or data access.",
        onboardedAt: days(-700),
        nextReassessmentAt: days(300),
      },
    ])
    .returning();

  const [mayaRep, auditor] = await db
    .insert(users)
    .values([
      { name: "Jenil Dalal (Nimbus)", email: "jenil.dalal@demo.vrap", role: "vendor", vendorId: nimbus.id, passwordHash: hashPassword(DEMO_PASSWORDS.vendor) },
      { name: "Elena Rossi", email: "elena.rossi@demo.vrap", role: "auditor", passwordHash: hashPassword(DEMO_PASSWORDS.auditor) },
    ])
    .returning();

  /* -------------------- contract, privacy & exit records ------------------- */
  const profile: Record<number, Partial<typeof vendors.$inferInsert>> = {
    [nimbus.id]: {
      contractStart: days(-420), contractEnd: days(120), dpaStatus: "signed",
      dataCategories: "Customer names, contact details, payment tokens, portal session data",
      crossBorder: "India → Singapore (backup region)", exitPlanStatus: "approved", insuranceExpiry: days(210),
    },
    [sentinel.id]: {
      contractStart: days(-200), contractEnd: days(165), dpaStatus: "na",
      dataCategories: "Security telemetry, SIEM logs (limited personal data)",
      crossBorder: "None - India only", exitPlanStatus: "draft", insuranceExpiry: days(95),
    },
    [payzen.id]: {
      contractStart: days(-350), contractEnd: days(15), dpaStatus: "signed",
      dataCategories: "Employee PII: PAN, bank account, salary, dependants, health-insurance data",
      crossBorder: "India only (Mumbai, Hyderabad)", exitPlanStatus: "draft", insuranceExpiry: days(300),
    },
    [databridge.id]: {
      contractStart: days(-290), contractEnd: days(250), dpaStatus: "signed",
      dataCategories: "De-identified warehouse exports, aggregated product usage",
      crossBorder: "India → EU (Ireland)", exitPlanStatus: "approved", insuranceExpiry: days(150),
    },
    [cloudesk.id]: {
      contractStart: days(-10), contractEnd: days(355), dpaStatus: "not_signed",
      dataCategories: "Prospect and customer contact details, sales notes",
      crossBorder: "India → United States", exitPlanStatus: "none", insuranceExpiry: null,
    },
    [routeone.id]: {
      contractStart: days(-140), contractEnd: days(220), dpaStatus: "na",
      dataCategories: "Delivery addresses, consignee names and phone numbers",
      crossBorder: "India only", exitPlanStatus: "none", insuranceExpiry: days(60),
    },
    [mailrite.id]: {
      contractStart: days(-480), contractEnd: days(45), dpaStatus: "signed",
      dataCategories: "Marketing contact lists (opted-in email addresses)",
      crossBorder: "India → United States (email delivery)", exitPlanStatus: "draft", insuranceExpiry: days(320),
    },
    [acme.id]: {
      contractStart: days(-680), contractEnd: days(180), dpaStatus: "na",
      dataCategories: "None", crossBorder: "None", exitPlanStatus: "none", insuranceExpiry: days(30),
    },
  };
  for (const [id, patch] of Object.entries(profile)) {
    await targetDb.update(vendors).set(patch).where(eq(vendors.id, Number(id)));
  }

  /* ------------------- standards & regulatory catalog --------------------- */
  const stdRows = await db
    .insert(standards)
    .values(
      STANDARDS_CATALOG.map((s) => ({
        code: s.code,
        name: s.name,
        version: s.version,
        region: s.region,
        category: s.category,
        description: s.description,
        applicability: s.applicability,
      })),
    )
    .returning();

  // Applicability per vendor + a realistic mix of assessed statuses.
  const compliancePlan: Record<string, { compliant: string[]; partial: string[]; nonCompliant: string[]; na: string[] }> = {
    "Nimbus Cloud Hosting": { compliant: ["SOC2", "ISO27001-2022", "CSA-CCM", "CERT-IN-2022"], partial: ["DPDP-2023", "NIST-CSF-2.0", "DORA", "NIS2"], nonCompliant: [], na: [] },
    "Sentinel Managed SOC": { compliant: ["ISO27001-2022", "SOC2"], partial: ["NIST-CSF-2.0", "ISO42001-AI"], nonCompliant: ["CERT-IN-2022"], na: [] },
    "PayZen Payroll Platform": { compliant: ["SOC2", "GDPR", "DPDP-2023"], partial: ["ISO27001-2022", "RBI-SEBI"], nonCompliant: [], na: [] },
    "DataBridge Analytics": { compliant: ["SOC2", "ISO27001-2022", "GDPR", "ISO42001-AI"], partial: ["NIS2"], nonCompliant: [], na: [] },
    "CloudDesk CRM": { compliant: [], partial: [], nonCompliant: [], na: [] },
    "RouteOne Logistics": { compliant: ["CERT-IN-2022"], partial: ["ISO27001-2022"], nonCompliant: [], na: [] },
    "MailRite Email Services": { compliant: ["GDPR", "DPDP-2023"], partial: ["SOC2"], nonCompliant: [], na: [] },
    "Acme Office Supplies": { compliant: [], partial: [], nonCompliant: [], na: [] },
  };
  const vendorRows = [nimbus, sentinel, payzen, databridge, cloudesk, routeone, mailrite, acme];
  for (const v of vendorRows) {
    const plan = compliancePlan[v.name] ?? { compliant: [], partial: [], nonCompliant: [], na: [] };
    const values = stdRows.map((s) => {
      const applicable = isStandardApplicable(s.applicability, v);
      let status = "na";
      if (applicable) {
        status = plan.compliant.includes(s.code)
          ? "compliant"
          : plan.partial.includes(s.code)
            ? "partial"
            : plan.nonCompliant.includes(s.code)
              ? "non_compliant"
              : "not_assessed";
      }
      return {
        vendorId: v.id,
        standardId: s.id,
        status,
        notes:
          status === "compliant"
            ? `Attestation on file and reviewed by ${reviewer.name}.`
            : status === "partial"
              ? "Partially evidenced — gap recorded, remediation tracked."
              : status === "non_compliant"
                ? "Gap identified during review; finding raised."
                : status === "not_assessed"
                  ? "Applicable, assessment pending."
                  : "Not applicable to this vendor profile.",
        assessedById: applicable ? reviewer.id : null,
        assessedAt: applicable ? days(-40) : null,
        nextReviewAt: applicable ? days(325) : null,
      };
    });
    await targetDb.insert(vendorCompliance).values(values);
  }

  /* -------------------------- scoring configuration ----------------------- */
  await targetDb.insert(scoringConfig).values([
    { key: "w_serviceCriticality", value: 300, label: "Service criticality weight", updatedById: admin.id },
    { key: "w_dataSensitivity", value: 250, label: "Data sensitivity weight", updatedById: admin.id },
    { key: "w_systemAccess", value: 200, label: "System access weight", updatedById: admin.id },
    { key: "w_dependency", value: 150, label: "Dependency / concentration weight", updatedById: admin.id },
    { key: "w_geographicExposure", value: 100, label: "Geographic exposure weight", updatedById: admin.id },
    { key: "mitigation_cap", value: 650, label: "Maximum mitigation from controls", updatedById: admin.id },
    { key: "tier_moderate", value: 40, label: "Moderate tier threshold", updatedById: admin.id },
    { key: "tier_high", value: 60, label: "High tier threshold", updatedById: admin.id },
    { key: "tier_critical", value: 80, label: "Critical tier threshold", updatedById: admin.id },
  ]);

  /* ------------------ fourth parties, incidents, triggers ------------------ */
  await targetDb.insert(subProcessors).values([
    { vendorId: nimbus.id, name: "IronGrid Data Centres (Mumbai)", country: "India", purpose: "Primary data-centre colocation", dataCategories: "All hosted customer data", dpaStatus: "signed", notifiedAt: days(-300) },
    { vendorId: nimbus.id, name: "CloudMesh CDN (Singapore)", country: "Singapore", purpose: "Content delivery & WAF edge", dataCategories: "Request metadata, IP addresses", dpaStatus: "signed", notifiedAt: days(-120) },
    { vendorId: payzen.id, name: "TaxFile Compliance Services", country: "India", purpose: "Statutory payroll tax filing", dataCategories: "Employee PAN and salary data", dpaStatus: "signed", notifiedAt: days(-200) },
    { vendorId: databridge.id, name: "QueryWorks GmbH", country: "Germany", purpose: "Managed analytics query engine", dataCategories: "De-identified datasets", dpaStatus: "signed", notifiedAt: days(-90) },
    { vendorId: mailrite.id, name: "SendWave SMTP (United States)", country: "United States", purpose: "Email delivery infrastructure", dataCategories: "Email addresses, campaign metadata", dpaStatus: "not_signed", notifiedAt: days(-30) },
  ]);

  await targetDb.insert(incidents).values([
    { vendorId: nimbus.id, title: "Region failover outage — portal degraded for 3h 40m", severity: "high", occurredAt: days(-19), notifiedAt: days(-19), status: "closed", description: "Availability incident in the primary region. Nimbus notified us within 4 hours; post-incident review supplied.", createdById: admin.id },
    { vendorId: sentinel.id, title: "SOC analyst credential compromise (contained)", severity: "critical", occurredAt: days(-6), notifiedAt: days(-6), status: "investigating", description: "One analyst console credential was reused externally. Vendor contained the session and rotated credentials; forensic report pending.", createdById: reviewer.id },
    { vendorId: mailrite.id, title: "Phishing campaign impersonating MailRite billing", severity: "medium", occurredAt: days(-45), notifiedAt: days(-44), status: "closed", description: "No customer data exposure; awareness notice issued.", createdById: reviewer.id },
    { vendorId: routeone.id, title: "Tracking API latency spike", severity: "low", occurredAt: days(-11), notifiedAt: null, status: "closed", description: "Provider-side network issue, resolved same day.", createdById: reviewer.id },
  ]);

  await targetDb.insert(reassessmentTriggers).values([
    { vendorId: nimbus.id, triggerType: "incident", reason: "High-severity availability incident (3h 40m portal degradation) plus expiring penetration test evidence.", createdById: admin.id, createdAt: days(-18) },
    { vendorId: sentinel.id, triggerType: "incident", reason: "Critical-severity analyst credential compromise — reassess privileged access controls.", createdById: reviewer.id, createdAt: days(-6) },
    { vendorId: payzen.id, triggerType: "contract_change", reason: "Contract expires in 15 days; DPDP processor clauses need re-confirmation before renewal.", createdById: admin.id, createdAt: days(-3) },
    { vendorId: mailrite.id, triggerType: "evidence_expiry", reason: "SendWave sub-processor DPA not signed and marketing data transfer to the US undocumented.", createdById: reviewer.id, createdAt: days(-28) },
  ]);

  /* ------------------------- service dependencies -------------------------- */
  await targetDb.insert(vendorServices).values([
    { vendorId: nimbus.id, serviceId: portal.id, dependencyLevel: "primary", concentration: 90, notes: "Single cloud provider for the portal stack." },
    { vendorId: nimbus.id, serviceId: payments.id, dependencyLevel: "primary", concentration: 80, notes: "Payments API containers and WAF." },
    { vendorId: sentinel.id, serviceId: email.id, dependencyLevel: "partial", concentration: null, notes: "Monitors collaboration tenant logs." },
    { vendorId: payzen.id, serviceId: payroll.id, dependencyLevel: "primary", concentration: 100, notes: "Full payroll processing outsourced." },
    { vendorId: databridge.id, serviceId: analytics.id, dependencyLevel: "primary", concentration: 70, notes: "BI dashboards and scheduled exports." },
    { vendorId: cloudesk.id, serviceId: crm.id, dependencyLevel: "primary", concentration: 100, notes: "Replacement of legacy CRM under evaluation." },
    { vendorId: routeone.id, serviceId: portal.id, dependencyLevel: "partial", concentration: 40, notes: "Tracking widget embedded in portal." },
    { vendorId: mailrite.id, serviceId: crm.id, dependencyLevel: "partial", concentration: 30, notes: "Campaign lists synced from CRM." },
  ]);

  /* --------------------------- questionnaire ------------------------------- */
  const [tpl] = await db
    .insert(questionTemplates)
    .values({
      name: "Supplier Security & Resilience Questionnaire",
      version: "1.2",
      applicableTier: "all",
      standardRef: "ISO27001-2022 / NIST-CSF-2.0",
      description:
        "Standard due-diligence set aligned to NIST C-SCRM guidance: foundational cyber practices, data protection, incident readiness and resilience. Versioned and reusable.",
    })
    .returning();

  const qSeed: { domain: string; text: string; weight: number; evidence: boolean; standardRef: string; controlRef: string }[] = [
    { domain: "Governance & Policy", text: "An information security policy is approved by management and reviewed at least annually.", standardRef: "ISO27001-2022", controlRef: "A.5.1", weight: 10, evidence: true },
    { domain: "Governance & Policy", text: "Named roles are accountable for security, and staff complete security awareness training annually.", standardRef: "ISO27001-2022", controlRef: "A.6.3", weight: 8, evidence: true },
    { domain: "Access & Identity", text: "Multi-factor authentication is enforced for all administrative and remote access.", standardRef: "SOC2", controlRef: "CC6.1", weight: 12, evidence: true },
    { domain: "Access & Identity", text: "Privileged access is reviewed at least quarterly and removed promptly on role change or exit.", standardRef: "ISO27001-2022", controlRef: "A.8.2", weight: 12, evidence: true },
    { domain: "Access & Identity", text: "Access to customer data is limited to named personnel under NDA with least-privilege controls.", standardRef: "DPDP-2023", controlRef: "Sec. 8(5)", weight: 10, evidence: true },
    { domain: "Data Protection", text: "Customer data is encrypted in transit (TLS 1.2+) and at rest (AES-256 or equivalent).", standardRef: "ISO27001-2022", controlRef: "A.8.24", weight: 12, evidence: true },
    { domain: "Data Protection", text: "A documented data retention and deletion process covers customer data at contract end.", standardRef: "GDPR", controlRef: "Art. 28(3)(g)", weight: 8, evidence: false },
    { domain: "Vulnerability & Testing", text: "Independent penetration testing is performed at least annually and material findings are remediated.", standardRef: "PCI-DSS-4.0", controlRef: "Req 11.3", weight: 12, evidence: true },
    { domain: "Vulnerability & Testing", text: "Critical vulnerabilities are patched within 14 days and high within 30 days under a formal SLG.", standardRef: "NIST-CSF-2.0", controlRef: "ID.RA-01", weight: 10, evidence: true },
    { domain: "Incident Response", text: "A documented incident response plan exists and security incidents affecting our services are notified within 24-48 hours.", standardRef: "CERT-IN-2022", controlRef: "Direction 6(ii)", weight: 12, evidence: true },
    { domain: "Resilience & Continuity", text: "A business continuity / disaster recovery plan covers the services provided to us and is reviewed annually.", standardRef: "DORA", controlRef: "Art. 28(8)", weight: 12, evidence: true },
    { domain: "Resilience & Continuity", text: "Recovery capabilities for our services are tested at least annually with results documented.", standardRef: "DORA", controlRef: "Art. 25", weight: 12, evidence: true },
  ];
  const qRows = await db
    .insert(questions)
    .values(qSeed.map((q, i) => ({ templateId: tpl.id, domain: q.domain, text: q.text, weight: q.weight, evidenceRequired: q.evidence, position: i, standardRef: q.standardRef, controlRef: q.controlRef })))
    .returning();

  /* ------------------------------- evidence -------------------------------- */
  const evSeed = [
    // Nimbus - the mixed evidence state used in the evaluation scenario
    { vendorId: nimbus.id, title: "SOC 2 Type II Report 2025", type: "report", fileName: "nimbus-soc2-2025.pdf", owner: "Nimbus Compliance", status: "verified", uploadedAt: days(-60), validUntil: days(300), reviewerNote: "Scope covers hosting and managed services used by the portal. Clean opinion.", version: 2 },
    { vendorId: nimbus.id, title: "ISO 27001 Certificate", type: "certificate", fileName: "nimbus-iso27001.pdf", owner: "Nimbus Compliance", status: "verified", uploadedAt: days(-200), validUntil: days(165), reviewerNote: "Certificate number checked against the issuing body registry.", version: 1 },
    { vendorId: nimbus.id, title: "Penetration Test Summary 2024", type: "test", fileName: "nimbus-pentest-2024.pdf", owner: "Nimbus Security", status: "verified", uploadedAt: days(-420), validUntil: days(-35), reviewerNote: "Expired - request the 2025 report.", version: 1 },
    { vendorId: nimbus.id, title: "Incident Response Plan", type: "policy", fileName: "nimbus-ir-plan.pdf", owner: "Nimbus Security", status: "submitted", uploadedAt: days(-20), validUntil: days(345), reviewerNote: "", version: 1 },
    { vendorId: nimbus.id, title: "BC/DR Test Report 2024", type: "test", fileName: "nimbus-bcdr-2024.pdf", owner: "Nimbus Operations", status: "clarification_requested", uploadedAt: days(-90), validUntil: days(275), reviewerNote: "Report does not state the recovery time achieved for IaaS customers. Clarification requested.", version: 1 },
    { vendorId: nimbus.id, title: "Backup & Restoration Policy", type: "policy", fileName: "nimbus-backup-policy.pdf", owner: "Nimbus Operations", status: "verified", uploadedAt: days(-150), validUntil: days(215), reviewerNote: "Restore test evidence referenced but not attached - acceptable for this cycle.", version: 1 },
    // PayZen
    { vendorId: payzen.id, title: "SOC 2 Type II Report 2025", type: "report", fileName: "payzen-soc2-2025.pdf", owner: "PayZen Compliance", status: "verified", uploadedAt: days(-30), validUntil: days(335), reviewerNote: "Covers payroll SaaS controls.", version: 1 },
    { vendorId: payzen.id, title: "Penetration Test Attestation 2025", type: "test", fileName: "payzen-pentest-2025.pdf", owner: "PayZen Security", status: "submitted", uploadedAt: days(-10), validUntil: days(320), reviewerNote: "", version: 1 },
    { vendorId: payzen.id, title: "Data Processing Addendum (signed)", type: "contract", fileName: "payzen-dpa.pdf", owner: "Legal", status: "verified", uploadedAt: days(-100), validUntil: days(265), reviewerNote: "Includes breach notification clause of 48 hours.", version: 1 },
    // Sentinel
    { vendorId: sentinel.id, title: "ISO 27001 Certificate", type: "certificate", fileName: "sentinel-iso27001.pdf", owner: "Sentinel Compliance", status: "verified", uploadedAt: days(-80), validUntil: days(285), reviewerNote: "", version: 1 },
    // DataBridge
    { vendorId: databridge.id, title: "SOC 2 Type II Report 2025", type: "report", fileName: "databridge-soc2-2025.pdf", owner: "DataBridge Compliance", status: "verified", uploadedAt: days(-45), validUntil: days(320), reviewerNote: "", version: 1 },
  ];
  const evRows = await db
    .insert(evidence)
    .values(evSeed.map((e) => ({ ...e, uploadedById: reviewer.id })))
    .returning();

  const evByTitle = (t: string) => evRows.find((e) => e.title === t)!;

  /* -------------------------- resilience records --------------------------- */
  await targetDb.insert(resilienceRecords).values([
    { vendorId: nimbus.id, continuityPlanStatus: "approved", lastExerciseAt: days(-390), exerciseOutcome: "partial", rtoHours: 8, notes: "Exercise exceeded the portal's 4-hour RTO during the database failover scenario. Retest planned." },
    { vendorId: sentinel.id, continuityPlanStatus: "approved", lastExerciseAt: days(-120), exerciseOutcome: "passed", rtoHours: 12, notes: "" },
    { vendorId: payzen.id, continuityPlanStatus: "tested", lastExerciseAt: days(-200), exerciseOutcome: "passed", rtoHours: 24, notes: "" },
    { vendorId: databridge.id, continuityPlanStatus: "approved", lastExerciseAt: days(-150), exerciseOutcome: "passed", rtoHours: 48, notes: "" },
    { vendorId: cloudesk.id, continuityPlanStatus: "none", exerciseOutcome: "not_run", rtoHours: null, notes: "Requested during intake." },
    { vendorId: routeone.id, continuityPlanStatus: "draft", exerciseOutcome: "not_run", rtoHours: null, notes: "" },
    { vendorId: mailrite.id, continuityPlanStatus: "draft", lastExerciseAt: days(-600), exerciseOutcome: "partial", rtoHours: 72, notes: "" },
    { vendorId: acme.id, continuityPlanStatus: "none", exerciseOutcome: "not_run", rtoHours: null, notes: "Not applicable - no dependency." },
  ]);

  /* ----------------------------- assessments ------------------------------- */
  // Nimbus v1: conditionally approved last year
  const [nimbusV1] = await db
    .insert(assessments)
    .values({
      vendorId: nimbus.id,
      templateId: tpl.id,
      version: 1,
      status: "conditionally_approved",
      triggerReason: "Initial onboarding assessment",
      issuedAt: days(-410),
      dueAt: days(-380),
      submittedAt: days(-385),
      reviewerId: reviewer.id,
      reviewerRationale: "Strong baseline posture. BC/DR evidence did not demonstrate the portal's 4-hour RTO; penetration test approaching expiry.",
      decision: "conditionally_approved",
      decidedById: approver.id,
      decidedAt: days(-375),
      decisionRationale: "Approved for 12 months on condition that a recovery exercise demonstrating the portal RTO is completed and the refreshed penetration test is supplied.",
      nextReassessmentAt: days(24),
    })
    .returning();

  // Nimbus v2: event-triggered reassessment, in review (the demo scenario)
  const [nimbusV2] = await db
    .insert(assessments)
    .values({
      vendorId: nimbus.id,
      templateId: tpl.id,
      version: 2,
      status: "in_review",
      triggerReason: "Event-triggered: availability incident on the customer portal + expiring penetration test evidence.",
      issuedAt: days(-18),
      dueAt: days(10),
      submittedAt: days(-5),
      reviewerId: reviewer.id,
    })
    .returning();

  const answersV2: { qIdx: number; response: string; comment: string; ev?: string }[] = [
    { qIdx: 0, response: "yes", comment: "Policy v4.1 approved Jan 2025.", ev: "SOC 2 Type II Report 2025" },
    { qIdx: 1, response: "yes", comment: "Annual training completion 98%.", ev: "SOC 2 Type II Report 2025" },
    { qIdx: 2, response: "yes", comment: "MFA enforced via IdP for all admin planes.", ev: "ISO 27001 Certificate" },
    { qIdx: 3, response: "yes", comment: "Quarterly access reviews evidenced in SOC 2 CC6.", ev: "SOC 2 Type II Report 2025" },
    { qIdx: 4, response: "partial", comment: "Customer-data access limited; subprocessor list under review after portal incident.", ev: "Incident Response Plan" },
    { qIdx: 5, response: "yes", comment: "TLS 1.3 at edge; AES-256 volumes.", ev: "ISO 27001 Certificate" },
    { qIdx: 6, response: "yes", comment: "Retention schedule documented in DPA." },
    { qIdx: 7, response: "yes", comment: "2024 test attached; 2025 test scheduled next month.", ev: "Penetration Test Summary 2024" },
    { qIdx: 8, response: "yes", comment: "Patch SLG defined; metrics in SOC 2 CC7.", ev: "SOC 2 Type II Report 2025" },
    { qIdx: 9, response: "yes", comment: "24h notification clause honoured during the portal outage (notified in 6h).", ev: "Incident Response Plan" },
    { qIdx: 10, response: "yes", comment: "BC/DR plan approved and reviewed annually.", ev: "BC/DR Test Report 2024" },
    { qIdx: 11, response: "partial", comment: "Exercise ran, but the database failover met 8h against our 4h RTO. Retest committed.", ev: "BC/DR Test Report 2024" },
  ];
  await targetDb.insert(answers).values(
    answersV2.map((a) => ({
      assessmentId: nimbusV2.id,
      questionId: qRows[a.qIdx].id,
      response: a.response,
      comment: a.comment,
      evidenceId: a.ev ? evByTitle(a.ev).id : null,
    })),
  );

  // PayZen: answers complete, decision pending
  const [payzenA] = await db
    .insert(assessments)
    .values({
      vendorId: payzen.id,
      templateId: tpl.id,
      version: 1,
      status: "decision_pending",
      triggerReason: "Initial onboarding assessment",
      issuedAt: days(-30),
      dueAt: days(-2),
      submittedAt: days(-12),
      reviewerId: reviewer.id,
      reviewerRationale:
        "Posture is strong for the data handled. SOC 2 verified, DPA signed with 48h breach notification. Recommend approval with a standard 12-month cycle. Personal-data processing flagged for the future DPDP privacy module.",
    })
    .returning();
  const payzenAns: { qIdx: number; response: string; comment: string; ev?: string }[] = [
    { qIdx: 0, response: "yes", comment: "Policy reviewed annually.", ev: "SOC 2 Type II Report 2025" },
    { qIdx: 1, response: "yes", comment: "Training tracked in HRIS.", ev: "SOC 2 Type II Report 2025" },
    { qIdx: 2, response: "yes", comment: "MFA for all staff.", ev: "SOC 2 Type II Report 2025" },
    { qIdx: 3, response: "yes", comment: "Quarterly reviews.", ev: "SOC 2 Type II Report 2025" },
    { qIdx: 4, response: "yes", comment: "Least privilege via RBAC.", ev: "SOC 2 Type II Report 2025" },
    { qIdx: 5, response: "yes", comment: "TLS 1.2+, AES-256 at rest.", ev: "Penetration Test Attestation 2025" },
    { qIdx: 6, response: "yes", comment: "Deletion within 30 days of exit per DPA.", ev: "Data Processing Addendum (signed)" },
    { qIdx: 7, response: "yes", comment: "2025 attestation attached.", ev: "Penetration Test Attestation 2025" },
    { qIdx: 8, response: "yes", comment: "Critical 7d / high 14d.", ev: "Penetration Test Attestation 2025" },
    { qIdx: 9, response: "yes", comment: "48h clause in signed DPA.", ev: "Data Processing Addendum (signed)" },
    { qIdx: 10, response: "yes", comment: "Tested BCP, annual review.", ev: "SOC 2 Type II Report 2025" },
    { qIdx: 11, response: "yes", comment: "Recovery test passed in Feb.", ev: "SOC 2 Type II Report 2025" },
  ];
  await targetDb.insert(answers).values(
    payzenAns.map((a) => ({
      assessmentId: payzenA.id,
      questionId: qRows[a.qIdx].id,
      response: a.response,
      comment: a.comment,
      evidenceId: a.ev ? evByTitle(a.ev).id : null,
    })),
  );

  // Sentinel: issued, awaiting vendor answers
  await targetDb.insert(assessments).values({
    vendorId: sentinel.id,
    templateId: tpl.id,
    version: 1,
    status: "issued",
    triggerReason: "Annual scheduled reassessment",
    issuedAt: days(-3),
    dueAt: days(11),
  });

  // RouteOne: issued
  await targetDb.insert(assessments).values({
    vendorId: routeone.id,
    templateId: tpl.id,
    version: 1,
    status: "issued",
    triggerReason: "Initial onboarding assessment",
    issuedAt: days(-7),
    dueAt: days(7),
  });

  // DataBridge: approved last cycle
  await targetDb.insert(assessments).values({
    vendorId: databridge.id,
    templateId: tpl.id,
    version: 1,
    status: "approved",
    triggerReason: "Initial onboarding assessment",
    issuedAt: days(-160),
    dueAt: days(-146),
    submittedAt: days(-140),
    reviewerId: reviewer.id,
    reviewerRationale: "De-identified data only; verified SOC 2.",
    decision: "approved",
    decidedById: approver.id,
    decidedAt: days(-135),
    decisionRationale: "Approved on standard annual cycle.",
    nextReassessmentAt: days(140),
  });

  /* -------------------- findings, actions, exceptions ---------------------- */
  const [f1] = await db
    .insert(findings)
    .values([
      { vendorId: nimbus.id, assessmentId: nimbusV2.id, title: "Recovery exercise missed the customer portal RTO", description: "Database failover met 8 hours against the contracted 4-hour RTO for the portal stack.", severity: "high", status: "in_progress", createdById: reviewer.id },
      { vendorId: nimbus.id, assessmentId: nimbusV2.id, title: "Penetration test report expired", description: "The 2024 penetration test is past its validity date; the 2025 summary has not been supplied.", severity: "medium", status: "open", createdById: reviewer.id },
      { vendorId: nimbus.id, assessmentId: nimbusV2.id, title: "Concentration risk: single cloud provider for portal", description: "Nimbus delivers ~90% of the customer portal hosting. Exit and portability plan is not documented.", severity: "high", status: "open", createdById: reviewer.id },
    ])
    .returning();

  await targetDb.insert(actions).values([
    { vendorId: nimbus.id, findingId: f1.id, title: "Obtain retest evidence for the portal failover scenario by end of quarter", ownerName: "K. Deshmukh", dueAt: days(30), status: "in_progress" },
    { vendorId: nimbus.id, title: "Request 2025 penetration test summary from Nimbus security team", ownerName: "Raj Jadav", dueAt: days(-4), status: "open" },
    { vendorId: payzen.id, title: "Record DPDP applicability note with legal counsel before renewal", ownerName: "S. Kulkarni", dueAt: days(45), status: "open" },
    { vendorId: routeone.id, title: "Chase questionnaire responses from RouteOne", ownerName: "Raj Jadav", dueAt: days(7), status: "open" },
    { vendorId: mailrite.id, title: "Refresh BC/DR statement at next renewal", ownerName: "A. Thomas", dueAt: days(120), status: "open" },
  ]);

  await targetDb.insert(exceptions).values([
    { vendorId: nimbus.id, title: "Temporary acceptance: BC/DR exercise gap", rationale: "Portal recovery missed RTO in the last exercise. Accepting for one quarter while retest evidence is produced.", compensatingControls: "Warm-standby static fallback page; contractual credit and exit clauses; monthly availability review.", status: "proposed", expiresAt: days(90) },
    { vendorId: sentinel.id, title: "Privileged SIEM access from vendor analyst consoles", rationale: "Vendor SOC analysts require privileged access to perform monitoring duties.", compensatingControls: "JIT access with approval workflow; session recording; quarterly access recertification.", status: "active", expiresAt: days(120), approvedById: approver.id },
  ]);

  /* -------------------------------- audit ---------------------------------- */
  await targetDb.insert(auditEvents).values([
    { actorId: admin.id, actorName: admin.name, entityType: "vendor", entityId: nimbus.id, action: "Vendor intake", detail: "Nimbus Cloud Hosting registered; mapped to Customer Portal and Payment Processing.", createdAt: days(-430) },
    { actorId: reviewer.id, actorName: reviewer.name, entityType: "assessment", entityId: nimbusV1.id, action: "Sent for decision", detail: "Reviewer completed v1 with conditional recommendation.", createdAt: days(-377) },
    { actorId: approver.id, actorName: approver.name, entityType: "assessment", entityId: nimbusV1.id, action: "Decision recorded", detail: "v1 conditionally approved for 12 months.", createdAt: days(-375) },
    { actorId: admin.id, actorName: admin.name, entityType: "vendor", entityId: nimbus.id, action: "Reassessment triggered", detail: "Event-triggered: availability incident on the customer portal + expiring penetration test evidence.", createdAt: days(-18) },
    { actorId: mayaRep.id, actorName: mayaRep.name, entityType: "assessment", entityId: nimbusV2.id, action: "Responses submitted", detail: "Vendor submitted questionnaire responses for v2.", createdAt: days(-5) },
    { actorId: reviewer.id, actorName: reviewer.name, entityType: "vendor", entityId: nimbus.id, action: "Evidence reviewed", detail: "SOC 2 Type II Report 2025 marked verified.", createdAt: days(-2) },
  ]);

  /* ------------------------------ audit trail ----------------------------- */
  await targetDb.insert(auditReports).values([
    { title: "TPRM portfolio risk report — Q4 review", reportType: "portfolio", generatedById: admin.id, generatedByName: admin.name, snapshot: JSON.stringify({ generatedAt: days(-14).toISOString(), summary: { vendorCount: 8 } }), createdAt: days(-14) },
    { title: "Evidence confidence report — Nimbus Cloud Hosting", reportType: "evidence", vendorId: nimbus.id, generatedById: reviewer.id, generatedByName: reviewer.name, snapshot: JSON.stringify({ generatedAt: days(-2).toISOString(), vendorId: nimbus.id }), createdAt: days(-2) },
  ]);

  /* ------------------------ prototype evaluation tasks ------------------- */
  const evalTasks = await db
    .insert(evaluationTasks)
    .values([
      {
        title: "Scenario 1 — Triage an event-triggered reassessment",
        scenario: "Nimbus Cloud Hosting suffered a high-severity availability incident and its penetration-test evidence has expired. Reassessment v2 has been submitted by the vendor.",
        instructions: "Open Nimbus from the vendor register, inspect the inherent and residual scores, check evidence status, review the resilience readiness gap, then decide whether to send the assessment for approval.",
        expectedOutcome: "Reviewer can explain why the residual score is 42 while evidence confidence is only 58, and routes the assessment to the approver with a written rationale.",
        position: 1,
      },
      {
        title: "Scenario 2 — Evaluate regulatory coverage gaps",
        scenario: "PayZen processes employee PII and its contract expires in 15 days. The DPDP and RBI outsourcing obligations must be confirmed before renewal.",
        instructions: "Use the Compliance matrix to inspect PayZen's coverage, record the current status of DPDP-2023, and raise a reassessment trigger if a gap exists.",
        expectedOutcome: "Reviewer identifies partially evidenced RBI obligations, records the DPDP status with notes, and raises a contract-change trigger.",
        position: 2,
      },
      {
        title: "Scenario 3 — Approve with conditions and prove traceability",
        scenario: "A high-tier assessment is pending decision with unresolved resilience findings.",
        instructions: "As approver, record a conditional approval with a rationale and horizon, then open the generated audit report and verify every action appears in the audit trail.",
        expectedOutcome: "Decision is stored with actor, timestamp and rationale; a tracking action is created; the audit trail and generated report agree.",
        position: 3,
      },
      {
        title: "Scenario 4 — Restrict access for a vendor representative",
        scenario: "A vendor representative should only see their own vendor's assessment, while an auditor needs read-only access to the whole portfolio.",
        instructions: "Sign in as the vendor representative and confirm only Nimbus data is visible. Sign in as the auditor and confirm write actions are unavailable.",
        expectedOutcome: "Vendor scope is enforced in navigation, pages and server actions; auditor receives read-only access with an explicit banner.",
        position: 4,
      },
    ])
    .returning();

  await targetDb.insert(evaluationFeedback).values([
    { taskId: evalTasks[0].id, respondentName: "Raj Jadav", respondentRole: "reviewer", taskCompletion: 5, ease: 4, clarity: 5, traceability: 5, usefulness: 5, comments: "The evidence-confidence breakdown made it obvious which answer was driving the score. I would like a bulk 'request clarification' action." },
    { taskId: evalTasks[1].id, respondentName: "Dhanraj Rana", respondentRole: "admin", taskCompletion: 4, ease: 4, clarity: 5, traceability: 5, usefulness: 5, comments: "Standards applicability is automatic, which removed the manual mapping I used to keep in a spreadsheet." },
    { taskId: evalTasks[2].id, respondentName: "Chaitanya Nagre", respondentRole: "approver", taskCompletion: 5, ease: 4, clarity: 4, traceability: 5, usefulness: 4, comments: "Conditional approvals auto-create a tracked action - that closes the loop we usually lose." },
    { taskId: evalTasks[3].id, respondentName: "Elena Rossi", respondentRole: "auditor", taskCompletion: 5, ease: 5, clarity: 5, traceability: 5, usefulness: 4, comments: "Read-only mode and the immutable audit trail are exactly what I need for a walkthrough." },
    { taskId: null, respondentName: "Jenil Dalal", respondentRole: "vendor", taskCompletion: 4, ease: 3, clarity: 4, traceability: 4, usefulness: 4, comments: "As a vendor I only saw the Nimbus questionnaire. Uploading evidence per question was clear, but I would like to see reviewer comments inline." },
  ]);

  console.log("Seed complete.");
  console.log("Demo logins (email / password):");
  console.log(`  administrator → ${admin.email} / ${DEMO_PASSWORDS.admin}`);
  console.log(`  reviewer      → ${reviewer.email} / ${DEMO_PASSWORDS.reviewer}`);
  console.log(`  approver      → ${approver.email} / ${DEMO_PASSWORDS.approver}`);
  console.log(`  vendor rep    → ${mayaRep.email} / ${DEMO_PASSWORDS.vendor}`);
  console.log(`  auditor       → elena.rossi@demo.vrap / ${DEMO_PASSWORDS.auditor}`);
}

async function main() {
  // The CLI seeds explicitly exactly once — tell the PGlite bootstrap not to
  // auto-seed on top of it.
  process.env.VRAP_SKIP_AUTOSEED = "1";
  await ensureDb();
  await seedData(db);
}

// Only run when executed directly (e.g. `npx tsx src/db/seed.ts`) — never on import.
// src/db/index.ts imports seedData() for auto-seeding an empty database;
// running the CLI must be the only path that wipes and re-seeds via main().
const isDirectRun = (() => {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(resolve(entry)).href;
})();

if (isDirectRun) {
  main()
    .catch((e) => {
      console.error(e);
      process.exitCode = 1;
    })
    .finally(async () => {
      if (pool) await pool.end();
      // PGlite flushes its data directory when the process exits.
    });
}
