# Keystone new look (cockpit style): approved mocks

Approved by Matt 14 Nov 2026, 11:42 ET. Source canvas: https://claude.ai/artifact/2T6D3DN79ai6UG9D91EFV1
These supersede the numbered screens 00 to 10 in docs/design. Sample data only.

| File | Screen |
|---|---|
| Main.dc.html | 00 Page kit (K1 to K6) |
| Portfolio-Report.dc.html | 11 Portfolio report, exec home (D1) |
| Action-Center.dc.html | 01 My work |
| Program-View.dc.html | 02 One program |
| Status-By-Office.dc.html | 03 Status by office |
| Drilldown-Dialog.dc.html | 04 Drilldown dialog |
| Decision-Center.dc.html | 10 Decision Center |
| Intake-Step1.dc.html | Submit, step 1 (shared) |
| Intake-Ready-Check.dc.html | Guided step 2 with ready check (D2) |
| Already-Have-This.dc.html | Guided step 3, already have this (D6) |
| Intake-Sent.dc.html | Sent (shared) |
| Form-Step2..5.dc.html, Form-Review.dc.html | Form flow steps 2 to 6 |
| Plumb-Reading.dc.html | Review, Plumb reading |
| Overlap-Profiles.dc.html | Review step 1, overlap with program profiles (D4) |
| Review-Decide.dc.html | Review step, the person decides (D3) |
| Decided-Record.dc.html | Decided record, locked |
| Program-Profile.dc.html | Program profile (D5) |

## New look (cockpit style)

The new look is built from six kit pieces in `components/cockpit/`:

| Piece | Component |
|---|---|
| K1 | `HeaderBand`: dark band with eyebrow, title, tabs, office picker and user line |
| K2 | `SampleDataStrip`: the sample-data notice under the band |
| K3 | `SectionTitle`: title, one context line, amber rule |
| K4 | `MeasurePanel` and `MeasureRow` |
| K5 | `RankedTable`: dense ranked rows that open in place |
| K6 | `SquareTag` and `Track`: square-cornered tags (always with a word) and the planned/actual line |

`CockpitShell` puts K1 and K2 around every signed-in page. `DashboardShell` picks it
instead of the sidebar when the tenant's `features.cockpitLook` is true.

Turn it on for another tenant with one line in its setup file (`lib/tenant/<tenant>.ts`),
inside `features`: `cockpitLook: true`. Add `sampleDataStrip: true` as well if that
tenant should show the sample-data strip (its text is in `lib/tenant/copy.ts`).
Today only ES2 has it on. `components/cockpit/cockpit-look.sweep.test.tsx` checks that
uspto, doc and dow keep the sidebar, and that the kit uses no `shadow-`, no non-Keystone
hex color, and `rounded-full` only on the track dots.
