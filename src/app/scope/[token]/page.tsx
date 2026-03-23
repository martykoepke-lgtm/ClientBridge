'use client'

import { useEffect, use } from 'react'

export default function ScopeViewerPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)

  useEffect(() => {
    // Redirect to the static HTML with the token as a query param
    // The HTML file handles its own rendering and syncs feedback to the API
    window.location.replace(`/scope/aescula.html?token=${token}`)
  }, [token])

  return (
    <div style={{
      minHeight: '100vh',
      background: '#FAFAF7',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'DM Sans', sans-serif"
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#0F1F38' }}>Loading scope document...</div>
      </div>
    </div>
  )
}
