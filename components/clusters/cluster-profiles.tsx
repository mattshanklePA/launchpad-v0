"use client"

// F8-2 (#354): "Could they share one solution?" on the overlap group (ES2 only,
// behind `features.programProfiles`). Reads the F8-1 comparison; adds no data.
// Every word comes from the tenant copy. Nothing renders where the setting is
// off or missing.

import { SectionTitle } from "@/components/cockpit"
import { getTenant } from "@/lib/tenant"
import { tenantCopy } from "@/lib/tenant/copy"
import type { TenantConfig } from "@/lib/tenant/types"
import type { Submission } from "@/lib/submissions"
import { compareProfiles, type ProfileColumn, type ProfileRowKey } from "@/lib/programProfiles"

const TH =
  "border-b border-[var(--ks-limestone-dark)] bg-white px-3 py-2.5 text-left align-bottom font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--ks-ink-700)]"
const TD = "border-b border-[var(--ks-limestone)] px-3 py-3 align-top text-[14px] text-[var(--ks-ink-900)]"

/** "Business Technology Solutions (BTS)" reads "BTS"; a label with no short form stays whole. */
function shortName(label: string): string {
  return label.match(/\(([^()]+)\)\s*$/)?.[1] ?? label
}

function headerFor(c: ProfileColumn, thisOne: boolean, thisOneLabel: string): string {
  const parts = [shortName(c.officeLabel)]
  if (c.programLabel) parts.push(shortName(c.programLabel))
  if (thisOne) parts.push(thisOneLabel)
  return parts.join(" · ")
}

export function ClusterProfiles({
  members,
  currentSubmissionId,
  tenant = getTenant(),
}: {
  members: Submission[]
  /** The idea the screen was opened from; its column goes first and is marked. Omit on the group page. */
  currentSubmissionId?: string
  tenant?: TenantConfig
}) {
  if (!tenant.features.programProfiles) return null
  const copy = tenantCopy(tenant)

  const current = members.find((m) => m.id === currentSubmissionId)
  const ordered = current ? [current, ...members.filter((m) => m !== current)] : members
  const { columns, rows } = compareProfiles(ordered, tenant)
  const firstOffice = columns[0] ? shortName(columns[0].officeLabel) : ""

  const labels: Record<ProfileRowKey, string> = {
    runsOn: copy.profileRowRuns,
    builtOn: copy.profileRowBuilt,
    mainData: copy.profileRowData,
    owner: copy.profileRowOwner,
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <SectionTitle title={copy.profileTitle} context={copy.profileContext} />
      <div
        data-profile-scroll=""
        role="region"
        aria-label={copy.profileTitle}
        tabIndex={0}
        className="max-w-full overflow-x-auto border border-[var(--ks-limestone-dark)] bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ks-active-blue)]"
      >
        <table className="w-full min-w-[820px] border-collapse">
          <thead>
            <tr>
              <td className={TH} />
              {columns.map((c, i) => (
                <th key={c.submissionId} scope="col" className={TH}>
                  {headerFor(c, !!current && i === 0, copy.profileThisOne)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <tr key={row.key}>
                <th scope="row" className={`${TH} align-top whitespace-nowrap`}>
                  {labels[row.key]}
                </th>
                {columns.map((c, i) => {
                  const note = row.notes[i]
                  if (!c.profile) {
                    return (
                      <td key={c.submissionId} className={TD}>
                        {r === 0 ? <span className="text-[12px] text-[var(--ks-ink-700)]">{copy.profileNone}</span> : "–"}
                      </td>
                    )
                  }
                  return (
                    <td key={c.submissionId} className={TD}>
                      {c.profile[row.key]}
                      {note ? (
                        <span className="mt-0.5 block text-[12px] text-[var(--ks-ink-700)]">
                          {note === "same" ? copy.profileSame.replace("{office}", firstOffice) : copy.profileDifferent}
                        </span>
                      ) : null}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
