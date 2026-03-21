import type { ScopeItem } from '@/lib/types'

export default function ScopeSummary({ scopeItems }: { scopeItems: ScopeItem[] }) {
  const inScope = scopeItems.filter(s => s.in_scope)
  const outScope = scopeItems.filter(s => !s.in_scope)
  const completed = inScope.filter(s => s.is_complete).length

  if (scopeItems.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        No scope items defined yet. Go to the project page to set up your project profile and generate scope items.
      </div>
    )
  }

  return (
    <div>
      {/* Progress bar */}
      {inScope.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-gray-500">Scope Progress</span>
            <span className="text-xs text-gray-400">{completed} / {inScope.length} complete</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: `${(completed / inScope.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* In Scope */}
        <div>
          <h4 className="text-xs font-semibold text-green-400 uppercase tracking-wide mb-2">
            In Scope ({inScope.length})
          </h4>
          <div className="space-y-1">
            {inScope.map(item => (
              <div key={item.id} className="flex items-center gap-2 text-sm">
                <span className={item.is_complete ? 'text-green-500' : 'text-gray-600'}>
                  {item.is_complete ? '✓' : '○'}
                </span>
                <span className={item.is_complete ? 'text-gray-500 line-through' : 'text-gray-300'}>
                  {item.label}
                </span>
                {item.source !== 'custom' && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-600">{item.source}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Out of Scope */}
        {outScope.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-red-400 uppercase tracking-wide mb-2">
              Out of Scope ({outScope.length})
            </h4>
            <div className="space-y-1">
              {outScope.map(item => (
                <div key={item.id} className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">—</span>
                  <span className="text-gray-500">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
