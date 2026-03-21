'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface FeedbackItem {
  id: string
  project_id: string
  feedback_type: string
  title: string
  description: string
  severity: string
  status: string
  created_at: string
  screen_url: string | null
  project: { id: string; name: string; client: { name: string } } | null
}

const STATUSES = [
  'submitted', 'reviewed', 'in_progress', 'change_made',
  'approved', 'needs_revision', 'resolved', 'deferred', 'dismissed',
]

const STATUS_COLORS: Record<string, string> = {
  submitted: 'bg-blue-900/50 text-blue-300 border-blue-800',
  reviewed: 'bg-gray-800 text-gray-300 border-gray-700',
  in_progress: 'bg-amber-900/50 text-amber-300 border-amber-800',
  change_made: 'bg-purple-900/50 text-purple-300 border-purple-800',
  approved: 'bg-green-900/50 text-green-300 border-green-800',
  needs_revision: 'bg-orange-900/50 text-orange-300 border-orange-800',
  resolved: 'bg-green-900/50 text-green-300 border-green-800',
  deferred: 'bg-gray-800 text-gray-400 border-gray-700',
  dismissed: 'bg-gray-800 text-gray-500 border-gray-700',
}

const TYPE_COLORS: Record<string, string> = {
  bug: 'text-red-400',
  content: 'text-purple-400',
  ux: 'text-amber-400',
  feature_request: 'text-green-400',
  general: 'text-gray-400',
}

const SEVERITY_COLORS: Record<string, string> = {
  low: 'bg-gray-500',
  normal: 'bg-blue-500',
  high: 'bg-amber-500',
  critical: 'bg-red-500',
}

export default function FeedbackList({ items }: { items: FeedbackItem[] }) {
  const supabase = createClient()
  const [feedbackItems, setFeedbackItems] = useState(items)

  async function updateStatus(id: string, newStatus: string) {
    await supabase.from('feedback').update({ status: newStatus }).eq('id', id)
    if (newStatus === 'dismissed' || newStatus === 'resolved') {
      // Remove from list
      setFeedbackItems(feedbackItems.filter(f => f.id !== id))
    } else {
      setFeedbackItems(feedbackItems.map(f => f.id === id ? { ...f, status: newStatus } : f))
    }
  }

  return (
    <div>
      {/* Header row */}
      <div className="grid grid-cols-[auto_minmax(120px,1fr)_minmax(120px,1.5fr)_120px_80px_75px_100px] gap-2 px-4 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-800">
        <span className="w-2" />
        <span>Title</span>
        <span>Description</span>
        <span>Project</span>
        <span>Type</span>
        <span>Date</span>
        <span>Status</span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-gray-800/50">
        {feedbackItems.map(item => {
          const project = Array.isArray(item.project) ? item.project[0] : item.project
          return (
            <div
              key={item.id}
              className="grid grid-cols-[auto_minmax(120px,1fr)_minmax(120px,1.5fr)_120px_80px_75px_100px] gap-2 px-4 py-2 items-center hover:bg-gray-800/30 transition-colors group text-xs"
            >
              {/* Severity dot */}
              <span className={`w-2 h-2 rounded-full ${SEVERITY_COLORS[item.severity] ?? 'bg-blue-500'}`} />

              {/* Title — clickable to detail */}
              <Link
                href={`/projects/${item.project_id}/feedback/${item.id}?from=dashboard`}
                className="text-white hover:text-blue-400 truncate transition-colors font-medium"
              >
                {item.title}
              </Link>

              {/* Description */}
              <span className="text-gray-500 truncate">{item.description}</span>

              {/* Project */}
              <span className="text-gray-500 truncate">{project?.name ?? '—'}</span>

              {/* Type */}
              <span className={`${TYPE_COLORS[item.feedback_type] ?? 'text-gray-400'} truncate`}>
                {item.feedback_type.replace('_', ' ')}
              </span>

              {/* Date */}
              <span className="text-gray-600">
                {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>

              {/* Status dropdown */}
              <select
                value={item.status}
                onChange={(e) => updateStatus(item.id, e.target.value)}
                className={`text-[10px] font-medium px-1.5 py-0.5 rounded border appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 ${STATUS_COLORS[item.status] ?? STATUS_COLORS.submitted}`}
              >
                {STATUSES.map(s => (
                  <option key={s} value={s} className="bg-gray-900 text-white">
                    {s.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>
          )
        })}
      </div>
    </div>
  )
}
