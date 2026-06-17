"use client"

export const dynamic = 'force-dynamic'

// Repointed (step 2a) at the real stages table via StageRoundsEditor. The old
// interview_rounds editor (IntakePanel pageMode="interview_plan") is left intact
// for rollback — revert this file to restore it.
import { StageRoundsEditor } from "@/components/pipeline/stage-rounds-editor"

export default function InterviewStagesPage() {
  return <StageRoundsEditor />
}
