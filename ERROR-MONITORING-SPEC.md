# Error Monitoring & Client-Facing Error States — Integration Spec

> Clients should never see a blank screen. Every failure mode gets a branded, helpful message.
> Developers get structured error data with enough context to act on it.

---

## Problem

When the proxied app inside the iframe fails to load — bad URL, CORS issue, server down, auth redirect — the client sees a blank or white rectangle with no explanation. Console errors pile up but are invisible to both the client and the developer. There's no feedback loop: the client thinks the app is broken, the developer doesn't know anything went wrong.

---

## Goals

1. **Never show a blank iframe** — every failure gets a branded error state with a clear message
2. **Classify errors automatically** — distinguish between "app is down," "proxy failed," "auth redirect," and "browser extension noise"
3. **Surface actionable errors to the developer** — store them in a table, show them in the dashboard
4. **Ignore noise** — Chrome extension errors, benign warnings, third-party script failures
5. **Give clients a path forward** — retry button, feedback form fallback, contact developer

---

## Error Classification

### Tier 1: Client-Facing (show a message in the iframe area)

| Error Type | Detection | Client Message |
|-----------|-----------|----------------|
| **Proxy fetch failed** | `/api/proxy` returns 502 | "The app couldn't be loaded right now. Your developer has been notified. You can still submit feedback." |
| **App server down** | `/api/proxy` returns 502 or iframe fails to load after timeout | "The app appears to be offline. Try refreshing in a few minutes." |
| **URL not authorized** | `/api/proxy` returns 403 | "This review link is no longer active. Contact your developer." |
| **Auth redirect loop** | Iframe loads but immediately redirects to a login page (detected via postMessage or URL check) | "The app is asking you to log in. Your developer needs to configure public access for review." |
| **Iframe load timeout** | No `load` event or `postMessage` within 15 seconds | "The app is taking too long to load. Tap to retry." |
| **SSL/Mixed content** | Iframe blocked by browser | "The app couldn't be loaded due to a security restriction." |

### Tier 2: Developer-Facing (log for dashboard, don't show to client)

| Error Type | Detection | Notes |
|-----------|-----------|-------|
| Supabase auth errors from proxied app | `400` on `/auth/v1/token` | The client's app is trying to auth through the proxy — expected if app has auth |
| CORS errors | Console or fetch failures | May need proxy adjustments |
| JavaScript runtime errors | `window.onerror` / `error` event in iframe context | App bugs, not ClientBridge bugs |

### Tier 3: Noise (ignore completely)

| Error Type | Detection | Why Ignore |
|-----------|-----------|------------|
| `runtime.lastError` | Chrome extension message | Not from the app or ClientBridge |
| `An iframe which has both allow-scripts and allow-same-origin` | Browser security warning | Expected behavior — required for proxied apps to function |
| DevTools warnings | React DevTools, HMR connected | Development-only messages |

---

## Data Model

### `error_log` table

```sql
CREATE TABLE error_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  client_name text,                          -- who was using the app when it happened
  error_type text NOT NULL,                  -- 'proxy_failed' | 'app_down' | 'auth_redirect' | 'timeout' | 'ssl_error' | 'cors' | 'js_runtime' | 'supabase_auth'
  tier integer NOT NULL DEFAULT 1,           -- 1 = client-facing, 2 = developer-only, 3 = noise (filtered out)
  message text NOT NULL,                     -- human-readable error description
  url text,                                  -- the URL that failed
  raw_error text,                            -- raw error message / stack trace
  user_agent text,                           -- browser info
  status text DEFAULT 'new',                 -- 'new' | 'acknowledged' | 'resolved' | 'ignored'
  resolution_notes text,                     -- developer notes on how it was fixed
  created_at timestamptz DEFAULT now()
);

-- Index for dashboard queries
CREATE INDEX idx_error_log_project ON error_log(project_id, created_at DESC);
CREATE INDEX idx_error_log_status ON error_log(status) WHERE status = 'new';
```

### TypeScript type

```typescript
export interface ErrorLog {
  id: string
  project_id: string
  client_name: string | null
  error_type: 'proxy_failed' | 'app_down' | 'auth_redirect' | 'timeout' | 'ssl_error' | 'cors' | 'js_runtime' | 'supabase_auth'
  tier: 1 | 2 | 3
  message: string
  url: string | null
  raw_error: string | null
  user_agent: string | null
  status: 'new' | 'acknowledged' | 'resolved' | 'ignored'
  resolution_notes: string | null
  created_at: string
}
```

---

## Implementation: Client-Facing Error States

### 1. Iframe error boundary component

Replace the bare `<iframe>` in the review page with a wrapper component that handles all failure modes:

```typescript
// components/review/iframe-viewer.tsx

function IframeViewer({ project, clientName }: { project: Project; clientName: string }) {
  const [iframeStatus, setIframeStatus] = useState<'loading' | 'loaded' | 'error'>('loading')
  const [errorInfo, setErrorInfo] = useState<{ type: string; message: string } | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    // Start load timeout (15 seconds)
    timeoutRef.current = setTimeout(() => {
      if (iframeStatus === 'loading') {
        setIframeStatus('error')
        setErrorInfo({
          type: 'timeout',
          message: 'The app is taking too long to load.'
        })
        logError(project.id, clientName, 'timeout', project.vercel_url)
      }
    }, 15000)

    return () => clearTimeout(timeoutRef.current)
  }, [])

  // Listen for successful postMessage from the tracking script
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === 'clientbridge:context') {
        setIframeStatus('loaded')
        clearTimeout(timeoutRef.current)
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  // Pre-check: hit the proxy and check status before loading iframe
  useEffect(() => {
    async function checkProxy() {
      try {
        const res = await fetch(`/api/proxy?url=${encodeURIComponent(project.vercel_url!)}`, {
          method: 'HEAD'
        })
        if (res.status === 403) {
          setIframeStatus('error')
          setErrorInfo({ type: 'unauthorized', message: 'This review link is no longer active.' })
        } else if (res.status === 502) {
          setIframeStatus('error')
          setErrorInfo({ type: 'app_down', message: 'The app couldn\'t be reached right now.' })
          logError(project.id, clientName, 'proxy_failed', project.vercel_url)
        }
      } catch {
        setIframeStatus('error')
        setErrorInfo({ type: 'network', message: 'Unable to connect. Check your internet connection.' })
      }
    }
    if (project.vercel_url) checkProxy()
  }, [project.vercel_url])

  function handleRetry() {
    setIframeStatus('loading')
    setErrorInfo(null)
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src
    }
  }

  if (iframeStatus === 'error' && errorInfo) {
    return <ErrorOverlay error={errorInfo} onRetry={handleRetry} />
  }

  return (
    <>
      {iframeStatus === 'loading' && <LoadingOverlay />}
      <iframe
        ref={iframeRef}
        src={`/api/proxy?url=${encodeURIComponent(project.vercel_url!)}`}
        className="w-full h-full border-0"
        title={`Review: ${project.name}`}
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
        onError={() => {
          setIframeStatus('error')
          setErrorInfo({ type: 'load_failed', message: 'The app failed to load.' })
        }}
      />
    </>
  )
}
```

### 2. Error overlay component

```typescript
// components/review/error-overlay.tsx

function ErrorOverlay({ error, onRetry }: { error: { type: string; message: string }; onRetry: () => void }) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-[#09090B]">
      <div className="text-center max-w-sm px-6">
        {/* cb monogram */}
        <svg className="mx-auto mb-6" width="48" height="48" viewBox="0 0 42 42" fill="none">
          <rect x="2" y="2" width="38" height="38" rx="8" stroke="#27272A" strokeWidth="2" fill="none"/>
          <text x="10" y="30" fontFamily="Inter" fontWeight="800" fontSize="26" fill="#27272A">cb</text>
        </svg>
        <h2 className="text-lg font-semibold text-white mb-2">
          {error.type === 'timeout' ? 'Slow to Load' : 'Something Went Wrong'}
        </h2>
        <p className="text-sm text-[#71717A] mb-6">{error.message}</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-[#F59E0B] hover:bg-[#D97706] text-[#09090B] text-sm font-semibold rounded-lg transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={() => { /* switch to feedback mode */ }}
            className="px-4 py-2 bg-[#18181B] hover:bg-[#27272A] text-white text-sm font-medium rounded-lg border border-[#27272A] transition-colors"
          >
            Submit Feedback Instead
          </button>
        </div>
        <p className="text-xs text-[#52525B] mt-4">Your developer has been notified.</p>
      </div>
    </div>
  )
}
```

### 3. Error logging API endpoint

```typescript
// app/api/errors/route.ts

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { project_id, client_name, error_type, message, url, raw_error, user_agent } = body

  // Classify tier
  const tier = classifyTier(error_type)
  if (tier === 3) return NextResponse.json({ ok: true }) // noise, don't store

  const supabase = createServiceClient()
  await supabase.from('error_log').insert({
    project_id, client_name, error_type, tier, message, url, raw_error, user_agent
  })

  return NextResponse.json({ ok: true })
}

function classifyTier(type: string): 1 | 2 | 3 {
  const tier1 = ['proxy_failed', 'app_down', 'auth_redirect', 'timeout', 'ssl_error']
  const tier2 = ['cors', 'js_runtime', 'supabase_auth']
  if (tier1.includes(type)) return 1
  if (tier2.includes(type)) return 2
  return 3
}
```

---

## Implementation: Developer Dashboard Error View

### Error panel on project detail page

Add a collapsible "Errors" section to the project detail page (below feedback):

```
┌─────────────────────────────────────────────────────┐
│  ⚠ 3 unresolved errors                    [Expand]  │
├─────────────────────────────────────────────────────┤
│  🔴 proxy_failed — 2 hours ago                      │
│     App returned 502 when client tried to load       │
│     URL: https://govern-iq-app.vercel.app/           │
│     Client: Dr. Scariati                             │
│     [Acknowledge] [Resolve] [Ignore]                 │
│                                                      │
│  🟡 timeout — 5 hours ago                            │
│     App took >15s to load                            │
│     Client: Dr. Scariati                             │
│     [Acknowledge] [Resolve] [Ignore]                 │
│                                                      │
│  🔵 supabase_auth — 1 day ago                        │
│     Client's app Supabase auth failed through proxy  │
│     This is expected if the app has its own auth      │
│     [Ignore]                                         │
└─────────────────────────────────────────────────────┘
```

### Error count in dashboard stats

Add an "Errors" stat card to the main dashboard showing unresolved Tier 1 errors across all projects.

---

## Remediation Playbook

Each error type has a defined fix path. This lives in the dashboard UI as contextual help:

| Error Type | What Happened | Fix |
|-----------|---------------|-----|
| `proxy_failed` | ClientBridge proxy couldn't reach the app | Check if the Vercel URL is correct and the app is deployed. Try visiting the URL directly. |
| `app_down` | App returned a 5xx or didn't respond | Check Vercel dashboard for deployment status. The app may be redeploying. |
| `auth_redirect` | App redirected to a login page inside the iframe | The client's app needs a public route or a bypass token for the review URL. Add an env var or middleware exception. |
| `timeout` | App loaded but didn't send a tracking signal within 15s | App may be slow, or CSP headers may be blocking the tracking script. Check the app's Content-Security-Policy headers. |
| `ssl_error` | Mixed content or invalid cert | Ensure the app URL uses HTTPS. Check cert expiry. |
| `cors` | Cross-origin request blocked | The proxy handles most CORS, but some API calls from the app may fail. Consider adding the ClientBridge domain to the app's CORS allowlist. |
| `supabase_auth` | Client app's own auth call failed through proxy | Expected behavior — the client app is trying to authenticate. Not a ClientBridge bug. Auto-classify as Tier 2. |
| `js_runtime` | JavaScript error in the client's app | App bug, not ClientBridge. Log for developer awareness. |

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/review/iframe-viewer.tsx` | Create — iframe wrapper with error detection |
| `src/components/review/error-overlay.tsx` | Create — branded error state component |
| `src/components/review/loading-overlay.tsx` | Create — branded loading state |
| `src/app/api/errors/route.ts` | Create — error logging endpoint |
| `src/lib/types.ts` | Modify — add ErrorLog type |
| `src/app/review/[token]/page.tsx` | Modify — replace bare iframe with IframeViewer |
| `src/app/(dashboard)/projects/[id]/page.tsx` | Modify — add error panel section |
| `src/app/(dashboard)/dashboard/page.tsx` | Modify — add error count stat |
| `supabase/migrations/xxx_add_error_log.sql` | Create — error_log table |

---

## Implementation Order

1. Create `error_log` table and TypeScript type
2. Build `ErrorOverlay` and `LoadingOverlay` components
3. Build `IframeViewer` component with timeout, pre-check, and postMessage detection
4. Create `/api/errors` logging endpoint
5. Replace bare iframe in review page with `IframeViewer`
6. Add error panel to project detail page
7. Add error count to dashboard stats
8. Wire up remediation playbook as contextual help in error panel

Estimated effort: 2-3 days for the full implementation.

---

## Active Error Monitoring Agent

The agent is a lightweight client-side script that runs on both the developer dashboard and the client review interface. It intercepts console output, network failures, and unhandled exceptions in real time, classifies them, and routes them appropriately.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    BROWSER (Client or Developer)                 │
│                                                                  │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│   │ Console       │    │ Network      │    │ Unhandled    │     │
│   │ Interceptor   │    │ Interceptor  │    │ Error Catcher│     │
│   └──────┬───────┘    └──────┬───────┘    └──────┬───────┘     │
│          │                    │                    │              │
│          └────────────┬───────┴────────────────────┘              │
│                       ▼                                          │
│              ┌────────────────┐                                   │
│              │  Error Router  │                                   │
│              │  (classify,    │                                   │
│              │   deduplicate, │                                   │
│              │   rate limit)  │                                   │
│              └────────┬───────┘                                   │
│                       │                                          │
│          ┌────────────┼────────────┐                              │
│          ▼            ▼            ▼                              │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐                        │
│   │ Client   │ │ Log to   │ │ Discard  │                        │
│   │ Error UI │ │ /api/err │ │ (noise)  │                        │
│   │ (Tier 1) │ │ (Tier 2) │ │ (Tier 3) │                        │
│   └──────────┘ └──────────┘ └──────────┘                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
              ┌──────────────────────┐
              │    Supabase          │
              │    error_log table   │
              └──────────┬───────────┘
                         │
              ┌──────────┴───────────┐
              │  Developer Dashboard │
              │  Error Panel +       │
              │  Remediation Playbook│
              └──────────────────────┘
```

### Error Agent Script (`lib/error-agent.ts`)

A singleton that attaches to the window and intercepts everything:

```typescript
type ErrorTier = 1 | 2 | 3
type ErrorEntry = {
  type: string
  tier: ErrorTier
  message: string
  url?: string
  raw?: string
  source: 'console' | 'network' | 'unhandled' | 'iframe' | 'proxy'
  timestamp: number
}

class ErrorAgent {
  private buffer: ErrorEntry[] = []
  private flushInterval: number
  private projectId: string
  private clientName: string | null
  private seenHashes = new Set<string>()

  constructor(projectId: string, clientName?: string) {
    this.projectId = projectId
    this.clientName = clientName || null
    this.attach()
    this.flushInterval = window.setInterval(() => this.flush(), 10000) // flush every 10s
  }

  private attach() {
    // 1. Console interception
    this.interceptConsole()
    // 2. Unhandled errors
    window.addEventListener('error', (e) => this.handleWindowError(e))
    window.addEventListener('unhandledrejection', (e) => this.handleUnhandledRejection(e))
    // 3. Network failures (fetch wrapper)
    this.interceptFetch()
    // 4. iframe postMessage errors
    window.addEventListener('message', (e) => this.handleIframeMessage(e))
  }

  private interceptConsole() {
    const origError = console.error
    const origWarn = console.warn
    const self = this

    console.error = function(...args: any[]) {
      self.processConsoleEntry('error', args)
      origError.apply(console, args)
    }
    console.warn = function(...args: any[]) {
      self.processConsoleEntry('warn', args)
      origWarn.apply(console, args)
    }
  }

  private processConsoleEntry(level: 'error' | 'warn', args: any[]) {
    const message = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ')
    const classified = this.classify(message, 'console')
    if (classified) this.push(classified)
  }

  private interceptFetch() {
    const origFetch = window.fetch
    const self = this

    window.fetch = async function(input: RequestInfo | URL, init?: RequestInit) {
      try {
        const response = await origFetch(input, init)
        if (!response.ok && response.status >= 400) {
          const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
          self.push({
            type: self.classifyNetworkError(response.status, url),
            tier: response.status >= 500 ? 1 : 2,
            message: `HTTP ${response.status} on ${url}`,
            url,
            source: 'network',
            timestamp: Date.now()
          })
        }
        return response
      } catch (err) {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url
        self.push({
          type: 'network_error',
          tier: 1,
          message: `Fetch failed: ${url}`,
          url,
          raw: String(err),
          source: 'network',
          timestamp: Date.now()
        })
        throw err
      }
    }
  }

  private handleWindowError(e: ErrorEvent) {
    this.push({
      type: 'js_runtime',
      tier: 2,
      message: e.message,
      url: e.filename,
      raw: `${e.filename}:${e.lineno}:${e.colno}`,
      source: 'unhandled',
      timestamp: Date.now()
    })
  }

  private handleUnhandledRejection(e: PromiseRejectionEvent) {
    const message = e.reason?.message || String(e.reason)
    const classified = this.classify(message, 'unhandled')
    if (classified) this.push(classified)
    else this.push({
      type: 'unhandled_promise',
      tier: 2,
      message,
      raw: e.reason?.stack,
      source: 'unhandled',
      timestamp: Date.now()
    })
  }

  private handleIframeMessage(e: MessageEvent) {
    if (e.data?.type === 'clientbridge:error') {
      this.push({
        type: e.data.errorType || 'iframe_error',
        tier: 1,
        message: e.data.message,
        url: e.data.url,
        source: 'iframe',
        timestamp: Date.now()
      })
    }
  }

  // --- CLASSIFICATION ENGINE ---

  private classify(message: string, source: string): ErrorEntry | null {
    // Tier 3: noise — discard
    if (this.isNoise(message)) return null

    // Tier 1: client-facing
    if (/Failed to fetch|NetworkError|net::ERR_/i.test(message)) {
      return { type: 'network_error', tier: 1, message, source: source as any, timestamp: Date.now() }
    }
    if (/CORS|Access-Control-Allow-Origin|cross-origin/i.test(message)) {
      return { type: 'cors', tier: 2, message, source: source as any, timestamp: Date.now() }
    }
    if (/Content Security Policy|CSP|blocked.*script/i.test(message)) {
      return { type: 'csp_violation', tier: 2, message, source: source as any, timestamp: Date.now() }
    }
    if (/auth.*token|401.*unauthorized|403.*forbidden/i.test(message)) {
      return { type: 'auth_error', tier: 2, message, source: source as any, timestamp: Date.now() }
    }
    if (/supabase.*auth|\/auth\/v1\/token/i.test(message)) {
      return { type: 'supabase_auth', tier: 2, message, source: source as any, timestamp: Date.now() }
    }
    if (/hydration|mismatch|server.*client/i.test(message)) {
      return { type: 'hydration_mismatch', tier: 2, message, source: source as any, timestamp: Date.now() }
    }
    if (/chunk.*failed|loading.*chunk|dynamic.*import/i.test(message)) {
      return { type: 'chunk_load_failed', tier: 1, message, source: source as any, timestamp: Date.now() }
    }
    if (/ResizeObserver loop|ResizeObserver/i.test(message)) {
      return null // common benign warning
    }

    // Default: Tier 2 if it's an error-level console entry
    return { type: 'unknown', tier: 2, message, source: source as any, timestamp: Date.now() }
  }

  private isNoise(message: string): boolean {
    const noisePatterns = [
      /runtime\.lastError/i,
      /message channel closed/i,
      /An iframe which has both allow-scripts/i,
      /React DevTools/i,
      /Download the React DevTools/i,
      /\[HMR\]/i,
      /hot module replacement/i,
      /webpack.*hmr/i,
      /next.*dev.*indicator/i,
      /favicon\.ico.*404/i,
      /sourceMappingURL/i,
      /DevTools failed to/i,
      /Manifest.*error/i,
      /__nextjs/i,
      /\[Fast Refresh\]/i,
      /Turbopack/i,
    ]
    return noisePatterns.some(p => p.test(message))
  }

  private classifyNetworkError(status: number, url: string): string {
    if (url.includes('/api/proxy')) return 'proxy_failed'
    if (url.includes('/auth/')) return 'supabase_auth'
    if (status === 401 || status === 403) return 'auth_error'
    if (status >= 500) return 'server_error'
    if (status === 404) return 'not_found'
    if (status === 429) return 'rate_limited'
    return 'http_error'
  }

  // --- DEDUPLICATION & RATE LIMITING ---

  private push(entry: ErrorEntry) {
    const hash = `${entry.type}:${entry.message.slice(0, 100)}`
    if (this.seenHashes.has(hash)) return // deduplicate
    this.seenHashes.add(hash)

    // Expire hashes after 60 seconds (allow same error to be reported again later)
    setTimeout(() => this.seenHashes.delete(hash), 60000)

    this.buffer.push(entry)

    // Immediate flush for Tier 1
    if (entry.tier === 1) this.flush()
  }

  private async flush() {
    if (this.buffer.length === 0) return
    const batch = this.buffer.splice(0)

    try {
      await fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: this.projectId,
          client_name: this.clientName,
          user_agent: navigator.userAgent,
          errors: batch
        })
      })
    } catch {
      // If error reporting itself fails, don't crash the app
      // Put items back in buffer for next flush
      this.buffer.unshift(...batch)
    }
  }

  destroy() {
    clearInterval(this.flushInterval)
  }
}
```

### Comprehensive Error Taxonomy

Beyond the original classification, here is every error type the agent watches for:

**Category: Network & Connectivity**

| Type | Pattern | Tier | Source | Remediation |
|------|---------|------|--------|-------------|
| `network_error` | `Failed to fetch`, `net::ERR_*` | 1 | fetch wrapper | Client offline or server unreachable. Show retry. |
| `proxy_failed` | `/api/proxy` returns 5xx | 1 | fetch wrapper | Proxy couldn't reach target app. Verify Vercel URL. |
| `dns_resolution` | `net::ERR_NAME_NOT_RESOLVED` | 1 | console | Domain doesn't resolve. URL is wrong or domain expired. |
| `ssl_error` | `net::ERR_CERT_*`, mixed content | 1 | console | SSL cert issue. Check cert expiry or HTTPS enforcement. |
| `rate_limited` | HTTP 429 | 2 | fetch wrapper | Too many requests. Back off and retry. |
| `timeout` | No postMessage within 15s | 1 | iframe viewer | App slow to load. Check server performance. |

**Category: Security & Access**

| Type | Pattern | Tier | Source | Remediation |
|------|---------|------|--------|-------------|
| `cors` | `Access-Control-Allow-Origin` | 2 | console | Add ClientBridge domain to app's CORS config. |
| `csp_violation` | `Content Security Policy` | 2 | console | App's CSP blocks injected tracking script. Add exception. |
| `auth_redirect` | iframe URL changes to `/login` | 1 | postMessage | App requires auth. Configure public route for review. |
| `auth_error` | HTTP 401/403 | 2 | fetch wrapper | Auth token expired or insufficient permissions. |
| `iframe_sandboxed` | `Blocked a frame` | 1 | console | Browser blocked iframe operation. Adjust sandbox attrs. |

**Category: Application Runtime**

| Type | Pattern | Tier | Source | Remediation |
|------|---------|------|--------|-------------|
| `js_runtime` | Unhandled TypeError, ReferenceError | 2 | window.onerror | Bug in the client's app code. Not a ClientBridge issue. |
| `unhandled_promise` | Unhandled promise rejection | 2 | unhandledrejection | Async error in client app. Log for developer. |
| `hydration_mismatch` | `Hydration failed`, `server.*client` | 2 | console | Next.js/React SSR mismatch. App rendering issue. |
| `chunk_load_failed` | `Loading chunk * failed` | 1 | console | App bundle failed to load. New deployment may fix. Retry. |
| `react_error_boundary` | `Error boundary caught` | 2 | console | React component crashed. App-level bug. |
| `next_error` | `Unhandled Runtime Error` | 2 | console | Next.js runtime error. Check app dev console. |

**Category: Third-Party & Integrations**

| Type | Pattern | Tier | Source | Remediation |
|------|---------|------|--------|-------------|
| `supabase_auth` | `/auth/v1/token` 400 | 2 | fetch wrapper | Client app's own Supabase trying to auth through proxy. Expected. |
| `supabase_query` | `/rest/v1/` errors | 2 | fetch wrapper | Database query failed. App-level data issue. |
| `third_party_script` | Error from CDN / external domain | 3 | console | Analytics, chat widgets, etc. Usually noise. |
| `stripe_error` | Stripe API errors | 2 | fetch wrapper | Payment integration issue. Flag for developer. |
| `api_integration` | External API 4xx/5xx | 2 | fetch wrapper | Third-party API the app depends on is failing. |

**Category: Browser & Environment**

| Type | Pattern | Tier | Source | Remediation |
|------|---------|------|--------|-------------|
| `extension_noise` | `runtime.lastError`, extension URLs | 3 | console | Chrome extension. Ignore completely. |
| `devtools_noise` | React DevTools, HMR, Fast Refresh | 3 | console | Development tools. Ignore. |
| `storage_quota` | `QuotaExceededError` | 2 | console | localStorage full. App should handle gracefully. |
| `webgl_error` | WebGL context lost | 2 | console | GPU issue. Not actionable for developer. |
| `service_worker` | SW registration/update errors | 2 | console | PWA service worker issue. May cause stale content. |
| `deprecated_api` | `[Deprecation]` warnings | 3 | console | Browser API deprecation notice. Low priority. |
| `permission_denied` | `NotAllowedError`, permission block | 2 | console | Camera, mic, location blocked. App feature limitation. |

---

## Developer-Side Agent

The same `ErrorAgent` class runs on the developer dashboard, but with different behavior:

- **No client-facing error overlay** — developers see errors in the error panel
- **Catches ClientBridge's own errors** — Supabase query failures, auth issues, component crashes
- **Additional monitoring**: API response times, slow queries, failed invoice generation

### Developer-specific error types

| Type | Pattern | Tier | Remediation |
|------|---------|------|-------------|
| `cb_supabase_error` | ClientBridge Supabase query fails | 1 | Check RLS policies, table schema, connection. |
| `cb_auth_error` | Developer login/session fails | 1 | Check Supabase auth config, token refresh. |
| `cb_api_error` | `/api/invoice`, `/api/summarize` fails | 1 | Check API route, dependencies (react-pdf, Anthropic). |
| `cb_render_error` | Dashboard component crashes | 1 | React error boundary caught a crash. Check component. |
| `slow_query` | Supabase response > 3 seconds | 2 | Add index, optimize query, check RLS performance. |

---

## Remediation Workflow

When errors land in the `error_log` table, the developer sees them in the dashboard with a defined workflow:

```
New → Acknowledged → Resolved
         ↓
       Ignored (if noise that got through)
```

Each error type has a remediation card that appears in the dashboard:

```
┌─────────────────────────────────────────────────────────────┐
│ 🔴 proxy_failed                              2 hours ago   │
│                                                             │
│ App returned 502 when client "Dr. Scariati" tried to load  │
│ URL: https://govern-iq-app.vercel.app/#requests/ideas      │
│                                                             │
│ ┌─ Suggested Fix ─────────────────────────────────────────┐ │
│ │ 1. Visit the URL directly to check if the app is up     │ │
│ │ 2. Check Vercel dashboard for deployment status          │ │
│ │ 3. If the app uses hash routing (#), verify the proxy    │ │
│ │    handles fragments correctly                           │ │
│ │ 4. Check if the app's server has rate limiting           │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [Acknowledge]  [Mark Resolved]  [Ignore]  [Generate Prompt] │
└─────────────────────────────────────────────────────────────┘
```

The "Generate Prompt" button creates a Claude Code / Cursor prompt from the error, similar to how feedback items generate prompts.

---

## Initialization

### Client review page

```typescript
// In review/[token]/page.tsx, after project loads:
useEffect(() => {
  if (!project) return
  const agent = new ErrorAgent(project.id, clientName)
  return () => agent.destroy()
}, [project, clientName])
```

### Developer dashboard

```typescript
// In (dashboard)/layout.tsx:
useEffect(() => {
  const agent = new ErrorAgent('__dashboard__')
  return () => agent.destroy()
}, [])
```

---

## Error Logging API (Expanded)

The `/api/errors` endpoint accepts batched errors:

```typescript
// app/api/errors/route.ts
export async function POST(request: NextRequest) {
  const { project_id, client_name, user_agent, errors } = await request.json()

  const supabase = createServiceClient()

  // Filter and store
  const rows = errors
    .filter((e: ErrorEntry) => e.tier <= 2)  // discard Tier 3
    .map((e: ErrorEntry) => ({
      project_id: project_id === '__dashboard__' ? null : project_id,
      client_name,
      error_type: e.type,
      tier: e.tier,
      message: e.message,
      url: e.url || null,
      raw_error: e.raw || null,
      user_agent,
      source: e.source,
    }))

  if (rows.length > 0) {
    await supabase.from('error_log').insert(rows)
  }

  return NextResponse.json({ ok: true, logged: rows.length })
}
```

---

## Updated Files to Create/Modify

| File | Action |
|------|--------|
| `src/lib/error-agent.ts` | Create — full error monitoring agent class |
| `src/components/review/iframe-viewer.tsx` | Create — iframe wrapper with error detection + overlay |
| `src/components/review/error-overlay.tsx` | Create — branded client-facing error state |
| `src/components/review/loading-overlay.tsx` | Create — branded loading spinner |
| `src/app/api/errors/route.ts` | Create — batched error logging endpoint |
| `src/lib/types.ts` | Modify — add ErrorLog type |
| `src/app/review/[token]/page.tsx` | Modify — initialize ErrorAgent, use IframeViewer |
| `src/app/(dashboard)/layout.tsx` | Modify — initialize ErrorAgent for dashboard |
| `src/app/(dashboard)/projects/[id]/page.tsx` | Modify — add error panel with remediation cards |
| `src/app/(dashboard)/dashboard/page.tsx` | Modify — add error count stat card |
| `supabase/migrations/xxx_add_error_log.sql` | Create — error_log table + indexes |

---

## Implementation Order

1. Create `error_log` table migration and TypeScript type
2. Build `ErrorAgent` class with all interceptors and classification engine
3. Build `ErrorOverlay` and `LoadingOverlay` components
4. Build `IframeViewer` component wrapping the iframe with error detection
5. Create `/api/errors` batched logging endpoint
6. Initialize ErrorAgent on client review page
7. Replace bare iframe with IframeViewer in review page
8. Initialize ErrorAgent on developer dashboard layout
9. Build error panel with remediation cards on project detail page
10. Add error count stat to main dashboard
11. Add "Generate Prompt" action to error cards

Estimated effort: 3-4 days for the full implementation.

---

## Future Enhancements

- **SMS/email alerts** when Tier 1 errors spike (integrates with SMS-SPEC.md)
- **Health check cron** — periodic ping to all active project URLs, log errors before clients see them
- **Error trends** — sparkline charts in dashboard showing error frequency over time per project
- **Auto-resolve** — if the same error stops occurring for 24h, auto-mark as resolved
- **Client self-report** — "Something's not working" button that captures browser state + screenshot
- **Prompt generation from errors** — package error context into Claude Code prompts for faster debugging

---

*Last updated: March 17, 2026*
