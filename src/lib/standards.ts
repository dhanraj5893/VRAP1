/* -------------------------------------------------------------------------- */
/*  Standards & regulatory catalog for TPRM.                                   */
/*  Each entry describes what the framework requires of third parties and      */
/*  which vendor attributes make it applicable. The same catalog seeds the     */
/*  `standards` table; per-vendor status lives in `vendor_compliance`.         */
/*  References are to the current published versions (checked 2026).           */
/* -------------------------------------------------------------------------- */

export interface StandardDef {
  code: string;
  name: string;
  version: string;
  region: string;
  category: string; // Cyber | Privacy | Operational | Financial | AI
  description: string;
  applicability: string; // comma list of vendor flags: personalData, aiUse, payments, cloud, all
  keyObligations: string[];
}

export const STANDARDS_CATALOG: StandardDef[] = [
  {
    code: "ISO27001-2022",
    name: "ISO/IEC 27001 Information Security Management",
    version: "2022 (Annex A: 93 controls)",
    region: "Global",
    category: "Cyber",
    description:
      "ISMS requirements with 93 Annex A controls across organisational, people, physical and technological themes. The baseline for most enterprise vendor due diligence.",
    applicability: "all",
    keyObligations: [
      "Documented ISMS scope, risk assessment and treatment plan",
      "Access control, cryptography and secure development controls (A.5–A.8)",
      "Supplier relationship controls (A.5.19–A.5.23)",
      "Incident management and evidence of control effectiveness",
    ],
  },
  {
    code: "NIST-CSF-2.0",
    name: "NIST Cybersecurity Framework 2.0",
    version: "2.0 (Feb 2024)",
    region: "Global",
    category: "Cyber",
    description:
      "Six functions — Govern, Identify, Protect, Detect, Respond, Recover — with the new Govern function explicitly covering supply-chain risk management (GV.SC).",
    applicability: "all",
    keyObligations: [
      "Governance of cybersecurity and supply-chain risk (GV.SC)",
      "Asset, data and risk identification for third parties",
      "Protective safeguards, detection and response capabilities",
      "Recovery and continuous improvement evidence",
    ],
  },
  {
    code: "NIST-CSCRM",
    name: "NIST SP 800-161 Rev.1 — Supply Chain Risk Management",
    version: "Rev.1 (2024)",
    region: "Global",
    category: "Cyber",
    description:
      "NIST's dedicated C-SCRM guide: enterprise and organisational SCRM strategy, supplier assessment, and controls for ICT supply-chain compromise.",
    applicability: "all",
    keyObligations: [
      "Documented SCRM strategy and supplier risk tiering",
      "Supplier assessment across the lifecycle (plan → sustain)",
      "Controls against supply-chain compromise and counterfeit ICT",
      "Contingency and exit strategies for critical suppliers",
    ],
  },
  {
    code: "SOC2",
    name: "AICPA SOC 2 — Trust Services Criteria",
    version: "2017 TSC (CC1–CC7)",
    region: "Global",
    category: "Cyber",
    description:
      "Common Criteria for security, availability, processing integrity, confidentiality and privacy. Type II reports are the most commonly requested vendor evidence.",
    applicability: "all",
    keyObligations: [
      "Control environment and risk assessment (CC1–CC2)",
      "Logical access, change management and operations (CC6–CC7)",
      "System operations, monitoring and incident response",
      "Subservice organisation (fourth-party) disclosure",
    ],
  },
  {
    code: "PCI-DSS-4.0",
    name: "PCI DSS — Payment Card Industry Data Security Standard",
    version: "v4.0.1 (2024)",
    region: "Global",
    category: "Financial",
    description:
      "12 requirement families for cardholder-data environments. Applies to any vendor storing, processing or transmitting card data, including payment gateways.",
    applicability: "payments",
    keyObligations: [
      "Cardholder data encryption and key management (Req 3–4)",
      "Access control and MFA for CDE access (Req 7–8)",
      "Logging, monitoring and vulnerability management (Req 6, 10–12)",
      "Service-provider attestation (AOC) and incident response",
    ],
  },
  {
    code: "GDPR",
    name: "EU General Data Protection Regulation",
    version: "Regulation (EU) 2016/679",
    region: "EU",
    category: "Privacy",
    description:
      "Processor obligations under Art. 28 (contracts, sub-processor approval), 72-hour breach notification (Art. 33), and cross-border transfer mechanisms (Chapter V).",
    applicability: "personalData",
    keyObligations: [
      "Art. 28 data processing agreement with sub-processor control",
      "72-hour personal-data breach notification to controller",
      "Cross-border transfer safeguards (SCCs / adequacy)",
      "Assistance with data-subject rights and deletion at exit",
    ],
  },
  {
    code: "DORA",
    name: "EU Digital Operational Resilience Act",
    version: "Regulation (EU) 2022/2554 (from Jan 2025)",
    region: "EU",
    category: "Financial",
    description:
      "ICT third-party risk management for financial entities: register of information, pre-contractual risk assessment, contractual clauses (Art. 28) and concentration risk.",
    applicability: "payments,cloud",
    keyObligations: [
      "Register of ICT third-party arrangements and dependencies",
      "Pre-contractual and periodic risk assessments",
      "Mandatory contract clauses incl. audit and exit rights",
      "Concentration-risk and substitutability analysis",
    ],
  },
  {
    code: "NIS2",
    name: "EU NIS2 Directive — Network & Information Systems",
    version: "Directive (EU) 2022/2555",
    region: "EU",
    category: "Cyber",
    description:
      "Supply-chain security duties for essential and important entities (Art. 21): assess supplier security practices and handle vulnerabilities in ICT products.",
    applicability: "cloud",
    keyObligations: [
      "Supplier security practices included in risk measures",
      "Vulnerability handling and coordinated disclosure",
      "Incident reporting (24h early warning / 72h notification)",
      "Use of certification schemes where available",
    ],
  },
  {
    code: "DPDP-2023",
    name: "India DPDP Act — Data Protection & Privacy",
    version: "Act 2023 + draft Rules (2025)",
    region: "India",
    category: "Privacy",
    description:
      "India's Digital Personal Data Protection Act: data-fiduciary duties, consent, purpose limitation, breach notification to the Data Protection Board and data principals, and processor contracts.",
    applicability: "personalData",
    keyObligations: [
      "Processor contract covering purpose, security and breach duties",
      "Breach notification to the Board and affected data principals",
      "Data minimisation, retention and erasure on purpose completion",
      "Cross-border transfer as permitted under the Act",
    ],
  },
  {
    code: "CERT-IN-2022",
    name: "CERT-In Directions — Cyber Incident Reporting (India)",
    version: "Directions, 28 Apr 2022",
    region: "India",
    category: "Operational",
    description:
      "Indian entities and service providers must report specified cyber incidents to CERT-In within 6 hours of detection and preserve logs for 180 days.",
    applicability: "all",
    keyObligations: [
      "6-hour incident reporting to CERT-In",
      "180-day log retention and synchronised clocks (NTP)",
      "Vendor notification SLAs aligned to the 6-hour clock",
      "Incident evidence preservation for investigation",
    ],
  },
  {
    code: "RBI-SEBI",
    name: "RBI / SEBI / IRDAI — Regulated Outsourcing & Cyber Frameworks",
    version: "RBI IT Governance Directions 2023; SEBI CSCRF 2024",
    region: "India",
    category: "Financial",
    description:
      "Indian financial-sector outsourcing rules: board-approved policies, materiality assessment, audit rights, data localisation and exit strategies for regulated entities.",
    applicability: "payments,personalData",
    keyObligations: [
      "Board-approved outsourcing / IT governance policy coverage",
      "Materiality and concentration assessment before contracting",
      "Audit, inspection and data-localisation clauses",
      "Documented exit strategy and business-continuity testing",
    ],
  },
  {
    code: "CSA-CCM",
    name: "CSA Cloud Controls Matrix & CAIQ",
    version: "CCM v4.0 / CAIQ",
    region: "Global",
    category: "Cyber",
    description:
      "Cloud-specific control set (18 domains, 197 controls) with the CAIQ questionnaire used for cloud vendor self-assessment and STAR registry.",
    applicability: "cloud",
    keyObligations: [
      "Cloud domain controls (IAM, encryption, logging, resilience)",
      "CAIQ self-assessment or STAR attestation",
      "Sub-processor and data-residency transparency",
      "Continuous monitoring evidence",
    ],
  },
  {
    code: "SIG",
    name: "Shared Assessments SIG — Standardized Information Gathering",
    version: "SIG 2024",
    region: "Global",
    category: "Cyber",
    description:
      "Industry-standard third-party risk questionnaire (240+ questions across 18 risk areas) widely used to standardise vendor assessments.",
    applicability: "all",
    keyObligations: [
      "SIG-aligned responses for comparable vendor scoring",
      "Risk-area coverage incl. privacy, AI and ESG add-ons",
      "Evidence mapping per question",
      "Periodic re-attestation",
    ],
  },
  {
    code: "ISO42001-AI",
    name: "ISO/IEC 42001 — AI Management System",
    version: "2023",
    region: "Global",
    category: "AI",
    description:
      "AI governance requirements: AI policy, risk assessment for AI systems, human oversight, data governance and transparency for AI-enabled services.",
    applicability: "aiUse",
    keyObligations: [
      "AI use-case inventory and risk classification",
      "Human oversight and accountability for AI outputs",
      "Training-data governance and bias testing",
      "Transparency, logging and incident handling for AI systems",
    ],
  },
];

export const COMPLIANCE_STATUS_META: Record<string, { label: string; cls: string }> = {
  not_assessed: { label: "Not assessed", cls: "border-zinc-500/40 bg-zinc-500/10 text-zinc-300" },
  compliant: { label: "Compliant", cls: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" },
  partial: { label: "Partial", cls: "border-amber-400/30 bg-amber-400/10 text-amber-300" },
  non_compliant: { label: "Non-compliant", cls: "border-rose-400/30 bg-rose-400/10 text-rose-300" },
  na: { label: "N/A", cls: "border-zinc-500/40 bg-zinc-500/10 text-zinc-400" },
};

/** Does a vendor's profile make a standard applicable? */
export function isStandardApplicable(
  applicability: string,
  vendor: { personalDataFlag: boolean; aiUseFlag: boolean; category: string; name: string },
): boolean {
  const flags = applicability.split(",").map((s) => s.trim()).filter(Boolean);
  if (flags.includes("all")) return true;
  const cat = `${vendor.category} ${vendor.name}`.toLowerCase();
  if (flags.includes("personalData") && vendor.personalDataFlag) return true;
  if (flags.includes("aiUse") && vendor.aiUseFlag) return true;
  if (flags.includes("payments") && /pay|card|financ|bank|insurance|payroll/.test(cat)) return true;
  if (flags.includes("cloud") && /cloud|hosting|saas|iaas|analytics|crm|email/.test(cat)) return true;
  return false;
}
