# OMB 2025 AI Use Case Inventory — authoritative field list

Extracted verbatim from `context/Guidance-on-2025-Agency-Artificial-Intelligence-Reporting-.pdf` (OMB, "Guidance on 2025 Agency Artificial Intelligence Reporting," June 27, 2025), **Section 5 — 2025 AI Use Case Inventory Fields**, cross-checked against `context/OMB AI Inventory Reporting Cheat Sheet - 12-5-25.docx`.

This is the plain-text source for the field-config cascade work (ClickUp 868kam0x3). The CI/loop sandbox can't parse the PDF/DOCX; read this file instead. Field **names and data types are OMB's exact wording** — treat them as the `level: "omb"` mandatory set.

Key context from the guidance:
- Reporting is split into **Consolidated** (widely used commercial AI, reported once department-wide) vs **Individually-Reported** use cases. High-impact use cases are ALWAYS individually reported. (Consolidation logic already lives in `lib/ombConsolidation.ts`; the a–t category list is implemented per issue #29.)
- "Not all AI use cases will be required to respond to every field, as required fields are dependent on the use case's maturity and risk level." So OMB-level fields are *mandatory when applicable* — conditionality is by stage/risk, not by bureau. A bureau can never remove them.
- 2025 deadlines: inventory to OMB **Nov 4, 2025**; public CSV **Dec 2, 2025**; high-impact risk practices **Apr 3, 2026**.

## Base inventory fields — all use cases (23)

Applies to every individually-reported use case (subset required depends on maturity).

| # | Field (OMB exact) | Data type |
|---|---|---|
| 1 | Use Case ID | Structured Text |
| 2 | Use Case Name | Free Text |
| 3 | Agency | Multiple Choice |
| 4 | Bureau/Component | Select all that apply |
| 5 | Email Address | Email |
| 6 | Should this AI use case be withheld from public reporting? | Multiple Choice |
| 7 | Stage of Development | Multiple Choice |
| 8 | Is the AI use case high-impact? | Multiple Choice |
| 9 | Use Case Topic Area | Multiple Choice |
| 10 | AI Classification | Multiple Choice |
| 11 | What problem is the AI intended to solve? | Free Text |
| 12 | What are the expected benefits and positive outcomes from the AI for an agency's mission and/or the general public? | Free Text |
| 13 | Describe the AI system's outputs. | Free Text |
| 14 | Date when AI use case became operational or the pilot's start date | Date |
| 15 | Was the system involved in this use case purchased from a vendor or developed under contract(s) or in-house? Vendor(s) Name, if applicable. | Multiple Choice + Free Text |
| 16 | Does this AI use case have an associated Authorization to Operate (ATO)? System(s) Name, if applicable. | Multiple Choice + Free Text |
| 17 | Describe any data used to train, fine-tune, and/or evaluate performance of the model(s) used in this use case. | Free Text |
| 18 | If the data is required to be publicly disclosed as an open government data asset, provide a link to the entry on the Federal Data Catalog. | Link |
| 19 | Does this AI use case involve personally identifiable information (PII) that is maintained by the agency? | Multiple Choice |
| 20 | If publicly available, provide the link to the AI use case's associated Privacy Impact Assessment (PIA), if any. | Link |
| 21 | Which, if any, demographic variables does the AI use case explicitly use as model features? | Select all that apply |
| 22 | Does this project include custom-developed code? | Multiple Choice |
| 23 | If the code is open source, provide the link for the publicly available source code. | Link |

## High-impact risk-management fields — high-impact + fully deployed only (9)

Required only for fully deployed use cases the agency determines high-impact (M-25-21 §5). Maps to the app's existing high-impact determination (`lib/highImpactDetermination.ts`) — when high-impact fires, these 9 become required.

| # | Field (OMB exact) | Data type |
|---|---|---|
| 24 | Has pre-deployment testing been conducted for this AI use case? | Multiple Choice |
| 25 | Has an AI impact assessment been completed for this AI use case? | Multiple Choice |
| 26 | What are the potential impacts of using the AI for this particular use case and how were they identified? | Free Text |
| 27 | Has an independent review of the AI use case been conducted? | Multiple Choice |
| 28 | Is there a process to conduct ongoing monitoring to identify any adverse impacts to the performance and security of the AI functionality, as well as to privacy, civil rights, and civil liberties? | Multiple Choice |
| 29 | Has the agency established sufficient and periodic training for operators of the AI to interpret and act on its output and manage associated risks? | Multiple Choice |
| 30 | Does this AI use case have an appropriate fail-safe that minimizes the risk of significant harm? | Multiple Choice |
| 31 | Is there an established appeal process in the event that an impacted individual would like to appeal or contest the AI system's outcome? | Multiple Choice |
| 32 | What steps has the agency taken to consult and incorporate feedback from end users of this AI use case and the public? | Select all that apply |

## Mapping notes for the field cascade (868kam0x3)

- **All 32 fields above = `level: "omb"`** in `lib/fieldRegistry.ts`. They are mandatory-when-applicable and non-removable by any bureau. The app's existing always-on / locked fields (model sourcing, sensitive-data/PII, AI-decision) correspond to OMB fields #15, #19, #8/#10 respectively — mark those `locked: true`.
- **Conditionality is by maturity/risk, not by bureau:** the 9 high-impact fields (#24–32) unlock when `is high-impact` is true; several base fields are stage-dependent. Model this as OMB-mandated + conditionally-shown, not as toggleable.
- **Public-reporting handling:** OMB allows removing only the *Use Case ID* column and replacing *Email Address* with a public-inquiry address in the public CSV — relevant to `lib/ombExport.ts`, not to intake toggles.
- **Department (`os`) and bureau tiers** layer on top: DoC (`level: "department"`) may add its own mandatory fields ("~8–10 my boss wanted"); a bureau (`level: "bureau"`) may add its own optional fields — none can remove an OMB or department field.

Source docs: `context/Guidance-on-2025-Agency-Artificial-Intelligence-Reporting-.pdf` (pp. 6–7), `context/OMB AI Inventory Reporting Cheat Sheet - 12-5-25.docx`.
