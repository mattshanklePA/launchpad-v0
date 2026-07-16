# NIST AI RMF mapping + risk-scoring rubric

**Roadmap #22** (ClickUp 868kcr3u5) — the NIST AI Risk Management Framework governance
layer, LaunchPad's differentiator on top of the finished OMB inventory model. This is the
**design spec** for that layer: docs only, no code. It is the human-review checkpoint for
the epic — everything else the epic builds should implement what's specified here.

**Guardrail this doc follows throughout:** RMF is a **lens** over fields LaunchPad already
collects (the OMB inventory set, aligned to Commerce's real Oct-2025 DoC AI Use Case
Tracker, plus the Department's own risk questions) — not a new intake form. A new field is
proposed only where §7 shows the tracker genuinely has no signal for a function.

## 1. What this doc is (and isn't)

- **Is:** the four RMF functions explained in LaunchPad terms; a field → function mapping
  table; a deterministic per-function status rubric (`covered` / `partial` / `gap` / not yet
  applicable); an overall RMF profile rollup mirroring `lib/riskProfile.ts`'s
  `computeRiskProfile`; an explicit list of any genuinely new fields: [`docs/nist-rmf-mapping.md`](#).
- **Isn't:** a code change. No new `FormData` fields, no new `lib/` module, no UI. A later
  story implements `lib/nistRmfProfile.ts` (or similar) from this spec, mirroring the
  existing determination modules' pure/deterministic style
  (`lib/highImpactDetermination.ts`'s `determineHighImpact`,
  `lib/ombReportability.ts`'s `determineReportability`, `lib/riskProfile.ts`'s
  `computeRiskProfile`).
- **Precedent:** the closest thing in the codebase today is the DoC/EO risk badge
  (`lib/riskProfile.ts`'s `computeRiskProfile`, driven by the four Department risk
  questions) and the OMB determination modules above. RMF reuses the same deterministic,
  no-ML, explainable-rule style — see §6.

## 2. The four NIST AI RMF functions

Source: the public NIST AI Risk Management Framework (NIST AI 100-1, "AI RMF 1.0," Jan
2023) — GOVERN, MAP, MEASURE, MANAGE. In LaunchPad terms, applied to one use-case
submission:

| Function | What NIST means by it | What it means for a LaunchPad use case |
|---|---|---|
| **Govern** | Cross-cutting: policies, accountable roles, risk-tolerance decisions, and culture that the other three functions operate inside. | Is there an accountable review/sign-off chain, an authorization boundary (ATO), and a public-disclosure decision before this system operates on real data? |
| **Map** | Establishes context: what the system is, its intended purpose/benefits, who's affected, what could go wrong — before it's built or tested. | Is the use case classified, scoped, and screened for high-impact effects on rights/safety/benefits/resources/enforcement? |
| **Measure** | Analyzes, tracks, and evaluates the system's risks and trustworthiness with appropriate methods/metrics. | Has it been tested pre-deployment, had its impacts assessed, and been independently reviewed? |
| **Manage** | Allocates resources and acts on identified/measured risks — treatment, monitoring, communication, response. | Is there ongoing monitoring, trained operators, a fail-safe, an appeal path, and public consultation? |

Each function further breaks into NIST's own categories (GOVERN 1-6, MAP 1-5, MEASURE 1-4,
MANAGE 1-4 in AI RMF 1.0) — this doc maps at the function level, which is the level the DoC
tracker's fields actually evidence; a category-level breakdown isn't warranted until/unless
a gap below requires new intake at that granularity.

## 3. Why RMF is a lens, not new intake

The DoC AI Use Case Tracker (Commerce's real Oct-2025 data-call artifact) **is** the OMB
inventory field set LaunchPad already implements (`docs/omb-2025-inventory-fields.md`,
`docs/omb-field-mapping.md`), plus two grouping bands — "For AI use cases that are Pilot and
Deployed" and "Risk management for Deployed or High-Impact" — and a handful of ops fields
(approval status, record status). **It has no native RMF Govern/Map/Measure/Manage column.**
The two grouping bands are themselves derived from fields LaunchPad already has:
`stageOfDevelopment` (pilot/deployed) and `highImpact` (high-impact) — not a separate
"Use Case Category" field.

So the mapping below cites, for each function, which already-implemented `FormData` fields
and determination modules evidence it — reusing `docs/omb-field-mapping.md`'s field names
and OMB `#N` numbering wherever a mapped field is one of the OMB 34.

## 4. Function → field mapping

Status column uses `docs/omb-field-mapping.md`'s legend (**kept** / **renamed** / **added**
/ **stand-in**) plus **new (proposed)** for the handful of genuine gaps in §7.

### GOVERN — accountable review, authorization, disclosure

| Tracker column | LaunchPad `FormData` field / module | Status |
|---|---|---|
| CIO/CAIO Approval Status | `reviewStatus` (`lib/reviewWorkflow.ts`, draft → submitted → in_review → needs_info → approved/rejected) + `bureauSignoff` (`lib/bureauSignoff.ts`'s `BureauSignoff`: decision/signed-off-by/at) + `departmentApproval` (second tier, DoC-only, gated by `tenant.features.departmentFinalApproval`) | stand-in |
| Record status (Active/deleted) | *(none — LaunchPad has no soft-delete)* | stand-in — every submission in the system is implicitly "Active"; LaunchPad has no delete/archive path today, so this column is trivially satisfied rather than gapped. Revisit if soft-delete/archival is ever added. |
| Associated ATO + System Name | `hasATO`, `atoSystemName` (OMB #17-18) | kept (reuses existing OMB mapping) |
| Withhold-from-public | `isWithheld` (OMB #5) | kept (reuses existing OMB mapping) |

### MAP — context, classification, impact screening

| Tracker column | LaunchPad `FormData` field / module | Status |
|---|---|---|
| Use Case Category (tracker grouping band) | `stageOfDevelopment` (OMB #6) + `highImpact` (OMB #7) — the two grouping bands ("Pilot and Deployed" / "Risk management for Deployed or High-Impact") are computed from exactly these two fields | stand-in |
| Use Case Topic Area | `topicArea` (OMB #9) | kept |
| AI Classification | `aiClassification` (OMB #10) | kept |
| Problem / expected benefits / outputs | `coreProblem`, `businessValue`, `solutionSummary` (OMB #11-13) | kept |
| Is-high-impact + justification | `highImpact`, `highImpactJustification` (OMB #7-8) + `lib/highImpactDetermination.ts`'s `determineHighImpact` (advisory recommendation + reasons, reviewer makes the final call) | kept |
| Disseminates info to the public? | `disseminatesToPublic` (Roadmap #22 story 4) | added |
| Scalable? | `scalable` (Roadmap #22 story 4) | added |
| AI data readiness | `trainingDataDescription` (OMB #19) | partial — describes the training/eval data, but isn't a readiness/quality rating; see §7 |
| Base platforms/models | `aiModelSourcing` (Department/EO field: american_built / open_source_us / foreign / unknown) | partial — captures sourcing *category* for EO compliance, not the specific platform/model name; see §7 |

### MEASURE — testing, assessment, review

| Tracker column | LaunchPad `FormData` field / module | Status |
|---|---|---|
| Pre-deployment testing | `preDeploymentTesting` (OMB #26, `hi_testing_conducted`) | kept |
| AI impact assessment (completed?) | `aiImpactAssessmentCompleted` (OMB #27, `hi_assessment_completed`) | kept |
| Potential impacts identified | `aiImpactAssessment` (OMB #28, `hi_potential_impacts`) | kept |
| Independent review | `independentReviewConducted` (OMB #29, `hi_independent_review`) | kept |

### MANAGE — monitoring, training, fail-safe, appeal, consultation

| Tracker column | LaunchPad `FormData` field / module | Status |
|---|---|---|
| Ongoing monitoring process | `ongoingMonitoringPlan` (OMB #30, `hi_ongoing_monitoring`) | kept |
| Operator training | `operatorTrainingEstablished` (OMB #31, `hi_training_established`) | kept |
| Appeal process | `humanOversightAppeal` (OMB #33, `hi_appeal_process`) | kept |
| Fail-safe mechanism | `failSafeMechanism` (OMB #32, `hi_failsafe_presence`) | kept |
| Public consultation steps | `publicConsultationSteps` (OMB #34, `hi_public_consultation`, select-multiple) | kept |
| Embedded-COTS vs. custom code | `customCode` (OMB #24) + `systemSource` (OMB #15, `contracting_usage`) | kept |

All 9 `hi_*` fields backing Measure and most of Manage only exist on a submission once
`highImpact === "high_impact" && stageOfDevelopment === "deployed"` — the same `showWhen`
gate `lib/fieldRegistry.ts` already applies (see `docs/ARCHITECTURE.md` § "OMB federal AI
use case inventory"). §5's status rubric treats that as **not yet applicable**, not a gap —
mirroring the wizard's own conditional-disclosure logic rather than reinventing it.

## 5. Per-function status rubric

Each function resolves to one deterministic status per submission:

```
type RmfFunctionStatus = "covered" | "partial" | "gap" | "not_yet_applicable"
```

- **`covered`** — every field the function maps to (§4) is answered with a substantive,
  affirmative value (not blank, not an "In-progress"/"CAIO waived" placeholder where the
  OMB field permits one).
- **`partial`** — some but not all mapped fields are answered, or an answer is a
  placeholder state (`in_progress`, a CAIO waiver, `needs_info` review status).
- **`gap`** — the function is applicable (see below) and none, or nearly none, of its
  mapped fields are answered.
- **`not_yet_applicable`** — the function's fields aren't shown to the submitter yet under
  the existing `showWhen` gates (§4's note on Measure/Manage), so there is nothing to
  assess — this is expected, not a shortfall, at pre-deployment/pilot stage.

Deterministic rule per function:

- **Govern** — `not_yet_applicable` only if `stageOfDevelopment` is blank (nothing has been
  submitted yet). Otherwise: `covered` if `reviewStatus === "approved"` (with bureau
  sign-off recorded, and department approval recorded when that tenant tier is enabled) AND
  `hasATO` is answered (yes-with-`atoSystemName`, or an explicit no) AND `isWithheld` is
  answered; `gap` if `reviewStatus` is `draft`/`submitted` and both `hasATO` and `isWithheld`
  are still blank; `partial` otherwise.
- **Map** — `not_yet_applicable` if `stageOfDevelopment` is blank or `"retired"` (mirrors
  `topicArea`/`aiClassification`'s own `showWhen`). Otherwise: `covered` if `topicArea`,
  `aiClassification`, `coreProblem`, `businessValue`, `solutionSummary`, and `highImpact`
  are all answered (plus `highImpactJustification` when `highImpact` is
  `presumed_not_high_impact`); `gap` if none of those are answered; `partial` otherwise.
- **Measure** — `not_yet_applicable` unless `highImpact === "high_impact" &&
  stageOfDevelopment === "deployed"`. Once applicable: `covered` if
  `preDeploymentTesting`, `aiImpactAssessmentCompleted`, `aiImpactAssessment`, and
  `independentReviewConducted` are all `"yes"`-equivalent (not in-progress/waived/blank);
  `gap` if all are blank; `partial` otherwise (including any in-progress/waived value).
- **Manage** — same applicability gate as Measure. Once applicable: `covered` if
  `ongoingMonitoringPlan`, `operatorTrainingEstablished`, `failSafeMechanism`,
  `humanOversightAppeal`, and `publicConsultationSteps` are all answered affirmatively, and
  `customCode`/`systemSource` are both answered; `gap` if all are blank; `partial`
  otherwise.

This mirrors `lib/submissionReadiness.ts`'s existing pattern of gating a check on
`isFieldVisible`/`showWhen` before evaluating it, so "not yet applicable" can never be
miscounted as a shortfall — the same reasoning that keeps a pre-deployment submission's
"still needed to submit" list from demanding fields it can't see yet.

## 6. Overall RMF risk-profile rollup

Mirroring `lib/riskProfile.ts`'s `computeRiskProfile` shape and cascade style — deterministic,
one pass, most-severe-wins, with an `unknown` state when there isn't enough to assess yet:

```
type RmfProfile = {
  govern: RmfFunctionStatus
  map: RmfFunctionStatus
  measure: RmfFunctionStatus
  manage: RmfFunctionStatus
  overall: "on_track" | "attention" | "at_risk" | "unknown"
  rationale: string
  flags: string[]   // e.g. "Govern: no ATO on file", "Measure: independent review pending"
}
```

Cascade (evaluate in order, first match wins — same style as `computeRiskProfile`'s
HIGH → MEDIUM → LOW cascade):

1. **`unknown`** — `map` is `not_yet_applicable` (nothing submitted yet, so there's no use
   case to assess governance/measurement/management for).
2. **`at_risk`** — `govern` is `gap`, OR any of `map`/`measure`/`manage` is `gap` while
   applicable. (A high-impact, deployed use case with no monitoring plan and no fail-safe is
   the paradigm case this should catch.)
3. **`attention`** — any function is `partial` (including a `not_yet_applicable` Measure/
   Manage on a use case that is itself already `highImpact === "high_impact"` but still
   pre-deployment — flagged so a reviewer notices RMF's risk-management fields will be due
   once it deploys, not just when it's already overdue).
4. **`on_track`** — every applicable function is `covered`.

This is a **separate signal from `lib/riskProfile.ts`'s existing DoC/EO risk badge**, the
same way OMB's `is_high_impact` determination and the Department's risk questions stay
distinct mandates in `docs/omb-field-mapping.md` — RMF profile answers "how well-governed is
this use case's lifecycle," the EO badge answers "how much inherent risk does its model
sourcing/decisional-impact create." Both can be shown side by side on a submission (detail
view, Decision Center card) without merging into one number, mirroring how the OMB
reportability/high-impact/consolidation results already coexist as separate cards today.

## 7. Optional LLM assist (future, not required)

Every rule above is fully deterministic and requires no model call — consistent with every
existing OMB/DoC determination module (`determineHighImpact`, `determineReportability`,
`determineConsolidation`, `computeRiskProfile`), none of which call an LLM. An optional
enrichment layer could use `getModel()` + `generateObject` (the existing pattern in
`app/actions.ts`, `app/admin/compare-actions.ts`) to turn `RmfProfile.flags` into a short
narrative summary for a reviewer ("this use case is Measure-ready but Manage has no
monitoring plan and no appeal process on file") — purely a presentation layer over the
deterministic result, the same advisory relationship `determineHighImpact`'s recommendation
already has to the reviewer's final call. If added, it must degrade to the deterministic
`flags` list verbatim when the model call fails or is unavailable — no code path may depend
on a model response to compute `RmfFunctionStatus` or `overall`.

## 8. New fields needed

Per the guardrail in §3, a new field is proposed only where the tracker has **no** existing
signal for a function — not for the `partial`/stand-in cases in §4, which already have a
deterministic mapping. Two genuine gaps, both under Map, with no existing `FormData` field:

1. **Disseminates information to the public?** — distinct from `isWithheld` (which governs
   whether the *use case record itself* is withheld from the public inventory), this asks
   whether the AI *system's output* is disseminated to the public as part of its function.
   No existing field captures this. **Added** in Roadmap #22 story 4 as `disseminatesToPublic`
   (`lib/fieldRegistry.ts`, `level: "department"`, shown once a stage is set and the tenant's
   `rmf` feature is on) — captured for the record; not yet folded into `computeRmfProfile`'s
   Map rubric (see note below).
2. **Scalable?** — a forward-looking assessment of whether the use case is intended to scale
   beyond its current deployment. No existing field captures this. **Added** the same way, as
   `scalable`.

Two further tracker fields have a *partial* stand-in today (§4) and remain candidates for a
future dedicated field, not blocking gaps:

3. **AI data readiness** (a readiness/quality rating, distinct from `trainingDataDescription`'s
   free-text description of what data is used).
4. **Base platform/model name** (the specific platform/model, distinct from
   `aiModelSourcing`'s sourcing-category answer).

Fields 3-4 aren't added in this PR — new intake should only be added once a genuine RMF gap
requires it, and neither has a settled shape yet. If a later story adds either, it should
follow `docs/omb-field-mapping.md`'s **added** pattern (`lib/fieldRegistry.ts` entry,
`level: "department"` since these are LaunchPad/RMF-specific, not part of OMB's 34) — the same
pattern fields 1-2 now follow.

**On folding 1-2 into the Map rubric:** story 4 stops at capturing the two fields — `mapStatus`
in `lib/nistRmf.ts` still evaluates only the fields §5 already specifies, so
`disseminatesToPublic`/`scalable` don't yet change a submission's Map status. Wiring them in
would touch the rubric's own tests and the DoC seed fixtures (`lib/seedSubmissionsDoc.ts`) that
assert a `covered` Map today; left as a deliberate follow-up rather than folded in silently.

## See also

- `docs/omb-field-mapping.md` — the field-by-field OMB mapping this doc's tables build on.
- `docs/omb-2025-inventory-fields.md` — the authoritative OMB data dictionary.
- `docs/ARCHITECTURE.md` § "OMB federal AI use case inventory: fields, export, and
  reportability" — how the mapped fields flow through export, consolidation,
  reportability, and high-impact determination.
- `lib/riskProfile.ts` — the DoC/EO risk badge this doc's rollup (§6) mirrors.
- `lib/highImpactDetermination.ts`, `lib/ombReportability.ts` — the deterministic,
  advisory-only determination modules this doc's rubric (§5) follows the style of.
