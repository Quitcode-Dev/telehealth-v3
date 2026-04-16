# Product Requirements Document (PRD)

## MedBridge Connect — Patient Portal

---

| Field | Details |
|---|---|
| **Project Code** | Telehealth_V3 |
| **Product Name** | MedBridge Connect — Patient Portal |
| **Client** | MedBridge Health |
| **Industry** | Healthcare |
| **Project Type** | Greenfield (New Build) |
| **PRD Version** | 1.0 |
| **Date Issued** | April 2026 |
| **Classification** | Internal / Confidential |
| **Product Owner** | Iryna Kovalenko, VP Product |
| **Executive Sponsor** | Dr. Roman Shevchuk, COO |
| **Reference Documents** | MB-2026-Portal-001 v1.2; MB-PORTAL-DISC-001; Project Charter Telehealth_V3 v1.0 |
| **Methodology** | BABOK v3 — Business Analysis Framework |

---

## Table of Contents

1. [Business Case](#1-business-case)
2. [Business Context & Goals](#2-business-context--goals)
3. [Current State Analysis](#3-current-state-analysis)
4. [Users & Stakeholders](#4-users--stakeholders)
5. [Desired Future State](#5-desired-future-state)
6. [Hypothesis](#6-hypothesis)
7. [Functional Requirements — Epics & User Stories](#7-functional-requirements--epics--user-stories)
8. [Non-Functional Requirements](#8-non-functional-requirements)
9. [Technical Environment & Constraints](#9-technical-environment--constraints)
10. [Success Metrics](#10-success-metrics)
11. [Risks & Open Issues](#11-risks--open-issues)
12. [Assumptions & Dependencies](#12-assumptions--dependencies)
13. [Out of Scope](#13-out-of-scope)
14. [Appendix: Glossary](#14-appendix-glossary)

---

## 1. Business Case

### Why This Product Is Being Built

MedBridge Health operates 14 outpatient clinics across Western Ukraine — serving approximately 185,000 active patients in Lviv, Ivano-Frankivsk, and Ternopil — with zero digital patient-facing infrastructure. Every patient interaction, from appointment scheduling to lab result delivery, is conducted via phone calls, paper forms, or in-person visits.

This analogue-only model is generating compounding, quantifiable harm across four dimensions:

**1. Revenue Leakage**
The clinic network receives approximately 1,200 inbound scheduling calls per day with a 23% call abandonment rate. Abandoned calls represent failed booking opportunities, contributing to an estimated **2.1M UAH per month in missed booking revenue**. Simultaneously, a 34% appointment no-show rate — nearly double the 18% Ukrainian industry benchmark — destroys an estimated **850 UAH in revenue per missed appointment** through idle physician time and unused clinic capacity.

**2. Patient Attrition**
MedBridge lost approximately 4,200 patients in the prior year to Dobrobut and Boris Clinic, both of which launched patient portals in 2025. Patient exit surveys explicitly cite the absence of digital capabilities as the primary switching reason. Annual attrition among the 18–35 demographic stands at 8% — the demographic with the highest lifetime patient value and the highest digital expectations. Without intervention, this attrition rate will accelerate.

**3. Operational Inefficiency**
Front-desk staff manually enter demographic and insurance data for 62% of visits, resulting in an average 11-minute check-in time that strains staff capacity and degrades the patient experience. Physicians spend approximately 18 minutes per patient on non-clinical administrative tasks — 22% of the average consultation window — a source of significant clinical inefficiency and staff burnout (cited by 67% of physicians in the Q4 2025 staff survey as their primary workplace frustration).

**4. Patient Dissatisfaction and Clinical Risk**
Lab results take 2–5 business days to reach patients via phone or in-person pickup. 41% of surveyed patients stated they would switch providers for faster digital access to results. Delayed result delivery also carries clinical risk, as time-sensitive findings are not communicated promptly.

### Strategic Opportunity

**MedBridge Connect** is the organisation's response: a bilingual, web-based Progressive Web Application (PWA) functioning as the unified digital front door for all patient interactions. The business case for building this platform is underpinned by the following strategic rationale:

- **Defensive:** Arrest patient attrition by achieving digital feature parity with competitors Dobrobut and Boris Clinic by December 2026
- **Operational:** Reduce call centre volume by 40–50%, check-in time by 55%, and physician administrative overhead by 56% within 12 months
- **Financial:** Recover 2.1M UAH/month in missed booking revenue and reduce no-show losses through automated multi-channel reminders
- **Growth:** Open a new revenue stream via Phase 2 telemedicine targeting approximately 2,400 new rural/remote consultations per month

The total approved budget is **18.0M UAH (~$435K USD)**, covering both Phase 1 (MVP) and Phase 2. Budget approval was confirmed by CFO Andriy Bondar on **March 15, 2026**.

---

## 2. Business Context & Goals

### 2.1 Goals & Objectives

The following goals are structured by business domain and are directly tied to measurable outcomes:

| # | Goal | Domain | Measurement |
|---|---|---|---|
| G-01 | Reduce appointment no-show rate from 34% to 18% within 12 months of full rollout | Operations | No-show rate % |
| G-02 | Reduce call centre daily volume from 1,200 to 600 calls within 12 months | Operations | Daily inbound call count |
| G-03 | Achieve 65,000 monthly active portal users (~35% of active patient base) within 12 months | Digital Adoption | MAU count |
| G-04 | Reduce average patient check-in time from 11 minutes to 3 minutes within 12 months | Operations | Average check-in time (minutes) |
| G-05 | Reduce physician non-clinical task time per patient from 18 minutes to 8 minutes within 12 months | Clinical Efficiency | Physician admin time per patient (minutes) |
| G-06 | Reduce lab result access time from 2–5 business days to under 2 hours within 12 months | Patient Experience | Average result delivery time |
| G-07 | Improve patient NPS from 32 to 55 within 12 months of full rollout | Patient Satisfaction | Net Promoter Score |
| G-08 | Achieve full compliance with Ukrainian Law No. 2297-VI, MoH Order No. 1236, and GDPR from Day 1 of launch | Compliance | Zero material compliance violations |
| G-09 | Arrest 18–35 demographic attrition and recover competitive position against Dobrobut and Boris Clinic | Competitive | Patient attrition rate by age segment |
| G-10 | Enable telemedicine for follow-up and chronic care — targeting 2,400 new consults/month (Phase 2) | Revenue Growth | Monthly telemedicine consult volume |

### 2.2 The "Why" — Strategic Rationale

MedBridge Health is at an inflection point. Competitors have already launched digital patient portals and are actively capturing patients that MedBridge is losing. The organisation faces a binary choice: build digital capability now or accept accelerating structural decline in its patient base.

MedBridge Connect is not a "nice to have" enhancement. It is a mission-critical defensive and growth investment. The platform directly:
- Removes the primary stated reason for patient attrition (absence of digital portal)
- Creates a new, scalable, low-cost patient acquisition and retention mechanism
- Converts fixed cost (staff time on administrative tasks) into variable digital self-service
- Establishes the technical foundation for Phase 2 telemedicine revenue expansion

### 2.3 KPIs

| KPI | Baseline | 6-Month Target (post-GA) | 12-Month Target |
|---|---|---|---|
| Appointment no-show rate | 34% | 22% | 18% |
| Online booking adoption | 0% | 35% | 55% |
| Call centre daily volume | 1,200 calls/day | 850 calls/day | 600 calls/day |
| Patient NPS | 32 | 45 | 55 |
| Average check-in time | 11 minutes | 5 minutes | 3 minutes |
| Lab result access time | 2–5 business days | < 4 hours | < 2 hours |
| Monthly active portal users (MAU) | 0 | 28,000 | 65,000 |
| Physician admin time per patient | 18 minutes | 12 minutes | 8 minutes |
| Monthly active portal users as % of patient base | 0% | ~15% | ~35% |
| Daily call centre volume reduction (%) | Baseline | -29% | -50% |

### 2.4 Definition of Success

The project is considered **fully successful** when ALL of the following conditions are met:

1. **Phase 1 Beta Launch:** Portal is live with 3 Lviv pilot clinics by **30 September 2026**
2. **Phase 1 General Availability:** Portal is live across all 14 clinics by **31 December 2026**
3. **Phase 2 Launch:** Telemedicine, prescription management, and pharmacy integration are live by **31 March 2027**
4. **Adoption:** 28,000 MAU achieved within 6 months of GA launch; 65,000 MAU within 12 months
5. **No-Show Rate:** Reduced to 22% within 6 months; 18% within 12 months of GA
6. **Compliance:** Zero material violations of Ukrainian Law No. 2297-VI, GDPR, or MoH Order No. 1236 from launch date
7. **Uptime:** Platform maintains 99.9% uptime SLA from GA launch
8. **Patient NPS:** Improved to 45 within 6 months; 55 within 12 months

---

## 3. Current State Analysis

### 3.1 Manual Processes — How Things Work Today

**Appointment Scheduling**
- 73% of patients book via phone call
- Receptionist manually searches Helsi EHR for physician availability across potentially 3–4 doctors' schedules
- Insurance verification (NHSU declaration or private/corporate policy) is performed verbally during the call, adding 2–3 minutes
- No online booking channel exists; no self-service capability
- Average hold time for scheduling: 8.5 minutes

**Patient Check-In**
- New patients: 10–12 minutes of manual data entry (name, address, insurance, allergies, medications)
- Returning patients: re-entry required for any changes (phone number, insurance) which staff discover only at the desk
- 62% of visits involve manual data entry at check-in
- Average check-in time: 11 minutes

**Lab Result Delivery**
- Results communicated via phone callback or in-person pickup only
- Typical delivery time: 2–5 business days
- No digital delivery mechanism
- No patient-friendly result interpretation layer
- Physicians have no mechanism to add context notes prior to patient notification

**Appointment Reminders**
- No automated reminder system in place
- Patients rely on memory alone for appointment recollection
- No-show rate: 34% (industry benchmark: 18%)
- No-show consequence: no outreach mechanism; idle physician time; 850 UAH lost revenue per missed appointment

**Patient-to-Clinic Communication**
- All patient communication routed through central phone lines
- Approximately 55–60% of call volume is scheduling; 15% is lab result enquiries; 10% is billing queries
- No direct patient-to-care-team messaging capability
- Physicians walk into consultations with no pre-visit context from the patient

**Payment Processing**
- Payments collected at reception desk post-visit only
- Accepted methods: cash, card, bank transfer
- ~20% of patients fail to pay immediately, requiring follow-up collection
- Insurance reconciliation is a manual process
- No pre-visit cost estimation or co-pay transparency provided to patients

**Family & Proxy Access**
- No digital mechanism for parents to manage children's health records
- No digital proxy management for elderly patients
- Adult children who manage elderly parents' healthcare must accompany them in person or call on their behalf

### 3.2 Software Currently Used

| System | Purpose | Integration Status |
|---|---|---|
| **Helsi EHR** | Electronic Health Records, scheduling, patient demographics | Primary system of record; limited REST API (no real-time slot availability) |
| **Legacy MySQL Database** | Historical patient records (2019–2022, pre-Helsi) | Inconsistent data formats; migration required |
| **Excel** | Administrative reporting, insurance reconciliation | Manual, clinic-level; no central aggregation |
| **Dila Laboratory System** | Lab result origination | HL7 FHIR support; results feed into Helsi |
| **Synevo Laboratory System** | Lab result origination | HL7 FHIR support; results feed into Helsi |
| **LiqPay** | Partial payment processing (website donations) | Existing integration; not yet used for patient billing |
| **Phone/Telephony System** | All patient communication | Central call centre; no IVR or self-service routing |

### 3.3 Top Pain Points

**Pain Point 1 — Scheduling Bottleneck & Revenue Leakage**
The telephone-only scheduling model creates a structural bottleneck: 1,200 calls per day, 23% call abandonment rate, 8.5-minute average hold time. Abandoned calls represent lost booking revenue estimated at 2.1M UAH per month. Three receptionists at the Lviv Main Clinic are dedicated to phone scheduling from 8:00 AM to 12:00 PM on peak days, unable to serve walk-in patients who are physically present. This is simultaneously a revenue problem, a patient experience problem, and an operational efficiency problem.

**Pain Point 2 — High No-Show Rate Without Mitigation Tools**
At 34%, MedBridge's no-show rate is nearly double the 18% Ukrainian industry benchmark. The absence of any automated reminder system means the entire burden of appointment recollection falls on the patient. At 850 UAH per missed appointment, this represents significant, preventable revenue loss across 14 clinics. The problem is entirely addressable with automated multi-channel reminders — a standard feature in any digital patient engagement platform.

**Pain Point 3 — Physician Administrative Overhead & Clinical Inefficiency**
Physicians spend 18 minutes per patient on non-clinical tasks — reviewing paper intake forms, manually pulling insurance information, walking into consultations with no pre-visit context, and fielding administrative phone queries that interrupt clinical work. This overhead reduces the number of patients a physician can effectively see per day, contributes to physician burnout (67% citing it as their top frustration), and degrades consultation quality. This problem is directly solvable by digital intake, pre-filled patient history, asynchronous messaging, and SSO-based portal access integrated within Helsi.

---

## 4. Users & Stakeholders

### 4.1 Primary User Personas

---

**Persona 1: Oksana — The Young Digital-Native Professional**

| Attribute | Detail |
|---|---|
| **Age / Role** | 28, Marketing Manager, Lviv |
| **Visit Frequency** | 3–4 clinic visits per year |
| **Tech Comfort** | High — daily user of Diia, monobank, Nova Poshta app, social media |
| **Primary Needs** | Fast online booking at any hour; instant lab results on her smartphone; zero paperwork repetition; ability to pay digitally |
| **Key Frustrations** | 8.5-minute hold time to book an appointment; waiting 2–5 days for lab results she could access in minutes digitally; filling out the same paper form at every visit |
| **Portal Behaviours** | Will use PWA on mobile primarily; expects app-quality experience; highly likely to be an early adopter and informal advocate |
| **Risk of Attrition** | High — actively considering switching to Dobrobut which has a digital portal |
| **Design Implications** | Mobile-first layout; fast booking flow (≤4 taps to confirm); push notifications; clean, modern UI |

---

**Persona 2: Petro — The Chronic Care Patient**

| Attribute | Detail |
|---|---|
| **Age / Role** | 62, Retired Engineer, Ivano-Frankivsk |
| **Visit Frequency** | Weekly (diabetes management) |
| **Tech Comfort** | Low to Medium — uses Viber for messaging; basic smartphone functions only |
| **Primary Needs** | Simple appointment management; medication tracking; eventually, video consultations for routine check-ins to avoid 40-minute travel to clinic; results explained in plain language |
| **Key Frustrations** | Complexity of digital interfaces; distrust of computers handling health data; transportation burden for follow-up visits |
| **Portal Behaviours** | Likely to use Viber-channel reminders over app push notifications; may rely on adult child as proxy user; benefits from large font, simple navigation |
| **Risk of Attrition** | Medium — less likely to switch but at risk of disengaging from care if digital tools are not accessible |
| **Design Implications** | WCAG 2.1 AA compliance; minimum 14px font; no medical jargon in patient-facing UI; family proxy access; Viber reminder channel |

---

**Persona 3: Dr. Melnyk — The Specialist Physician**

| Attribute | Detail |
|---|---|
| **Age / Role** | 45, Cardiologist, sees 28 patients/day |
| **Tech Comfort** | Medium-High — daily Helsi EHR user; frustrated by UX but technically capable |
| **Primary Needs** | Pre-filled patient history before consultation; reduced administrative interruptions; asynchronous patient messaging accessible within Helsi (no separate login); digital intake data available at consultation start |
| **Key Frustrations** | Walking into consultations blind (no reason for visit); 18 minutes of non-clinical tasks per patient; needing to chase lab results and insurance data; separate system logins |
| **Portal Behaviours** | Accesses portal via SSO from Helsi; uses shared care team message inbox; reviews pre-visit patient notes; approves/releases lab results |
| **Design Implications** | SSO with Helsi (SAML 2.0); physician-facing interface must be accessible within existing Helsi workflow; configurable lab result release controls; pre-visit reason for visit display |

---

**Persona 4: Halyna — The Front Desk Administrator**

| Attribute | Detail |
|---|---|
| **Age / Role** | 35, Senior Clinic Administrator, Lviv Main Clinic |
| **Tech Comfort** | Medium — daily Helsi and Excel user |
| **Primary Needs** | Reduced inbound call volume; automated check-in via pre-filled patient profiles; insurance verification automation; admin panel for proxy account approval |
| **Key Frustrations** | Three staff on phones non-stop 8 AM–noon on Mondays; 10–12 minute check-in for new patients; manual insurance reconciliation; chasing post-visit unpaid bills |
| **Portal Behaviours** | Manages admin panel: approves proxy access requests; monitors booking queue; handles escalations from portal users |
| **Design Implications** | Admin panel with clear queue management; proxy approval workflow with 24-hour SLA; clear status indicators for insurance verification |

---

**Persona 5: Sofia — The Parent Proxy User**

| Attribute | Detail |
|---|---|
| **Age / Role** | 38, Parent of two children (ages 4 and 9); also manages healthcare for her 74-year-old father |
| **Tech Comfort** | High |
| **Primary Needs** | Single portal login managing multiple family member accounts; book pediatric appointments; view vaccination schedules for children; manage elderly parent's appointments with consent-based proxy access |
| **Key Frustrations** | Currently must call clinic separately for each family member; must accompany elderly parent in person for bookings |
| **Portal Behaviours** | Manages a family account dashboard; switches between linked profiles; receives reminders for all managed family members |
| **Design Implications** | Family account dashboard with clear profile switching; consent-based proxy relationship with audit trail; document upload for birth certificates / power of attorney |

---

### 4.2 Stakeholders

| Name | Title | Decision Authority | Primary Interest |
|---|---|---|---|
| **Dr. Roman Shevchuk** | COO / Executive Sponsor | Final approval; budget authority | 40%+ MAU by Jan 2027; no-show rate < 20%; competitive positioning |
| **Iryna Kovalenko** | VP Product / Product Owner | Requirements sign-off; UAT readiness | Product vision; vendor management; scope completeness |
| **Dmytro Lysenko** | CTO / Technical Lead | Technical architecture decisions | Helsi integration; security; data residency; hosting selection |
| **Olena Marchenko** | Head of Patient Experience | UX review approval; training plan | Patient research outcomes; elderly adoption; UX quality |
| **Andriy Bondar** | CFO | Budget oversight | ROI tracking; cost-to-benefit; budget adherence |
| **Dr. Viktor Tkachuk** | Chief Medical Officer | Clinical workflow validation | Physician adoption; lab result release policies; telemedicine scope |
| **Natalia Savchenko** | Compliance Officer | Compliance sign-off | Law No. 2297-VI; GDPR; consent management; authentication standards |
| **Halyna Doroshenko** | Senior Front Desk Admin | Key UAT participant | Scheduling efficiency; check-in time; admin panel usability |
| **Patient Advisory Council** | 30-member patient panel | UX review and feedback | Accessibility; ease of use; trust |
| **Physician UX Review Group** | 2–3 multi-specialty physicians | Clinical UX review | Physician-facing interface quality; workflow fit |
| **Selected Development Vendor** | TBD (SoftServe / Sigma Software / Internal) — to be confirmed by April 18, 2026 | Delivery execution | Technical delivery; timeline; quality |
| **Helsi EHR (Serhii, Tech Lead)** | Third-Party Integration Partner | API access decisions | Integration feasibility; API roadmap alignment |
| **Dila / Synevo Laboratories** | Third-Party Lab Partners | Lab result data feed | HL7 FHIR result delivery |
| **GigaCloud / De Novo** | Hosting Candidates | Infrastructure provision | Ukrainian-territory data residency |

---

## 5. Desired Future State

### 5.1 Ideal Process — How Things Should Work

**Future State: Appointment Scheduling**

1. Patient opens MedBridge Connect PWA on mobile or desktop (in Ukrainian or English per preference)
2. Patient authenticates via 2FA (SMS OTP or Diia digital ID)
3. Patient selects specialty, preferred physician (or "any available"), and date range
4. System displays real-time physician availability pulled from Helsi via 2-minute cached middleware, with conflict-locking to prevent double-booking
5. Patient selects a time slot and enters a brief reason for visit (free-text, ≤500 characters)
6. System automatically verifies patient insurance (NHSU declaration status or private/corporate policy) in the background
7. System displays cost estimation: total consultation price, insurance coverage amount, and patient co-pay — before confirmation
8. Patient confirms booking and pays co-pay via LiqPay or monobank in-app
9. Booking confirmation is sent via push notification, SMS, and/or Viber (per patient communication preferences)
10. Automated reminders are sent at configurable intervals (e.g., 48 hours and 2 hours prior)
11. Patient can reschedule or cancel directly from the reminder link
12. Physician receives pre-visit summary including patient reason for visit, current medications, recent lab results, and allergy data — pulled from Helsi EHR

**Future State: Lab Results**

1. Lab partner (Dila or Synevo) delivers results via HL7 FHIR to Helsi EHR
2. System categorises result type (routine vs. sensitive) based on configurable physician rules
3. For routine results (e.g., CBC, lipid panel, thyroid): auto-released to patient portal within 4 hours of physician sign-off; patient receives push notification
4. For sensitive results (e.g., pathology, MRI findings, oncology