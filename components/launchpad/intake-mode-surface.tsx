"use client"

import { useEffect, useRef } from "react"
import { IntakeModeToggle } from "@/components/launchpad/intake-mode-toggle"
import { ConversationalIntake } from "@/components/launchpad/conversational-intake"
import { FormContainer } from "@/components/form-container"
import { useIntakeModePreference, type IntakeMode } from "@/hooks/use-intake-mode-preference"

// Hosts both intake experiences behind one toggle (issue #170). Both
// ConversationalIntake and FormContainer read/write the same FormData via
// the shared FormProvider (app/submit/layout.tsx) — swapping which one is
// mounted here is a plain state change, not a navigation, so nothing entered
// so far is ever lost.
//
// `forcedInitialMode` lets a specific entry point (e.g. the dashboard's
// "Talk to <assistant>" link at /submit/conversational) always open in that
// mode regardless of the submitter's last remembered choice, while /submit
// itself falls through to the remembered preference — defaulting to Guided
// for a submitter who has never chosen either (see
// hooks/use-intake-mode-preference.ts).
//
// RD-2 (issue #203) drops the toggle from the Form-mode page: the wizard's
// own header carries a "Prefer a conversation? Guided mode" link to the same
// `setMode`, per the mock. Guided mode has no such in-page link back to Form
// yet, so the toggle stays mounted there — the only way out of it otherwise.
export function IntakeModeSurface({ forcedInitialMode }: { forcedInitialMode?: IntakeMode }) {
  const { mode, setMode } = useIntakeModePreference()
  const appliedForcedMode = useRef(false)

  useEffect(() => {
    if (!forcedInitialMode || appliedForcedMode.current) return
    appliedForcedMode.current = true
    setMode(forcedInitialMode)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forcedInitialMode])

  if (mode === "guided") {
    return (
      <>
        <div className="max-w-[1800px] mx-auto px-4 pt-6 flex justify-end">
          <IntakeModeToggle mode={mode} onChange={setMode} />
        </div>
        <ConversationalIntake />
      </>
    )
  }

  return <FormContainer onSwitchToGuided={() => setMode("guided")} />
}
