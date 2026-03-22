'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

export default function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const pathname = usePathname()

  // Extract project ID from pathname since we can't use `use(params)` in a layout easily
  // pathname format: /projects/{id}, /projects/{id}/contract, /projects/{id}/documents
  const segments = pathname.split('/')
  const projectsIdx = segments.indexOf('projects')
  const id = projectsIdx >= 0 ? segments[projectsIdx + 1] : ''

  // Determine active tab from pathname
  const subpath = segments.slice(projectsIdx + 2).join('/')
  const activeTab = subpath === 'contract' ? 'contract'
    : subpath === 'documents' ? 'documents'
    : 'overview'

  const tabs = [
    { id: 'overview', label: 'Overview', href: `/projects/${id}` },
    { id: 'contract', label: 'Contract', href: `/projects/${id}/contract` },
    { id: 'documents', label: 'Documents', href: `/projects/${id}/documents` },
  ]

  // Don't render tab bar on nested routes like /feedback/[feedbackId]
  const isNestedRoute = subpath && !['contract', 'documents'].includes(subpath)

  return (
    <div>
      {!isNestedRoute && (
        <div className="flex gap-1 bg-gray-900 rounded-xl p-1 mb-6 border border-gray-800">
          {tabs.map(tab => (
            <Link
              key={tab.id}
              href={tab.href}
              className={`flex-1 px-4 py-2 text-sm text-center rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-gray-800 text-white font-medium border border-gray-700'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      )}
      {children}
    </div>
  )
}
