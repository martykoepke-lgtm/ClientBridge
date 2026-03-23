'use client'

import { useState, useEffect, use } from 'react'

// Types for scope data
interface ScopeSession {
  id: string
  title: string
  document_version: string
  reviewer_name: string | null
  reviewer_email: string | null
  status: string
  view_token: string
}

interface SectionReview {
  id: string
  section_id: string
  section_title: string | null
  status: 'approve' | 'flag' | 'discuss' | null
  notes: string | null
}

interface Decision {
  id: string
  section_id: string
  question_id: string
  question_text: string | null
  answer: string | null
  finalized: boolean
  finalized_decision: string | null
}

interface Comment {
  id: string
  decision_id: string
  question_id: string
  author_role: 'client' | 'developer'
  author_name: string | null
  content: string
  created_at: string
}

interface ScopeSection {
  id: string
  section_id: string
  section_number: number
  eyebrow: string | null
  title: string
  subtitle: string | null
  time_allocation_minutes: number | null
}

interface ScopeData {
  session: ScopeSession
  content: {
    sections: ScopeSection[]
    userRoles: any[]
    compliance: any[]
    auditEvents: any[]
    competitors: any[]
    techStack: any[]
    costs: any[]
    phases: any[]
    sprints: any[]
    agents: any[]
    curriculum: any[]
    milestones: any[]
    criteria: any[]
    features: any[]
    exercises: any[]
    qaChecks: any[]
    smeChecklist: any[]
  }
  feedback: {
    sectionReviews: SectionReview[]
    decisions: Decision[]
    comments: Comment[]
  }
}

// Section content components
function RoleTable({ roles }: { roles: any[] }) {
  if (!roles.length) return null
  return (
    <table className="w-full border-collapse my-5">
      <thead>
        <tr className="bg-[#0F1F38] text-white text-[13px]">
          <th className="py-3 px-4 text-left font-semibold">Role</th>
          <th className="py-3 px-4 text-left font-semibold">Who</th>
          <th className="py-3 px-4 text-left font-semibold">Access Scope</th>
        </tr>
      </thead>
      <tbody>
        {roles.map((r, i) => (
          <tr key={r.id} className={i % 2 === 0 ? '' : 'bg-[#FAFAF7]'}>
            <td className="py-3 px-4 border-b border-[#E5E3DC] text-[13px] font-semibold">{r.role_label}</td>
            <td className="py-3 px-4 border-b border-[#E5E3DC] text-[13px]">{r.who}</td>
            <td className="py-3 px-4 border-b border-[#E5E3DC] text-[13px]">{r.access_scope}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function ComplianceCards({ items }: { items: any[] }) {
  if (!items.length) return null
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 my-6">
      {items.map(item => (
        <div key={item.id} className="bg-white border border-[#E5E3DC] rounded-2xl p-6">
          <div className="text-sm font-bold text-[#0F1F38] mb-2">{item.regulation}</div>
          {item.applies_when && <div className="text-xs text-[#6B7280] mb-2"><strong>Applies when:</strong> {item.applies_when}</div>}
          <div className="text-[13px] mb-2">{item.what_it_means}</div>
          {item.architecture_notes && (
            <div className="text-xs bg-[#E8F5F3] text-[#1A7A6E] px-3 py-2 rounded-lg mt-2">{item.architecture_notes}</div>
          )}
        </div>
      ))}
    </div>
  )
}

function CostTable({ costs }: { costs: any[] }) {
  if (!costs.length) return null
  return (
    <table className="w-full border-collapse my-5">
      <thead>
        <tr className="bg-[#0F1F38] text-white text-[13px]">
          <th className="py-3 px-4 text-left font-semibold">Service</th>
          <th className="py-3 px-4 text-left font-semibold">Plan</th>
          <th className="py-3 px-4 text-left font-semibold">Cost</th>
          <th className="py-3 px-4 text-left font-semibold">What You Get</th>
          <th className="py-3 px-4 text-left font-semibold">Compliance</th>
        </tr>
      </thead>
      <tbody>
        {costs.map((c, i) => (
          <tr key={c.id} className={i % 2 === 0 ? '' : 'bg-[#FAFAF7]'}>
            <td className="py-3 px-4 border-b border-[#E5E3DC] text-[13px] font-semibold">{c.service_name}</td>
            <td className="py-3 px-4 border-b border-[#E5E3DC] text-[13px]">{c.plan_name}</td>
            <td className="py-3 px-4 border-b border-[#E5E3DC] text-[13px] font-mono font-bold">{c.monthly_cost}</td>
            <td className="py-3 px-4 border-b border-[#E5E3DC] text-[13px]">{c.what_you_get}</td>
            <td className="py-3 px-4 border-b border-[#E5E3DC] text-[13px]">
              {c.compliance_level && (
                <span className="text-xs px-2 py-1 rounded-full bg-[#E8F5F3] text-[#1A7A6E]">{c.compliance_level}</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function PhaseColumns({ phases, sprints }: { phases: any[]; sprints: any[] }) {
  if (!phases.length) return null
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 my-6">
      {phases.map(phase => {
        const phaseSprints = sprints.filter(s => s.phase_id === phase.id)
        return (
          <div key={phase.id} className="bg-white border-2 border-[#E5E3DC] rounded-2xl overflow-hidden">
            <div className="bg-[#0F1F38] text-white p-5">
              <div className="text-[#B8860B] font-mono text-xs uppercase tracking-wider">Phase {phase.phase_number}</div>
              <div className="text-lg font-bold mt-1">{phase.phase_name}</div>
              {phase.tagline && <div className="text-white/60 text-xs mt-1">{phase.tagline}</div>}
              {phase.estimated_hours_min && (
                <div className="text-white/80 text-xs mt-2 font-mono">{phase.estimated_hours_min}–{phase.estimated_hours_max} hrs</div>
              )}
            </div>
            <div className="p-5">
              {phaseSprints.map(s => (
                <div key={s.id} className={`py-3 border-b border-[#E5E3DC] last:border-0 ${s.is_milestone ? 'bg-[#FDF6E3] -mx-5 px-5' : ''}`}>
                  <div className="text-[13px] font-semibold">{s.sprint_title}</div>
                  {s.sprint_description && <div className="text-xs text-[#6B7280] mt-1">{s.sprint_description}</div>}
                  {s.milestone_label && <div className="text-xs text-[#B8860B] font-bold mt-1">{s.milestone_label}</div>}
                </div>
              ))}
            </div>
            {phase.gate_criteria && (
              <div className="border-t-2 border-[#B8860B] bg-[#FDF6E3] p-4">
                <div className="text-xs font-bold text-[#B8860B] mb-1">GATE</div>
                <div className="text-[13px]">{phase.gate_criteria}</div>
                {phase.payment_trigger && <div className="text-[13px] font-bold mt-1">{phase.payment_trigger}</div>}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function AgentCards({ agents }: { agents: any[] }) {
  if (!agents.length) return null
  return (
    <div className="space-y-5 my-6">
      {agents.map(agent => (
        <div key={agent.id} className="bg-white border border-[#E5E3DC] rounded-2xl p-6">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="font-mono text-xs text-[#B8860B] uppercase tracking-wider">Agent {agent.agent_number}</div>
              <div className="text-lg font-bold">{agent.agent_name}</div>
            </div>
            <div className="flex gap-2">
              <span className="text-xs px-2 py-1 rounded-full bg-[#E8F5F3] text-[#1A7A6E]">{agent.agent_location}</span>
              {agent.phase && <span className="text-xs px-2 py-1 rounded-full bg-[#FDF6E3] text-[#B8860B]">{agent.phase}</span>}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[13px]">
            <div>
              <div className="font-semibold text-[#1A7A6E] mb-1">Role</div>
              <div>{agent.role_description}</div>
            </div>
            <div>
              <div className="font-semibold text-[#0F1F38] mb-1">Scope</div>
              <div>{agent.scope_description}</div>
            </div>
            <div>
              <div className="font-semibold text-[#C0392B] mb-1">Boundaries</div>
              <div>{agent.boundaries}</div>
            </div>
          </div>
          {agent.ferpa_notes && (
            <div className="mt-3 text-xs bg-[#FDEDEC] text-[#C0392B] px-3 py-2 rounded-lg">{agent.ferpa_notes}</div>
          )}
        </div>
      ))}
    </div>
  )
}

function MilestoneTable({ milestones, criteria }: { milestones: any[]; criteria: any[] }) {
  if (!milestones.length) return null
  return (
    <div className="space-y-5 my-6">
      {milestones.map(m => {
        const mc = criteria.filter(c => c.milestone_id === m.id)
        return (
          <div key={m.id} className="bg-white border border-[#E5E3DC] rounded-2xl p-6">
            <div className="flex justify-between items-center mb-3">
              <div>
                <div className="text-xs font-mono text-[#B8860B]">Installment {m.installment_number}</div>
                <div className="text-2xl font-bold font-mono">${Number(m.amount).toLocaleString()}</div>
              </div>
              <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                m.status === 'paid' ? 'bg-[#E8F8EE] text-[#1A6B3A]' :
                m.status === 'triggered' ? 'bg-[#FDF6E3] text-[#B8860B]' :
                'bg-gray-100 text-gray-500'
              }`}>{m.status}</span>
            </div>
            <div className="text-[13px] text-[#6B7280] mb-3">{m.trigger_description}</div>
            {m.technical_meaning && <div className="text-[13px] mb-3">{m.technical_meaning}</div>}
            {mc.length > 0 && (
              <div className="border-t border-[#E5E3DC] pt-3 mt-3">
                <div className="text-xs font-bold uppercase tracking-wider text-[#6B7280] mb-2">Acceptance Criteria</div>
                {mc.map(c => (
                  <div key={c.id} className="flex items-start gap-2 py-1 text-[13px]">
                    <span className={`mt-0.5 w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center text-[10px] ${
                      c.passed ? 'bg-[#1A6B3A] border-[#1A6B3A] text-white' : 'border-[#E5E3DC]'
                    }`}>{c.passed ? '✓' : ''}</span>
                    <span>{c.description}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// Decision question with comments and finalization
function DecisionQuestion({
  questionId,
  questionText,
  sectionId,
  decision,
  comments,
  token,
  onUpdate,
}: {
  questionId: string
  questionText: string
  sectionId: string
  decision: Decision | undefined
  comments: Comment[]
  token: string
  onUpdate: () => void
}) {
  const [answer, setAnswer] = useState(decision?.answer || '')
  const [commentText, setCommentText] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [authorRole, setAuthorRole] = useState<'client' | 'developer'>('client')
  const [showComments, setShowComments] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('scope_author_name')
    const savedRole = localStorage.getItem('scope_author_role') as 'client' | 'developer' | null
    if (saved) setAuthorName(saved)
    if (savedRole) setAuthorRole(savedRole)
  }, [])

  useEffect(() => {
    setAnswer(decision?.answer || '')
  }, [decision])

  async function submitAnswer(value: string) {
    setAnswer(value)
    await fetch('/api/scope', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'answer_decision',
        token,
        question_id: questionId,
        section_id: sectionId,
        question_text: questionText,
        answer: value,
      }),
    })
    onUpdate()
  }

  async function addComment() {
    if (!commentText.trim() || !authorName.trim()) return
    setSubmitting(true)
    localStorage.setItem('scope_author_name', authorName)
    localStorage.setItem('scope_author_role', authorRole)
    await fetch('/api/scope', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'add_comment',
        token,
        question_id: questionId,
        decision_id: decision?.id,
        author_role: authorRole,
        author_name: authorName,
        content: commentText,
      }),
    })
    setCommentText('')
    setSubmitting(false)
    onUpdate()
  }

  async function finalizeDecision() {
    if (!decision) return
    await fetch('/api/scope', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'finalize_decision',
        token,
        question_id: questionId,
        finalized_decision: answer,
      }),
    })
    onUpdate()
  }

  const isFinalized = decision?.finalized
  const questionComments = comments.filter(c => c.question_id === questionId)
  const needsCommentArea = answer === 'no' || answer === 'discuss'

  return (
    <div className={`border rounded-xl p-4 mb-3 ${isFinalized ? 'bg-[#E8F8EE] border-[#1A6B3A]' : 'bg-white border-[#E5E3DC]'}`}>
      <div className="text-[13px] font-medium mb-3">{questionText}</div>

      <div className="flex gap-2 mb-3">
        {['yes', 'no', 'discuss'].map(opt => (
          <button
            key={opt}
            onClick={() => !isFinalized && submitAnswer(opt)}
            disabled={!!isFinalized}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              answer === opt
                ? opt === 'yes' ? 'bg-[#1A6B3A] text-white' :
                  opt === 'no' ? 'bg-[#C0392B] text-white' :
                  'bg-[#B8860B] text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            } ${isFinalized ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            {opt.charAt(0).toUpperCase() + opt.slice(1)}
          </button>
        ))}
      </div>

      {/* Comment area for No or Discuss */}
      {needsCommentArea && !isFinalized && (
        <div className="border-t border-[#E5E3DC] pt-3 mt-3">
          <button
            onClick={() => setShowComments(!showComments)}
            className="text-xs text-[#B8860B] font-semibold cursor-pointer mb-2"
          >
            {showComments ? 'Hide comments' : `+ Add Comment${questionComments.length ? ` (${questionComments.length})` : ''}`}
          </button>
        </div>
      )}

      {/* Always show comments if they exist */}
      {(showComments || questionComments.length > 0) && (
        <div className="mt-2 space-y-2">
          {questionComments.map(c => (
            <div key={c.id} className={`text-xs p-3 rounded-lg ${
              c.author_role === 'developer' ? 'bg-blue-50 border border-blue-100' : 'bg-purple-50 border border-purple-100'
            }`}>
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold">{c.author_name || c.author_role}</span>
                <span className="text-[10px] text-gray-400">{new Date(c.created_at).toLocaleDateString()}</span>
              </div>
              <div>{c.content}</div>
            </div>
          ))}

          {!isFinalized && (
            <div className="flex flex-col gap-2 mt-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="Your name"
                  className="flex-1 text-xs border border-[#E5E3DC] rounded-lg px-3 py-2"
                />
                <select
                  value={authorRole}
                  onChange={(e) => setAuthorRole(e.target.value as 'client' | 'developer')}
                  className="text-xs border border-[#E5E3DC] rounded-lg px-3 py-2 bg-white"
                >
                  <option value="client">Client</option>
                  <option value="developer">Developer</option>
                </select>
              </div>
              <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                rows={2}
                className="text-xs border border-[#E5E3DC] rounded-lg px-3 py-2 w-full resize-none"
              />
              <button
                onClick={addComment}
                disabled={submitting || !commentText.trim() || !authorName.trim()}
                className="self-end px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#0F1F38] text-white hover:bg-[#1B3A5C] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? 'Posting...' : 'Post Comment'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Finalize button */}
      {answer && !isFinalized && questionComments.length > 0 && (
        <div className="border-t border-[#E5E3DC] pt-3 mt-3">
          <button
            onClick={finalizeDecision}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#1A6B3A] text-white hover:bg-[#155C30] cursor-pointer"
          >
            Finalize Decision
          </button>
        </div>
      )}

      {isFinalized && (
        <div className="text-xs text-[#1A6B3A] font-semibold mt-2">
          ✓ Finalized: {decision?.finalized_decision}
        </div>
      )}
    </div>
  )
}

// Annotation panel for each section
function AnnotationPanel({
  sectionId,
  sectionTitle,
  review,
  decisions,
  comments,
  token,
  onUpdate,
}: {
  sectionId: string
  sectionTitle: string
  review: SectionReview | undefined
  decisions: Decision[]
  comments: Comment[]
  token: string
  onUpdate: () => void
}) {
  const [status, setStatus] = useState<string>(review?.status || '')
  const [notes, setNotes] = useState(review?.notes || '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setStatus(review?.status || '')
    setNotes(review?.notes || '')
  }, [review])

  async function saveReview(newStatus: string) {
    setStatus(newStatus)
    setSaving(true)
    await fetch('/api/scope', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'review_section',
        token,
        section_id: sectionId,
        section_title: sectionTitle,
        status: newStatus,
        notes,
      }),
    })
    setSaving(false)
    onUpdate()
  }

  async function saveNotes() {
    if (!status) return
    setSaving(true)
    await fetch('/api/scope', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'review_section',
        token,
        section_id: sectionId,
        section_title: sectionTitle,
        status,
        notes,
      }),
    })
    setSaving(false)
  }

  const sectionDecisions = decisions.filter(d => d.section_id === sectionId)

  return (
    <div className="bg-[#FAFAF7] border border-[#E5E3DC] rounded-2xl p-6 mt-6">
      <div className="text-xs font-bold uppercase tracking-wider text-[#6B7280] mb-3">Section Review</div>

      <div className="flex gap-2 mb-4">
        {(['approve', 'flag', 'discuss'] as const).map(opt => (
          <button
            key={opt}
            onClick={() => saveReview(opt)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
              status === opt
                ? opt === 'approve' ? 'bg-[#1A6B3A] text-white' :
                  opt === 'flag' ? 'bg-[#C0392B] text-white' :
                  'bg-[#B8860B] text-white'
                : 'bg-white border border-[#E5E3DC] text-[#6B7280] hover:border-gray-400'
            }`}
          >
            {opt === 'approve' ? 'Approve' : opt === 'flag' ? 'Flag' : 'Discuss'}
          </button>
        ))}
      </div>

      {status && (
        <div className="mb-4">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={saveNotes}
            placeholder="Add notes about this section..."
            rows={3}
            className="w-full text-sm border border-[#E5E3DC] rounded-lg px-4 py-3 resize-none"
          />
          <div className="text-[10px] text-[#6B7280] mt-1">{saving ? 'Saving...' : 'Auto-saves on blur'}</div>
        </div>
      )}

      {sectionDecisions.length > 0 && (
        <div className="border-t border-[#E5E3DC] pt-4 mt-2">
          <div className="text-xs font-bold uppercase tracking-wider text-[#6B7280] mb-3">Decision Questions</div>
          {sectionDecisions.map(d => (
            <DecisionQuestion
              key={d.question_id}
              questionId={d.question_id}
              questionText={d.question_text || ''}
              sectionId={sectionId}
              decision={d}
              comments={comments.filter(c => c.question_id === d.question_id)}
              token={token}
              onUpdate={onUpdate}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Main page
export default function ScopeViewerPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [data, setData] = useState<ScopeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<string>('')

  async function loadData() {
    try {
      const res = await fetch(`/api/scope?token=${token}`)
      if (!res.ok) {
        setError('Scope document not found')
        return
      }
      const json = await res.json()
      setData(json)
      if (!activeSection && json.content.sections.length > 0) {
        setActiveSection(json.content.sections[0].section_id)
      }
    } catch {
      setError('Failed to load scope document')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [token])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-[#0F1F38] mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>Loading...</div>
          <div className="text-sm text-[#6B7280]">Preparing your scope document</div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-[#C0392B] mb-2">Document Not Found</div>
          <div className="text-sm text-[#6B7280]">{error || 'This link may have expired or been removed.'}</div>
        </div>
      </div>
    )
  }

  const { session, content, feedback } = data
  const sections = content.sections
  const currentSection = sections.find(s => s.section_id === activeSection)
  const completedCount = feedback.sectionReviews.filter(r => r.status).length
  const progressPct = sections.length > 0 ? Math.round((completedCount / sections.length) * 100) : 0

  function getReviewForSection(sectionId: string) {
    return feedback.sectionReviews.find(r => r.section_id === sectionId)
  }

  function getStatusDot(sectionId: string) {
    const review = getReviewForSection(sectionId)
    if (!review?.status) return 'bg-transparent border-2 border-[#E5E3DC]'
    if (review.status === 'approve') return 'bg-[#1A6B3A] border-[#1A6B3A]'
    if (review.status === 'flag') return 'bg-[#C0392B] border-[#C0392B]'
    return 'bg-[#B8860B] border-[#B8860B]'
  }

  // Render section content based on section_id
  function renderSectionContent(sectionId: string) {
    switch (sectionId) {
      case 's1': // Product Overview
        return (
          <div>
            {content.competitors.length > 0 && (
              <>
                <h3 className="text-lg font-bold mb-3">Competitive Landscape</h3>
                <table className="w-full border-collapse my-5">
                  <thead>
                    <tr className="bg-[#0F1F38] text-white text-[13px]">
                      <th className="py-3 px-4 text-left font-semibold">Competitor</th>
                      <th className="py-3 px-4 text-left font-semibold">What They Do</th>
                      <th className="py-3 px-4 text-left font-semibold">Our Advantage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {content.competitors.map((c, i) => (
                      <tr key={c.id} className={i % 2 === 0 ? '' : 'bg-[#FAFAF7]'}>
                        <td className="py-3 px-4 border-b border-[#E5E3DC] text-[13px] font-semibold">{c.competitor_name}</td>
                        <td className="py-3 px-4 border-b border-[#E5E3DC] text-[13px]">{c.what_they_do}</td>
                        <td className="py-3 px-4 border-b border-[#E5E3DC] text-[13px]">{c.our_advantage}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
            {content.curriculum.length > 0 && (
              <>
                <h3 className="text-lg font-bold mt-8 mb-3">Curriculum Breakdown</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {content.curriculum.map(c => (
                    <div key={c.id} className="bg-white border border-[#E5E3DC] rounded-xl p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-mono text-xs text-[#B8860B]">{c.domain_code}</div>
                          <div className="font-semibold text-sm">{c.domain_name}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold font-mono">{c.module_count}</div>
                          <div className="text-[10px] text-[#6B7280]">modules</div>
                        </div>
                      </div>
                      {c.board_weight_percent && (
                        <div className="mt-2 text-xs text-[#6B7280]">Board weight: {c.board_weight_percent}%</div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )

      case 's2': // User Types & Compliance
        return (
          <div>
            <RoleTable roles={content.userRoles} />
            <h3 className="text-lg font-bold mt-8 mb-3">Compliance Requirements</h3>
            <ComplianceCards items={content.compliance} />
            {content.auditEvents.length > 0 && (
              <>
                <h3 className="text-lg font-bold mt-8 mb-3">FERPA Audit Trail</h3>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[#0F1F38] text-white text-[13px]">
                      <th className="py-3 px-4 text-left font-semibold">#</th>
                      <th className="py-3 px-4 text-left font-semibold">Event</th>
                      <th className="py-3 px-4 text-left font-semibold">What We Log</th>
                      <th className="py-3 px-4 text-left font-semibold">What We Don&apos;t</th>
                    </tr>
                  </thead>
                  <tbody>
                    {content.auditEvents.map((e, i) => (
                      <tr key={e.id} className={i % 2 === 0 ? '' : 'bg-[#FAFAF7]'}>
                        <td className="py-3 px-4 border-b border-[#E5E3DC] text-[13px] font-mono">{e.event_number}</td>
                        <td className="py-3 px-4 border-b border-[#E5E3DC] text-[13px] font-semibold">{e.event_name}</td>
                        <td className="py-3 px-4 border-b border-[#E5E3DC] text-[13px]">{e.what_we_log}</td>
                        <td className="py-3 px-4 border-b border-[#E5E3DC] text-[13px] text-[#C0392B]">{e.what_we_dont_log}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        )

      case 's3': // AI Content Pipeline
      case 's4': // SME Review
        return (
          <div>
            {content.qaChecks.length > 0 && (
              <>
                <h3 className="text-lg font-bold mb-3">Automated QA Checks</h3>
                {content.qaChecks.map(q => (
                  <div key={q.id} className="flex items-start gap-3 py-3 border-b border-[#E5E3DC]">
                    <span className="font-mono text-xs text-[#B8860B] mt-0.5">{q.check_number}</span>
                    <div>
                      <div className="text-[13px] font-semibold">{q.check_name}</div>
                      <div className="text-xs text-[#6B7280]">{q.rule_description}</div>
                      <div className="text-xs text-[#C0392B] mt-1">On failure: {q.on_failure}</div>
                    </div>
                  </div>
                ))}
              </>
            )}
            {content.smeChecklist.length > 0 && (
              <>
                <h3 className="text-lg font-bold mt-8 mb-3">SME Review Checklist</h3>
                {content.smeChecklist.map(item => (
                  <div key={item.id} className="flex items-center gap-3 py-2">
                    <span className="w-5 h-5 rounded border border-[#E5E3DC] flex-shrink-0" />
                    <span className="text-[13px]">{item.criterion}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        )

      case 's5': // Student Experience
        return (
          <div>
            {content.exercises.length > 0 && (
              <>
                <h3 className="text-lg font-bold mb-3">Interactive Exercise Formats</h3>
                <table className="w-full border-collapse my-5">
                  <thead>
                    <tr className="bg-[#0F1F38] text-white text-[13px]">
                      <th className="py-3 px-4 text-left font-semibold">Format</th>
                      <th className="py-3 px-4 text-left font-semibold">Description</th>
                      <th className="py-3 px-4 text-left font-semibold">Phase</th>
                    </tr>
                  </thead>
                  <tbody>
                    {content.exercises.map((e, i) => (
                      <tr key={e.id} className={i % 2 === 0 ? '' : 'bg-[#FAFAF7]'}>
                        <td className="py-3 px-4 border-b border-[#E5E3DC] text-[13px] font-semibold">{e.format_name}</td>
                        <td className="py-3 px-4 border-b border-[#E5E3DC] text-[13px]">{e.description}</td>
                        <td className="py-3 px-4 border-b border-[#E5E3DC]">
                          <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                            e.phase === 'MVP' ? 'bg-[#E8F8EE] text-[#1A6B3A]' : 'bg-gray-100 text-gray-500'
                          }`}>{e.phase}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        )

      case 's6': // AI Agents
        return <AgentCards agents={content.agents} />

      case 's7': // Tech Stack & Costs
        return (
          <div>
            {content.techStack.length > 0 && (
              <>
                <h3 className="text-lg font-bold mb-3">Technology Stack</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  {content.techStack.map(t => (
                    <div key={t.id} className="bg-white border border-[#E5E3DC] rounded-xl p-4">
                      <div className="text-xs text-[#6B7280] uppercase tracking-wider">{t.layer}</div>
                      <div className="font-semibold mt-1">{t.tool_name}</div>
                      <div className="text-[13px] text-[#6B7280] mt-1">{t.role_description}</div>
                      {t.rationale && <div className="text-xs text-[#1A7A6E] mt-2">{t.rationale}</div>}
                    </div>
                  ))}
                </div>
              </>
            )}
            <h3 className="text-lg font-bold mb-3">Infrastructure Costs</h3>
            <CostTable costs={content.costs} />
          </div>
        )

      case 's8': // Build Phases
        return <PhaseColumns phases={content.phases} sprints={content.sprints} />

      case 's9': // Payments & Milestones
        return <MilestoneTable milestones={content.milestones} criteria={content.criteria} />

      case 's10': // MVP Definition
        return (
          <div>
            {content.features.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {['MVP', 'Full product'].map(phase => {
                  const items = content.features.filter(f => f.phase === phase || f.phase === phase.toLowerCase().replace(' ', '_'))
                  if (!items.length) return null
                  return (
                    <div key={phase} className="bg-white border border-[#E5E3DC] rounded-2xl p-6">
                      <div className="text-sm font-bold mb-3">{phase}</div>
                      {items.map(f => (
                        <div key={f.id} className="flex items-center gap-2 py-1.5 text-[13px]">
                          <span className={`w-3 h-3 rounded-full flex-shrink-0 ${f.included ? 'bg-[#1A6B3A]' : 'bg-[#E5E3DC]'}`} />
                          <span>{f.feature_name}</span>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )

      default:
        return <div className="text-sm text-[#6B7280]">Content for this section will be populated from the database.</div>
    }
  }

  return (
    <>
      {/* Google Fonts */}
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      <div className="min-h-screen bg-[#FAFAF7]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        {/* TOPBAR */}
        <div className="fixed top-0 left-0 right-0 h-16 bg-[#0F1F38] flex items-center px-6 z-50 gap-5">
          <div className="text-white text-xl font-bold tracking-widest" style={{ fontFamily: "'Playfair Display', serif" }}>
            <span className="text-[#B8860B]">Æ</span>SCULA
          </div>
          <div className="text-white/60 text-xs ml-auto text-right leading-tight">
            <strong className="text-white/90">{session.title}</strong><br />
            {session.document_version}
          </div>
          <div className="w-48 h-1.5 bg-white/15 rounded-full overflow-hidden ml-4">
            <div className="h-full bg-[#B8860B] rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
          </div>
          <div className="text-white/60 text-xs font-mono">{completedCount}/{sections.length}</div>
        </div>

        {/* SIDEBAR */}
        <div className="fixed top-16 left-0 bottom-0 w-[280px] bg-white border-r border-[#E5E3DC] overflow-y-auto z-40 py-5">
          <div className="text-[11px] font-bold uppercase tracking-widest text-[#6B7280] px-5 py-2">Sections</div>
          {sections.map(s => (
            <button
              key={s.section_id}
              onClick={() => setActiveSection(s.section_id)}
              className={`w-full flex items-center gap-3 px-5 py-3 text-left text-sm border-l-[3px] transition-colors ${
                activeSection === s.section_id
                  ? 'bg-[#FDF6E3] border-l-[#B8860B] font-semibold'
                  : 'border-l-transparent hover:bg-[#FAFAF7] hover:border-l-[#B8860B]'
              }`}
            >
              <span className="font-mono text-xs text-[#6B7280] min-w-[28px]">{String(s.section_number).padStart(2, '0')}</span>
              <span className="flex-1 truncate">{s.title}</span>
              <span className={`w-[10px] h-[10px] rounded-full flex-shrink-0 ${getStatusDot(s.section_id)}`} />
            </button>
          ))}
        </div>

        {/* MAIN CONTENT */}
        <div className="ml-[280px] mt-16 px-12 py-10 max-w-[1100px]">
          {currentSection && (
            <div>
              <div className="font-mono text-xs text-[#B8860B] uppercase tracking-widest mb-2">
                {currentSection.eyebrow || `Section ${String(currentSection.section_number).padStart(2, '0')}`}
                {currentSection.time_allocation_minutes && ` · ${currentSection.time_allocation_minutes} minutes`}
              </div>
              <h1 className="text-[32px] font-bold leading-tight mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                {currentSection.title}
              </h1>
              {currentSection.subtitle && (
                <p className="text-base text-[#6B7280] mb-8">{currentSection.subtitle}</p>
              )}
              <div className="h-0.5 bg-[#B8860B] w-[60px] mb-8" />

              {/* Section-specific content */}
              {renderSectionContent(activeSection)}

              {/* Annotation panel */}
              <AnnotationPanel
                sectionId={activeSection}
                sectionTitle={currentSection.title}
                review={getReviewForSection(activeSection)}
                decisions={feedback.decisions}
                comments={feedback.comments}
                token={token}
                onUpdate={loadData}
              />
            </div>
          )}

          {sections.length === 0 && (
            <div className="text-center py-20">
              <div className="text-2xl font-bold text-[#0F1F38] mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                No content yet
              </div>
              <div className="text-sm text-[#6B7280]">Sections will appear here once the scope document is populated.</div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
