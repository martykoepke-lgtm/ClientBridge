'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { DocumentLink } from '@/lib/types'

const DOCUMENT_TYPES: { value: DocumentLink['document_type']; label: string }[] = [
  { value: 'document', label: 'Document' },
  { value: 'design', label: 'Design' },
  { value: 'spec', label: 'Spec / Requirements' },
  { value: 'spreadsheet', label: 'Spreadsheet' },
  { value: 'presentation', label: 'Presentation' },
  { value: 'video', label: 'Video' },
  { value: 'other', label: 'Other' },
]

const TYPE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  design: { bg: 'bg-pink-900/30', text: 'text-pink-400', label: 'Design' },
  spec: { bg: 'bg-cyan-900/30', text: 'text-cyan-400', label: 'Spec' },
  spreadsheet: { bg: 'bg-green-900/30', text: 'text-green-400', label: 'Sheet' },
  document: { bg: 'bg-blue-900/30', text: 'text-blue-400', label: 'Doc' },
  presentation: { bg: 'bg-orange-900/30', text: 'text-orange-400', label: 'Slides' },
  video: { bg: 'bg-purple-900/30', text: 'text-purple-400', label: 'Video' },
  other: { bg: 'bg-gray-800', text: 'text-gray-400', label: 'Link' },
}

interface DocumentLinksSectionProps {
  projectId: string
  links: DocumentLink[]
  onLinksChange: (links: DocumentLink[]) => void
  canEdit: boolean
  role: 'developer' | 'client'
}

export default function DocumentLinksSection({ projectId, links, onLinksChange, canEdit, role }: DocumentLinksSectionProps) {
  const supabase = createClient()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [docType, setDocType] = useState<DocumentLink['document_type']>('document')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function resetForm() {
    setName('')
    setUrl('')
    setDocType('document')
    setShowForm(false)
    setEditingId(null)
  }

  function startEdit(link: DocumentLink) {
    setName(link.name)
    setUrl(link.url)
    setDocType(link.document_type)
    setEditingId(link.id)
    setShowForm(true)
  }

  async function handleSave() {
    if (!name.trim() || !url.trim()) return
    setSaving(true)
    setError(null)

    try {
      if (editingId) {
        // Update
        const { data, error: updateErr } = await supabase
          .from('project_document_links')
          .update({ name: name.trim(), url: url.trim(), document_type: docType, updated_at: new Date().toISOString() })
          .eq('id', editingId)
          .select('*')
          .single()

        if (updateErr) { setError(updateErr.message); setSaving(false); return }
        onLinksChange(links.map(l => l.id === editingId ? data : l))
      } else {
        // Insert
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setError('Not authenticated'); setSaving(false); return }

        const { data, error: insertErr } = await supabase
          .from('project_document_links')
          .insert({
            project_id: projectId,
            created_by_user_id: user.id,
            created_by_role: role,
            name: name.trim(),
            url: url.trim(),
            document_type: docType,
          })
          .select('*')
          .single()

        if (insertErr) { setError(insertErr.message); setSaving(false); return }
        onLinksChange([data, ...links])
      }

      resetForm()
    } catch {
      setError('Failed to save link')
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    setError(null)
    const { error: deleteErr } = await supabase
      .from('project_document_links')
      .delete()
      .eq('id', id)

    if (deleteErr) { setError(deleteErr.message); return }
    onLinksChange(links.filter(l => l.id !== id))
  }

  const typeStyle = (type: string) => TYPE_STYLES[type] || TYPE_STYLES.other

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Document Links</h3>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">{links.length} link{links.length !== 1 ? 's' : ''}</span>
          {canEdit && !showForm && (
            <button
              onClick={() => { resetForm(); setShowForm(true) }}
              className="px-3 py-1.5 text-xs font-medium bg-amber-500 hover:bg-amber-400 text-black rounded-lg transition-colors"
            >
              + Add Document
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-800 text-red-300 px-4 py-2 rounded-lg text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-400 hover:text-red-300">dismiss</button>
        </div>
      )}

      {/* Add / Edit form */}
      {showForm && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Name <span className="text-red-400">*</span></label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Brand Guidelines, Wireframes"
              className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Document Type</label>
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as DocumentLink['document_type'])}
              className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              {DOCUMENT_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">URL <span className="text-red-400">*</span></label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={!name.trim() || !url.trim() || saving}
              className="px-4 py-2 text-sm font-medium bg-amber-500 hover:bg-amber-400 disabled:bg-gray-700 disabled:text-gray-500 text-black rounded-lg transition-colors"
            >
              {saving ? 'Saving...' : editingId ? 'Update' : 'Save'}
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Links list */}
      {links.length > 0 ? (
        <div className="divide-y divide-gray-800 border border-gray-800 rounded-xl overflow-hidden">
          {links.map(link => {
            const style = typeStyle(link.document_type)

            return (
              <div key={link.id} className="flex items-center gap-3 px-4 py-3 bg-gray-900 hover:bg-gray-800/50 transition-colors">
                {/* Type badge */}
                <span className={`flex-shrink-0 w-10 h-10 rounded-lg border border-gray-700 flex items-center justify-center text-[10px] font-bold uppercase ${style.bg} ${style.text}`}>
                  {style.label.slice(0, 4)}
                </span>

                {/* Link info */}
                <div className="flex-1 min-w-0">
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-white hover:text-amber-400 transition-colors truncate block text-left"
                  >
                    {link.name}
                    <span className="text-[10px] text-gray-500 ml-2">&#8599;</span>
                  </a>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${style.bg} ${style.text}`}>
                      {DOCUMENT_TYPES.find(t => t.value === link.document_type)?.label || 'Other'}
                    </span>
                    <span className="text-gray-700">&middot;</span>
                    <span className="text-[11px] text-gray-500">{new Date(link.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1.5 text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    Open
                  </a>
                  {canEdit && (
                    <>
                      <button
                        onClick={() => startEdit(link)}
                        className="px-2.5 py-1.5 text-xs text-gray-500 hover:text-amber-400 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(link.id)}
                        className="px-2.5 py-1.5 text-xs text-gray-500 hover:text-red-400 transition-colors"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : !showForm ? (
        <p className="text-sm text-gray-500 text-center py-6">No document links added yet.</p>
      ) : null}
    </div>
  )
}
