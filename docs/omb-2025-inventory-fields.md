# OMB 2025 AI use case inventory — field list & mapping

Referenced by [issue #61](https://github.com/mattshanklePA/launchpad-v0/issues/61). Tracks which
`FormData` field (`lib/steps.ts`) answers each OMB inventory column, and how that field gets its
value — typed once by the submitter, carried over from something else already captured, or
proposed by Kestrel and confirmed by the submitter. See `docs/ARCHITECTURE.md`'s "OMB federal AI
use case inventory" and "Cutting OMB intake burden" sections for the modules behind this table.

> The authoritative current-year field list/format lives in
> `context/Guidance-on-2025-Agency-Artificial-Intelligence-Reporting-.pdf` and
> `context/OMB AI Inventory Reporting Cheat Sheet - 12-5-25.docx`. Neither could be parsed in this
> environment (no `pdftotext`/`poppler-utils` for the PDF; docx extraction needs shell tooling this
> sandbox didn't have approval to run — same limitation noted in `lib/fieldRegistry.ts`'s
> TODO(issue #57)). This document reflects the field set currently implemented; reconcile against
> the source guidance when it can be read and update both this file and `lib/fieldRegistry.ts`.

| OMB inventory question | `FormData` field | Source | Notes |
|---|---|---|---|
| Agency | *(implicit — active tenant)* | Profile | `getTenant().shortName`; not a per-submission field. |
| Bureau/Component | `submitterOffice` (+ `submitterSubOffice`) | Profile | Prefilled from the session (`lib/ombAutofill.ts`'s `profileAutofill`); editable. |
| Submitter email | `submitterEmail` | Profile | Prefilled from the session; editable. |
| Use Case Name | `useCaseTitle` | Wizard (Step 2) | AI-drafted from problem/solution (`suggestIdeaOverview`), submitter edits. |
| Stage of Development | `stageOfDevelopment` | Manual | No signal exists earlier in the wizard to derive this from. |
| Is the AI use case high-impact? | `highImpact` | AI-proposed | `proposeHighImpact()` wraps `lib/highImpactDetermination.ts`; confirm/override in Step 7. |
| High-impact factors | `highImpactFactors` | Manual (+ inferred) | Submitter checks factors; `allHighImpactFactors()` also infers some from risk answers. |
| AI Classification | `aiClassification` | AI-proposed | `proposeAiClassification()` — rights-impacting / safety-impacting / both / not classified, from the same factor set as `highImpact`. |
| Use Case Topic Area | `useCaseTopicArea` | AI-proposed | `proposeUseCaseTopicArea()` (`lib/useCaseTopicArea.ts`) — keyword match against problem/solution text; blank + flagged when nothing matches. |
| Reporting Mode / Consolidated Category | *(computed, not stored)* | AI-proposed + override | `lib/ombConsolidation.ts`'s `resolveConsolidation()`; reviewer can set `consolidationOverride` to override the automatic call (never overridable to Consolidated for a high-impact use case). |
| What problem is the AI intended to solve? | `coreProblem` | Wizard (Step 3) | Same field the wizard already collects for the problem statement — not re-asked. |
| Describe the AI system's outputs | `solutionSummary` | Wizard (Step 4) | AI-refined summary of `proposedSolution` — not re-asked. |
| Expected benefits | `businessValue` | Wizard (Step 5) | Same field the wizard already collects for business value — not re-asked. |
| Involves PII? | `involvesSensitiveData` | Wizard (Step 7) | Same field the wizard already collects for the PII/sensitive-data risk question — not re-asked. |
| Associated ATO? | `hasATO` | Manual | No earlier signal to derive this from. |
| Built in-house/under contract/purchased | `systemSource` | Manual | Distinct from `aiModelSourcing` (the model's own provenance); no earlier signal. |
| Model sourcing | `aiModelSourcing` | Wizard (Step 7) | Same field the wizard already collects for the Executive Order sourcing question — not re-asked. |
| Mandatory human review | `aiHumanReview` | Wizard (Step 7) | Same field the wizard already collects for the risk-management question — not re-asked. |
| AI decisional impact | `aiDecisionalImpact` | Wizard (Step 7) | Same field the wizard already collects for the risk-management question — not re-asked. |
| Should this be withheld from the public inventory? | `publicIndicator` | AI-proposed | `proposePublicIndicator()` — defaults to public unless PII, a Controlled classification, or an NSS/IC flag is already on the form. |
| National Security System / IC use | `nationalSecuritySystem` | Manual | Feeds `lib/ombReportability.ts`'s exclusion check; no earlier signal. |
| Research-only use | `researchOnly` | Manual | Feeds `lib/ombReportability.ts`'s exclusion check; no earlier signal. |
| AI impact assessment, pre-deployment testing, ongoing monitoring, human oversight/appeal | `aiImpactAssessment`, `preDeploymentTesting`, `ongoingMonitoringPlan`, `humanOversightAppeal` | Manual | M-25-21 minimum-practice fields — only required (and only shown) when `highImpact` is `"yes"`. |

## "Still needed" scoping

`lib/submissionReadiness.ts` treats every row above marked Manual/AI-proposed as required at
submit time (Profile/Wizard rows are already filled by construction), except the four
minimum-practice fields in the last row, which only apply when `highImpact === "yes"`. A disabled
field (admin Form Configuration) or a currently-inapplicable field never appears in "still needed"
— see `getSubmissionReadiness()`'s `need(field, item, test, applicable)` helper.
