# LaunchPad → OMB field mapping

**Roadmap #04, story 6** (ClickUp 868k6cj3r). One place that shows, for OMB's 2025 AI use case inventory data dictionary, what each of the 34 fields maps to in LaunchPad's `FormData` (`lib/steps.ts`) and how it got there — kept as-is, renamed from an earlier LaunchPad field, added specifically for OMB, or filled by a stand-in field that predates the OMB alignment work.

This doc is the consolidated view; it doesn't replace the sources it draws from:

- **`docs/omb-2025-inventory-fields.md`** — the authoritative field list (OMB's own data dictionary: names, types, valid selections, `showWhen` conditions).
- **`lib/ombExport.ts`** — the public-inventory CSV column order and value formatting.
- **`lib/ombAutofill.ts`** — which fields are AI-proposed vs. reused vs. a genuine judgment call.
- **`lib/fieldRegistry.ts`** — the field-authority cascade (`level: "omb" | "department" | "bureau"`), `#N` row-number comments.

## Status legend

| Status | Meaning |
|---|---|
| **kept** | A LaunchPad field that already existed for the wizard's own purposes (vetting the idea, not OMB reporting) is reused as-is — no rename, no new registry entry. |
| **renamed** | An earlier LaunchPad field/shape was replaced so its values line up exactly with OMB's, either at introduction or via a later migration. |
| **added** | A field created specifically to capture this OMB column, registered in `lib/fieldRegistry.ts` with `level: "omb"`, `omb: true`. |
| **stand-in** | A pre-existing LaunchPad field (or export-time constant) supplies the column's *meaning* without being a dedicated OMB registry entry — noted as such in `lib/fieldRegistry.ts`'s header comment rather than re-declared. |

## The 34 OMB fields

| # | OMB column | OMB label | LaunchPad `FormData` field | Status | Notes |
|---|---|---|---|---|---|
| 1 | `id` | Use Case ID | *(none — Supabase submission id)* | stand-in | Internal id only; OMB permits omitting it from the public inventory, and `lib/ombExport.ts`'s `OMB_COLUMNS` never emits it. |
| 2 | `use_case_name` | Use Case Name | `useCaseTitle` | stand-in | Pre-existing "Idea Title" field (`locked: true` — the AI assessment and Decision Center key off it); not a dedicated OMB registry entry. |
| 3 | `agency_bureau` | Bureau/Component | `submitterOffice` | stand-in | Pre-existing Step 1 "Business Unit" field. |
| 4 | `contact_email` | Email Address | `submitterEmail` (internal) / `agency.publicInquiryEmail` (public export) | stand-in | The public CSV substitutes the tenant's public-inquiry inbox for the real submitter address — see redaction note below. |
| 5 | `is_withheld` | Should this AI use case be withheld from public reporting? | `isWithheld` | renamed | Replaced the earlier two-way `publicIndicator` flag ([issue #116](https://github.com/mattshanklePA/launchpad-v0/issues/116)) with OMB's exact four-way value set (`no` / `yes_risk_to_disclosure` / `yes_disclosure_prohibited` / `other`). Legacy data migrates at read time (`lib/formDataMigrations.ts`). |
| 6 | `development_stage` | Stage of Development | `stageOfDevelopment` | added | |
| 7 | `is_high_impact` | Is the AI use case high-impact? | `highImpact` | added | OMB's real three-way choice, not Yes/No — corrected from an earlier binary modeling pass. |
| 8 | `HI_justification` | Justification | `highImpactJustification` | added | `showWhen`: `highImpact === "presumed_not_high_impact"`. |
| 9 | `topic_area` | Use Case Topic Area | `topicArea` | added | Added in the reconciliation pass ([issue #63](https://github.com/mattshanklePA/launchpad-v0/issues/63)) — the original pass omitted the real option list. |
| 10 | `classification` | AI Classification | `aiClassification` | added | Same reconciliation pass as `topicArea` (issue #63). |
| 11 | `problem_solved` | What problem is the AI intended to solve? | `coreProblem` | kept | Pre-existing Step 2/3 field, unchanged; `lib/ombExport.ts` maps it directly rather than re-asking the question. |
| 12 | `benefits` | Expected benefits and positive outcomes | `businessValue` | kept | Pre-existing Value step field. |
| 13 | `system_outputs` | Describe the AI system's outputs | `solutionSummary` | kept | Pre-existing Solution step field. |
| 14 | `operational_date` | Date operational / pilot start date | `operationalDate` | added | `showWhen`: pilot or deployed. |
| 15 | `contracting_usage` | Purchased / contract / in-house? | `systemSource` | added | OMB's field is 3-way including "both contracting and in-house"; LaunchPad's `contract` value (no separate "both" option) maps to that bucket — see `CONTRACTING_USAGE_LABELS` in `lib/ombExport.ts`. |
| 16 | `vendor_name` | Vendor(s) Name | `systemSourceVendorName` | added | `showWhen`: `systemSource` is `contract`/`vendor`, and pilot/deployed. |
| 17 | `have_ato` | Associated ATO? | `hasATO` | added | OMB is strictly Yes/No; LaunchPad's extra `in_progress` state reports as "No" until granted (`ATO_LABELS` in `lib/ombExport.ts`). |
| 18 | `system_name_ato` | System(s) Name | `atoSystemName` | added | `showWhen`: `hasATO === "yes"`, and pilot/deployed. |
| 19 | `data_description` | Describe data used to train/fine-tune/evaluate | `trainingDataDescription` | added | |
| 20 | `link_to_data` | Link to Federal Data Catalog entry | `federalDataCatalogLink` | added | Optional — never required. |
| 21 | `has_pii` | Involves PII maintained by the agency? | `hasPii` | added | Distinct federal mandate from the Department's `involvesSensitiveData` — see "Risk questions" below for the overlap. |
| 22 | `pia_url` | Link to associated PIA | `piaLink` | added | Optional — never required. |
| 23 | `demographic_features` | Which demographic variables are used as model features? | `demographicFeatures` | added | Select-multiple. |
| 24 | `has_custom_code` | Includes custom-developed code? | `customCode` | added | |
| 25 | `code_url` | Link to publicly available source code | `openSourceCodeLink` | added | `showWhen`: `customCode === "yes"`. Optional — never required. |
| 26 | `hi_testing_conducted` | Pre-deployment testing conducted? | `preDeploymentTesting` | added | High-impact + deployed only (`showWhen: highImpactAndDeployed`, all of #26-34). |
| 27 | `hi_assessment_completed` | AI impact assessment completed? | `aiImpactAssessmentCompleted` | added | |
| 28 | `hi_potential_impacts` | Potential impacts and how they were identified | `aiImpactAssessment` | added | |
| 29 | `hi_independent_review` | Independent review conducted? | `independentReviewConducted` | added | |
| 30 | `hi_ongoing_monitoring` | Ongoing monitoring process established? | `ongoingMonitoringPlan` | added | |
| 31 | `hi_training_established` | Sufficient, periodic operator training established? | `operatorTrainingEstablished` | added | |
| 32 | `hi_failsafe_presence` | Appropriate fail-safe present? | `failSafeMechanism` | added | |
| 33 | `hi_appeal_process` | Established appeal process? | `humanOversightAppeal` | added | |
| 34 | `hi_public_consultation` | Steps taken to consult end users and the public | `publicConsultationSteps` | added | Select-multiple. |

Every field marked **added** is registered in `lib/fieldRegistry.ts` with `level: "omb"`, `omb: true` — mandatory-when-applicable and non-removable on a bureau-tier tenant (`tenantHasBureauTier()`), but not hard-`locked` (the registry is shared across tenants; USPTO/DoW enforce nothing extra). Fields #1-5 (**stand-in**/**renamed**) are deliberately *not* re-declared as separate `omb: true` registry entries — they already exist elsewhere in the wizard under different names.

### Non-OMB columns in the export

`lib/ombExport.ts`'s `OMB_COLUMNS` also carries three columns that are not part of OMB's 34-field data dictionary: **Agency** (never a form field — read from `getTenant().shortName` at export time) and **Reporting Mode** / **Consolidated Category** (from `lib/ombConsolidation.ts`'s `determineConsolidation()`). They predate this mapping doc as LaunchPad-added export context, not OMB fields.

### Public-inventory redaction

Because `lib/ombExport.ts` builds the *public* inventory, three of OMB's own public-reporting rules apply unconditionally, not just to withheld rows:

- `id` (#1) is never a column.
- `contact_email` (#4) is always `agency.publicInquiryEmail`, never a real submitter's address.
- Any submission whose `isWithheld` (#5) answer isn't `"no"` is excluded from the CSV entirely (`isPubliclyReportable()`), before consolidation grouping.

## LaunchPad risk questions (not part of the OMB 34)

`involvesSensitiveData`, `aiDecisionalImpact`, `aiModelSourcing`, and `aiHumanReview` are a distinct Department of Commerce / Executive Order mandate (`level: "department"`, `locked: true` in `lib/fieldRegistry.ts`) — they are **not** among OMB's 34 data-dictionary fields and are intentionally absent from `lib/ombExport.ts`'s `OMB_COLUMNS`.

| Field | Purpose | Relation to the OMB 34 |
|---|---|---|
| `involvesSensitiveData` | PII / sensitive data use (DoC mandate) | Overlaps `hasPii` (#21) in subject — see below. |
| `aiDecisionalImpact` | Does the AI output drive a decision affecting an applicant or employee? | Not an OMB column; feeds `lib/highImpactDetermination.ts`'s inference layer, which recommends OMB's `is_high_impact` (#7) "rights" category when this is `"yes"`. |
| `aiModelSourcing` | American-built / open-source U.S.-hosted / foreign / unknown (EO compliance) | Not an OMB column; no OMB counterpart. |
| `aiHumanReview` | Is human review mandatory before the AI output drives action? | Not an OMB column; conceptually adjacent to the high-impact fail-safe/appeal fields (#32-33) but not reused by them. |

### The `has_pii` / `involvesSensitiveData` overlap

`hasPii` (OMB #21) and `involvesSensitiveData` (DoC) ask essentially the same underlying question — does this use case touch PII/sensitive data — but they are **separate mandates** and both are kept as distinct `FormData` fields; neither is dropped or merged.

To avoid asking the same question twice, `lib/ombAutofill.ts`'s `proposeHasPii()` reuses the submitter's `involvesSensitiveData` answer as an AI-proposed (submitter-confirmed) value for `hasPii`, rather than re-deriving it independently:

```
involvesSensitiveData (DoC mandate, answered on Step 6)
        │
        │  proposeHasPii() — reuse, not re-derivation
        ▼
hasPii (OMB #21, autofilled + shown with a rationale, still overridable)
```

`proposeHasPii()` returns `null` (no proposal) until `involvesSensitiveData` has actually been answered — it never fabricates a value.

## See also

- `docs/omb-2025-inventory-fields.md` — the authoritative OMB data dictionary this table is reconciled against.
- `docs/ARCHITECTURE.md` § "OMB federal AI use case inventory: fields, export, and reportability" — how these fields flow through export, consolidation, reportability, and high-impact determination.
