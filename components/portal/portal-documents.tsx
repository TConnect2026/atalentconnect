import { FileText, ExternalLink } from "lucide-react"
import type { Document } from "@/types"

interface PortalDocumentsProps {
  documents: Document[]
}

const NAVY = "#1F3C62"

const DOC_LABELS: Record<string, string> = {
  position_spec: "Position Spec",
  job_description: "Job Description",
  interview_guide: "Interview Guide",
  finalist_playbook: "Finalist Playbook",
  intake_form: "Intake Form",
  search_agreement: "Search Agreement",
}

const getTitle = (doc: Document) => {
  if (doc.name && doc.name.trim()) return doc.name
  return DOC_LABELS[doc.type] || "Document"
}

export function PortalDocuments({ documents }: PortalDocumentsProps) {
  const visible = documents.filter((d) => d.visible_to_portal)
  if (visible.length === 0) return null

  return (
    <section>
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-navy/60 mb-4">
        Documents
      </h2>

      <div className="flex flex-wrap gap-2">
        {visible.map((doc) => (
          <a
            key={doc.id}
            href={doc.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2 px-3 py-2 rounded-[8px] bg-white text-sm font-medium text-navy hover:bg-navy/5 transition max-w-full"
            style={{ border: `1px solid ${NAVY}` }}
          >
            <FileText className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{getTitle(doc)}</span>
            <ExternalLink className="w-3 h-3 opacity-40 group-hover:opacity-70 flex-shrink-0" />
          </a>
        ))}
      </div>
    </section>
  )
}
