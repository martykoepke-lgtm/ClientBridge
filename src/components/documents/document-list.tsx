'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ProjectDocument } from '@/lib/types'

const FILE_TYPE_ICONS: Record<string, string> = {
  'application/pdf': 'PDF',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'application/msword': 'DOC',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
  'application/vnd.ms-excel': 'XLS',
  'text/csv': 'CSV',
  'image/png': 'PNG',
  'image/jpeg': 'JPG',
  'image/gif': 'GIF',
  'image/webp': 'WEBP',
  'text/plain': 'TXT',
}

function getFileIcon(fileType: string): string {
  return FILE_TYPE_ICONS[fileType] || fileType.split('/').pop()?.toUpperCase().slice(0, 4) || 'FILE'
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface DocumentListProps {
  projectId: string
  documents: ProjectDocument[]
  onDocumentsChange: (docs: ProjectDocument[]) => void
  canUpload: boolean
  canDelete: (doc: ProjectDocument) => boolean
  role: 'developer' | 'client'
}

export default function DocumentList({ projectId, documents, onDocumentsChange, canUpload, canDelete, role }: DocumentListProps) {
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleDownload(doc: ProjectDocument) {
    try {
      const res = await fetch(`/api/project-documents?path=${encodeURIComponent(doc.file_url)}`)
      if (!res.ok) { setError('Failed to get download link'); return }
      const { url } = await res.json()
      window.open(url, '_blank')
    } catch {
      setError('Failed to download file')
    }
  }

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)
    setError(null)

    for (const file of Array.from(files)) {
      if (file.size > 25 * 1024 * 1024) {
        setError(`${file.name} exceeds 25MB limit`)
        continue
      }

      const formData = new FormData()
      formData.append('file', file)
      formData.append('projectId', projectId)

      try {
        const res = await fetch('/api/project-documents', {
          method: 'POST',
          body: formData,
        })

        if (!res.ok) {
          const { error: errMsg } = await res.json()
          setError(errMsg || 'Upload failed')
          continue
        }

        const { document: newDoc } = await res.json()
        onDocumentsChange([newDoc, ...documents])
        // Update reference for subsequent uploads in the loop
        documents = [newDoc, ...documents]
      } catch {
        setError('Network error during upload')
      }
    }

    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleDelete(doc: ProjectDocument) {
    try {
      const res = await fetch('/api/project-documents', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: doc.id }),
      })
      if (res.ok) {
        onDocumentsChange(documents.filter(d => d.id !== doc.id))
      }
    } catch {
      setError('Failed to delete document')
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    handleUpload(e.dataTransfer.files)
  }

  return (
    <div className="space-y-4">
      {/* Upload zone */}
      {canUpload && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
            dragOver
              ? 'border-amber-500 bg-amber-500/5'
              : 'border-gray-800 hover:border-gray-700 bg-gray-900/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={(e) => handleUpload(e.target.files)}
            className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.gif,.webp,.txt"
          />
          {uploading ? (
            <p className="text-sm text-amber-400">Uploading...</p>
          ) : (
            <>
              <p className="text-sm text-gray-400">Drop files here or click to upload</p>
              <p className="text-xs text-gray-600 mt-1">PDF, DOCX, XLSX, CSV, images, TXT — max 25MB each</p>
            </>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-900/30 border border-red-800 text-red-300 px-4 py-2 rounded-lg text-sm">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-400 hover:text-red-300">dismiss</button>
        </div>
      )}

      {/* Document list */}
      {documents.length > 0 ? (
        <div className="divide-y divide-gray-800 border border-gray-800 rounded-xl overflow-hidden">
          {documents.map(doc => (
            <div key={doc.id} className="flex items-center gap-3 px-4 py-3 bg-gray-900 hover:bg-gray-800/50 transition-colors">
              {/* File type badge */}
              <span className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-400 uppercase">
                {getFileIcon(doc.file_type)}
              </span>

              {/* File info */}
              <div className="flex-1 min-w-0">
                <button
                  onClick={() => handleDownload(doc)}
                  className="text-sm text-white hover:text-amber-400 transition-colors truncate block text-left"
                >
                  {doc.file_name}
                </button>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] text-gray-500">{formatFileSize(doc.file_size)}</span>
                  <span className="text-gray-700">·</span>
                  <span className="text-[11px] text-gray-500">{new Date(doc.created_at).toLocaleDateString()}</span>
                  <span className="text-gray-700">·</span>
                  <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${
                    doc.uploaded_by_role === 'developer'
                      ? 'bg-blue-900/40 text-blue-400'
                      : 'bg-purple-900/40 text-purple-400'
                  }`}>
                    {doc.uploaded_by_role === 'developer' ? 'Agency' : 'Client'}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => handleDownload(doc)}
                  className="px-2.5 py-1.5 text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Download
                </button>
                {canDelete(doc) && (
                  <button
                    onClick={() => handleDelete(doc)}
                    className="px-2.5 py-1.5 text-xs text-gray-500 hover:text-red-400 transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500 text-center py-6">No documents uploaded yet.</p>
      )}
    </div>
  )
}
