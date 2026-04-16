# Project Charter: Telehealth_V3 — MedBridge Connect Patient Portal

---

| Field | Details |
|---|---|
| **Project Code** | Telehealth_V3 |
| **Project Name** | MedBridge Connect — Patient Portal |
| **Client** | MedBridge Health |
| **Industry** | Healthcare |
| **Project Type** | Greenfield (New Build) |
| **Document Version** | 1.0 |
| **Date Issued** | April 2026 |
| **Classification** | Internal / Confidential |
| **Reference Documents** | MB-2026-Portal-001 v1.2; MB-PORTAL-DISC-001 |

---

## Executive Summary

MedBridge Health operates a network of 14 outpatient clinics across Western Ukraine — serving approximately 185,000 active patients across Lviv, Ivano-Frankivsk, and Ternopil — and currently lacks any digital patient-facing infrastructure. Patient interactions are managed predominantly via phone-based scheduling, paper intake forms, and in-person result delivery, generating significant operational inefficiencies, measurable revenue loss, and accelerating patient attrition to digitally enabled competitors.

This Project Charter formally initiates **Telehealth_V3**, the greenfield development of **MedBridge Connect**: a bilingual (Ukrainian/English), web-based Progressive Web Application (PWA) that will serve as the organisation's unified digital front door for all patient interactions. The platform will deliver online appointment scheduling, automated reminders, digital lab results, secure patient-to-care-team messaging, family proxy accounts, patient profile management, and integrated payment processing — all built in full compliance with Ukrainian Law No. 2297-VI, MoH Order No. 1236, and GDPR.

The project is structured across two phases. **Phase 1 (MVP)** targets a beta launch with three Lviv pilot clinics by late September 2026 and a full 14-clinic General Availability rollout in December 2026. **Phase 2** extends the platform with telemedicine, prescription management, and pharmacy integration, targeting completion in Q1 2027. The total approved budget for both phases is **18.0M UAH (~$435K USD)**.

---

## Project Sponsor & Stakeholders

### Executive Sponsor

| Field | Details |
|---|---|
| **Name** | Dr. Roman Shevchuk |
| **Title** | Chief Operating Officer |
| **Responsibility** | Final approval authority, budget allocation, strategic alignment, and executive escalation point |
| **Contact** | [TO BE CONFIRMED] |

---

### Core Project Leadership

| Role | Name | Title | Responsibility | Contact |
|---|---|---|---|---|
| **Product Owner** | Iryna Kovalenko | VP Product | Product vision, requirements definition, vendor management, stakeholder coordination | [TO BE CONFIRMED] |
| **Project Manager** | [TO BE CONFIRMED] | [TO BE CONFIRMED] | Day-to-day delivery management, timeline, risk register, reporting | [TO BE CONFIRMED] |
| **Technical Lead** | Dmytro Lysenko | CTO | Technical architecture, security design, Helsi EHR integration oversight, hosting evaluation | [TO BE CONFIRMED] |

> **Note:** A dedicated Project Manager has not been explicitly identified in source documents. Assignment of this role is a critical pre-condition for project initiation and should be confirmed before the April 16, 2026 stakeholder sync.

---

### Key Stakeholders

| Name | Title | Role & Interest |
|---|---|---|
| Dr. Roman Shevchuk | COO / Executive Sponsor | Strategic and financial authority. Primary success metric: 40%+ monthly active portal users by January 2027 and no-show rate below 20%. |
| Iryna Kovalenko | VP Product | Drives product direction and vendor selection. Accountable for requirements completeness and UAT readiness. |
| Dmytro Lysenko | CTO | Owns all technical decisions including architecture, Helsi API integration, data residency compliance, and vendor technical assessment. |
| Olena Marchenko | Head of Patient Experience | Leads patient research, UX review coordination, staff training strategy, and Patient Advisory Council engagement. |
| Andriy Bondar | CFO | Approved budget (March 15, 2026). Monitors ROI, cost-to-benefit tracking, and financial reporting. |
| Dr. Viktor Tkachuk | Chief Medical Officer | Validates clinical workflows, physician UX requirements, lab result release policies, and telemedicine scope. |
| Natalia Savchenko | Compliance Officer | Accountable for data protection compliance (Law No. 2297-VI, GDPR), consent management framework, authentication standards, and audit readiness. |
| Halyna Doroshenko | Senior Front Desk Administrator (Lviv) | Operational SME for scheduling, check-in, billing, and call centre workflows. Key UAT participant. |
| Patient Advisory Council | 30-member panel | Reviews wireframes and UX designs from a patient perspective. Recruited from existing patient base. |
| Physician UX Review Group | 2–3 physicians across specialties | Reviews clinical-facing portal interfaces. To be recruited by Dr. Tkachuk. [TO BE CONFIRMED — specific members] |
| Selected Vendor | TBD (SoftServe / Sigma Software / Internal) | Responsible for design and development delivery. To be confirmed by April 18, 2026. |
| Helsi EHR (Serhii, Tech Lead) | Third-Party Integration Partner | Provides EHR API access. Critical dependency for scheduling and patient data. |
| Dila / Synevo Laboratories | Third-Party Integration Partner | HL7 FHIR-based lab result delivery. Already integrated with Helsi. |
| GigaCloud / De Novo | Hosting Provider (Candidates) | Ukrainian-territory cloud hosting to satisfy data residency requirements. Proposals requested by April 10, 2026. |

---

## Business Case

### Problem Statement

MedBridge Health's current patient interaction model is entirely analogue, generating compounding operational, financial, and competitive risks:

| Pain Point | Quantified Impact |
|---|---|
| Phone-dependent scheduling (73% of patients call to book) | 1,200 calls/day; 23% call abandonment rate; ~2.1M UAH/month in estimated missed booking revenue |
| High no-show rate (34% vs. 18% industry benchmark) | ~850 UAH lost revenue per missed appointment; no automated reminder mechanism in place |
| Slow lab result delivery (2–5 business days via phone/in-person) | 41% of surveyed patients would switch providers for faster digital access |
| Manual data entry at check-in (62% of visits) | Average check-in time of 11 minutes; significant front-desk resource drain |
| Physician administrative overhead | 18 minutes of non-clinical tasks per patient; cited as top frustration by 67% of physicians in Q4 2025 staff survey |
| Competitive attrition | Loss of ~4,200 patients in the prior year to Dobrobut and Boris Clinic, who launched patient portals in 2025; 8% annual attrition among the 18–35 demographic |

### Strategic Opportunity

Building MedBridge Connect directly addresses each of these problems while positioning MedBridge Health as a digitally competitive healthcare provider in Western Ukraine. The portal is projected to:

- Reduce call centre volume by 40–50% through self-service scheduling and information access
- Reduce the no-show rate from 34% to 18% through automated multi-channel reminders
- Improve patient retention, particularly among the 18–35 demographic
- Reduce physician non-clinical task time from 18 to 8 minutes per patient within 12 months
- Open a new revenue stream via telemedicine for rural and remote patients (estimated 2,400 new consults/month in Phase 2)
- Enable cross-selling of complementary services during the booking flow

The project has received full CFO budget approval (March 15, 2026) and COO executive sponsorship.

---

## Project Goals & Objectives

### Primary Goals

1. **Operational Efficiency:** Reduce call centre volume by 40% within six months of full rollout and by 50% within twelve months, directly reducing operational cost and improving front-desk capacity.

2. **Patient Retention & Acquisition:** Arrest the 8% annual attrition of younger patient demographics and recover competitive position against Dobrobut and Boris Clinic by launching a feature-equivalent or superior digital patient experience by December 2026.

3. **No-Show Reduction:** Reduce appointment no-show rate from the current 34% to 22% within six months and to 18% (industry benchmark) within twelve months of full rollout through automated multi-channel reminders.

4. **Digital Adoption:** Achieve 28,000 monthly active portal users within six months of full rollout, scaling to 65,000 (approximately 35% of the active patient base) within twelve months.

5. **Clinical Efficiency:** Reduce physician non-clinical task time per patient from 18 minutes to 12 minutes within six months and to 8 minutes within twelve months through digital intake, pre-filled history, and asynchronous messaging.

6. **Regulatory Compliance:** Deliver a platform that is fully compliant with Ukrainian Law No. 2297-VI, MoH Order No. 1236, and GDPR from day one of launch, with a path to SOC 2 Type II certification within 18 months of go-live.

### Measurable Objectives by Phase

| Objective | Phase 1 Target (MVP) | Phase 2 Target |
|---|---|---|
| Online booking capability | Live across all 14 clinics by Dec 2026 | Enhanced with telemedicine booking |
| No-show rate | Reduction to 22% | Reduction to 18% |
| Lab result access time | Under 4 hours from sign-off | Under 2 hours |
| Monthly active users | 28,000 | 65,000 |
| Call centre daily volume | Reduced to 850 calls/day | Reduced to 600 calls/day |
| Average check-in time | Reduced to 5 minutes | Reduced to 3 minutes |
| Physician admin time/patient | Reduced to 12 minutes | Reduced to 8 minutes |
| Patient NPS | Improved to 45 | Improved to 55 |

---

## Scope

### In Scope — Phase 1 (MVP, MUST Features)

The following capabilities are confirmed as MUST-HAVE for the MVP and are included in Phase 1 scope:

- **Online Appointment Scheduling:** Real-time (or near-real-time, via 2-minute caching middleware) physician availability display; specialty and physician selection; reason for visit free-text field; cost estimation and insurance co-pay display prior to confirmation; insurance verification (NHSU declaration and private/corporate policies)
- **Automated Appointment Reminders:** Multi-channel delivery via SMS, push notification, and Viber; configurable reminder intervals; easy in-app rescheduling from reminder
- **Digital Lab Results & Diagnostic Imaging Viewer:** HL7 FHIR integration with Dila and Synevo; patient-friendly result presentation with contextual explanations; configurable physician hold period (auto-release for routine results; manual physician release for sensitive results — pathology, imaging, oncology)
- **Patient Profile & Insurance Management:** Self-service demographic and insurance data management; pre-visit profile update capability; digital document upload; NHSU declaration linkage
- **Secure Messaging (Patient-to-Care-Team):** Asynchronous messaging to shared care team inbox (not individual physician); 24–48 hour response expectation communicated to patients; keyword-based emergency triage redirecting urgent messages to emergency services; TLS in transit, AES-256 encryption at rest; 25-year message archiving
- **Family Accounts & Proxy Access:** Parent-managed child accounts (pediatric); adult proxy management for elderly patients; consent-based relationship authorisation; document upload for verification (birth certificate / power of attorney); manual admin approval workflow with 24-hour target turnaround
- **Patient Profile & Insurance Management:** (see above)
- **Payment Integration:** LiqPay and monobank acquiring API integration; pre-visit cost estimation and co-pay collection at time of booking; post-visit digital receipts; insurance reconciliation support
- **Authentication & Identity Verification:** Mandatory two-factor authentication (SMS OTP default); Diia digital ID / Diia.Signature integration for identity verification
- **Single Sign-On (SSO):** SAML 2.0-based SSO with Helsi EHR for physician-facing portal access (no separate login required)
- **Helsi EHR Integration:** Middleware caching layer for schedule synchronisation (2-minute intervals with conflict locking); patient demographics and appointment history via Helsi REST API
- **Compliance Framework:** Full GDPR and Law No. 2297-VI compliance; granular consent management with opt-in per processing purpose and accessible withdrawal mechanism; data stored on Ukrainian-territory servers; WCAG 2.1 AA accessibility compliance
- **Localisation:** Ukrainian (primary) and English (secondary); DD.MM.YYYY date formatting; UAH currency
- **Platform:** Responsive Progressive Web Application (PWA); support for 10,000 concurrent users; 99.9% uptime SLA; page load under 2 seconds on 3G networks
- **Pilot Deployment:** Beta launch with 3 pilot clinics in Lviv (September 2026) prior to full 14-clinic rollout
- **Staff Training Programme:** 2 full training days per clinic; super-user champion programme (2–3 champions per clinic); admin panel and physician interface training
- **Legacy Data Migration:** Cleaning and migration of pre-Helsi data (2019–2022) from legacy MySQL database; estimated 3–4 week dedicated effort

### In Scope — Phase 2 (SHOULD Features, Q1 2027)

- **Telemedicine / Video Consultations:** WebRTC-based video consult module; follow-up and chronic care management use cases only (per current MoH guidelines); session recording and secure storage; per-session patient consent collection; rural patient access focus
- **Prescription Management & Pharmacy Integration:** Digital repeat prescription requests; pharmacy partner integration; Nova Poshta medication delivery tracking
- **Native Mobile Applications:** iOS and Android native apps (PWA is the MVP delivery vehicle)

### In Scope — Future Consideration (COULD, Backlog)

- Health education content library
- Patient satisfaction surveys and NPS tracking (in-app, post-visit)
- Vaccination tracking display (raised as high-value addition for pediatric users)
- Cross-sell / service recommendation engine within booking flow
- Kiosk-based check-in stations at clinic locations

### Out of Scope (Confirmed — Not in V1 or V2)

- **AI Symptom Checker / Triage:** Deferred due to regulatory uncertainty in Ukraine and very high complexity. Under consideration for a future version.
- **Wearable Device Integration:** Deferred due to limited patient demand (under 12% in survey). Future version consideration.
- **Initial Diagnosis via Telemedicine:** Prohibited under current MoH telemedicine guidelines; not in scope for any phase under current regulatory framework.
- **Remote Prescribing of Controlled Substances:** Prohibited under current regulations; excluded from prescription management scope.
- **Replacement of Phone/Call Centre Channel:** The portal is a complementary channel; the call centre and phone-based booking will be retained, particularly to serve the 60+ patient demographic.

---

## Key Deliverables

### Phase 1 — Discovery & Design (April – May 2026)

| Deliverable | Description |
|---|---|
| Technical Architecture Document | Full system architecture including Helsi middleware design, data residency approach, hosting recommendation, and security architecture |
| Hosting Provider Selection | Evaluation and selection of GigaCloud or De Novo (or alternative) for Ukrainian-territory cloud hosting |
| Vendor Selection & Contract | Signed development contract with selected vendor (SoftServe, Sigma Software, or internal team decision); IP ownership and code escrow terms confirmed |
| Validated Wireframes | Patient-facing and physician/admin-facing UI wireframes, reviewed by Patient Advisory Council and Physician UX Review Group |
| Helsi API Integration Specification | Detailed API integration plan including middleware caching architecture, confirmed with Helsi technical team |
| Diia.Signature Integration Specification | Authentication and identity verification integration design |
| Consent Management Framework | Granular consent model documented and approved by Compliance Officer |
| Legacy Data Migration Scope & Estimate | Scoped plan for pre-Helsi data cleaning and migration, with resource and timeline estimate |

### Phase 1 — MVP Development (June – September 2026)

| Deliverable | Description |