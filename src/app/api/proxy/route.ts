import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Tracking script injected into every proxied HTML page
// Sends postMessage to parent with the REAL app URL and title on every navigation
// The script resolves proxy URLs back to the original app URLs so the parent
// always receives the actual URL the client is viewing.
function buildTrackingScript(realPageUrl: string): string {
  return `
<script data-clientbridge-tracking>
(function() {
  var PARENT = window.parent;
  if (PARENT === window) return; // not in iframe

  // The real origin of the app being proxied (set at injection time)
  var REAL_PAGE_URL = ${JSON.stringify(realPageUrl)};
  var realParsed = (function() { try { return new URL(REAL_PAGE_URL); } catch(e) { return null; } })();
  var REAL_ORIGIN = realParsed ? realParsed.origin : '';

  // Resolve the current proxy location back to the real app URL
  function getRealUrl() {
    var loc = location.href;
    // If we're at a proxy URL like /api/proxy?url=..., extract the real URL
    // IMPORTANT: hash fragments (#workdash, #requests/ideas) live on the
    // outer proxy URL, NOT inside the url= query param. We must capture
    // the hash from the current location and append it to the target.
    try {
      var u = new URL(loc);
      if (u.pathname === '/api/proxy') {
        var target = u.searchParams.get('url');
        if (target) {
          // Append the current hash to the target URL
          // e.g. /api/proxy?url=https://app.vercel.app/#workdash
          //   → target = https://app.vercel.app/
          //   → u.hash = #workdash
          //   → result = https://app.vercel.app/#workdash
          var currentHash = u.hash || location.hash;
          if (currentHash) {
            // Strip any existing hash from target before appending
            var targetBase = target.split('#')[0];
            return targetBase + currentHash;
          }
          return target;
        }
      }
    } catch(e) {}
    // For SPA navigations that change the path (pushState etc.),
    // the browser path may have changed from /api/proxy to something else.
    // In that case, map the current path back to the real origin.
    if (REAL_ORIGIN) {
      try {
        var current = new URL(loc);
        return REAL_ORIGIN + current.pathname + current.search + current.hash;
      } catch(e) {}
    }
    // SAFETY: Never return the proxy/ClientBridge domain as the "real" URL.
    // If we can't resolve the real URL, return the REAL_PAGE_URL that was
    // injected at proxy time — this is always the correct app URL.
    return REAL_PAGE_URL || '';
  }

  function send() {
    PARENT.postMessage({
      type: 'clientbridge:context',
      url: getRealUrl(),
      title: document.title
    }, '*');
  }

  // Send on initial load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', send);
  } else {
    send();
  }

  // Also send after title might have updated (SPAs often set title late)
  window.addEventListener('load', function() {
    setTimeout(send, 100);
  });

  // Detect SPA navigation by patching history methods
  var origPush = history.pushState;
  var origReplace = history.replaceState;

  history.pushState = function() {
    origPush.apply(this, arguments);
    setTimeout(send, 50);
  };

  history.replaceState = function() {
    origReplace.apply(this, arguments);
    setTimeout(send, 50);
  };

  window.addEventListener('popstate', function() {
    setTimeout(send, 50);
  });

  // Hash-routed apps (React Router hash, Vue hash mode, etc.)
  // These use window.location.hash instead of pushState/replaceState
  window.addEventListener('hashchange', function() {
    setTimeout(send, 50);
  });

  // Detect external navigations (OAuth, payment gateways, etc.) and open
  // them in a new window instead of navigating the iframe. This prevents
  // the client from seeing the developer's ClientBridge app when OAuth
  // redirects back to the proxy origin.
  var PROXY_ORIGIN = location.origin;
  var AUTH_DOMAINS = ['accounts.google.com', 'github.com', 'login.microsoftonline.com',
    'appleid.apple.com', 'facebook.com', 'auth0.com', 'login.live.com'];

  function isExternalAuth(url) {
    try {
      var u = new URL(url);
      // Check if the URL is an external auth provider
      if (AUTH_DOMAINS.some(function(d) { return u.hostname.includes(d); })) return true;
      // Check if it's going to an entirely different domain (not proxy, not real app)
      if (u.origin !== PROXY_ORIGIN && u.origin !== REAL_ORIGIN) return true;
      // Check if it's a Supabase auth URL on the same origin (which would navigate
      // the iframe to a Supabase auth endpoint, breaking the review session)
      if (u.pathname.includes('/auth/v1/authorize') || u.pathname.includes('/auth/v1/callback')) return true;
    } catch(e) {}
    return false;
  }

  // Intercept window.location assignments to catch OAuth redirects
  // Supabase OAuth does: window.location.href = 'https://accounts.google.com/...'
  var locationDescriptor = Object.getOwnPropertyDescriptor(window, 'location');
  if (!locationDescriptor || locationDescriptor.configurable !== false) {
    // Can't override location directly, but we can intercept via other means
  }

  // Intercept window.open to handle popup-based OAuth
  var origOpen = window.open;
  window.open = function(url) {
    if (url && typeof url === 'string') {
      // If it's an external URL, open it pointing to the real app, not proxy
      if (isExternalAuth(url)) {
        return origOpen.call(window, url, '_blank');
      }
    }
    return origOpen.apply(window, arguments);
  };

  // Intercept link clicks
  document.addEventListener('click', function(e) {
    var el = e.target;
    while (el && el.tagName !== 'A') el = el.parentElement;
    if (!el || !el.href) return;

    try {
      var linkUrl = new URL(el.href);

      // External auth links: open in new window, don't navigate iframe
      if (isExternalAuth(el.href)) {
        e.preventDefault();
        window.open(el.href, '_blank');
        return;
      }

      // Same-origin (real app) links: route through proxy
      if (REAL_ORIGIN && linkUrl.origin === REAL_ORIGIN) {
        e.preventDefault();
        var proxyUrl = '/api/proxy?url=' + encodeURIComponent(el.href);
        if (el.target === '_blank') {
          window.open(proxyUrl);
        } else {
          window.location.href = proxyUrl;
        }
        return;
      }
    } catch(ex) {}

    // For any other navigation, just send an update after it triggers
    setTimeout(send, 200);
  }, true);

  // Intercept navigation via location.assign and location.replace
  var origAssign = location.assign.bind(location);
  var origReplaceLoc = location.replace.bind(location);

  location.assign = function(url) {
    if (isExternalAuth(url)) {
      window.open(url, '_blank');
      return;
    }
    origAssign(url);
  };

  location.replace = function(url) {
    if (isExternalAuth(url)) {
      window.open(url, '_blank');
      return;
    }
    origReplaceLoc(url);
  };

  // Intercept XMLHttpRequest to catch Supabase OAuth URL generation
  // Supabase client calls its auth endpoint then redirects to the returned URL
  var origXhrOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url) {
    this._cbUrl = url;
    return origXhrOpen.apply(this, arguments);
  };

  // Intercept fetch to catch Supabase OAuth - it returns a URL the SDK
  // then navigates to via window.location.href
  var origFetch = window.fetch;
  window.fetch = function(input, init) {
    return origFetch.apply(window, arguments).then(function(response) {
      // Clone so we can read the body without consuming it
      var cloned = response.clone();
      // Check if this looks like a Supabase auth response
      var url = typeof input === 'string' ? input : (input && input.url ? input.url : '');
      if (url.includes('/auth/v1/') && url.includes('provider=')) {
        cloned.json().then(function(data) {
          if (data && data.url && isExternalAuth(data.url)) {
            // Supabase will try to redirect to this URL.
            // Pre-emptively open it in a new window and suppress the redirect.
            window.__cbOauthUrl = data.url;
          }
        }).catch(function() {});
      }
      return response;
    });
  };

  // Final safety net: intercept the actual location.href change
  // by using a timer to check if an OAuth URL was detected via fetch intercept.
  // Also monitor for any navigation attempts to Supabase auth endpoints.
  try {
    setInterval(function() {
      if (window.__cbOauthUrl) {
        var oauthUrl = window.__cbOauthUrl;
        window.__cbOauthUrl = null;
        window.open(oauthUrl, '_blank');
      }
    }, 50);
  } catch(e) {}

  // Intercept direct navigation via window.location.href setter.
  // Supabase OAuth does: window.location.href = 'https://accounts.google.com/...'
  // We need to catch this and open in a new window instead.
  try {
    var _currentHref = location.href;
    // Use a MutationObserver-like approach: watch the location periodically
    // and if it changes to an auth URL, prevent the navigation
    var _navCheckInterval = setInterval(function() {
      if (location.href !== _currentHref) {
        var newHref = location.href;
        _currentHref = newHref;
        // If the new URL is an external auth URL, we're already navigating
        // This is a last-resort detection
        if (isExternalAuth(newHref)) {
          // Can't prevent navigation that already happened, but the nav guard
          // in the parent will reload the proxy. Log it for debugging.
          PARENT.postMessage({
            type: 'clientbridge:navigation',
            url: getRealUrl(),
            leaving: true,
            reason: 'oauth_redirect'
          }, '*');
        }
      }
    }, 100);
  } catch(e) {}

  // Inform parent when iframe is navigating away
  window.addEventListener('beforeunload', function() {
    PARENT.postMessage({
      type: 'clientbridge:navigation',
      url: getRealUrl(),
      leaving: true
    }, '*');
  });

  // Periodic fallback for frameworks that bypass history API
  // Also catches hash changes that don't fire hashchange events
  // Runs every 300ms for responsive URL tracking
  var lastUrl = location.href;
  var lastHash = location.hash;
  setInterval(function() {
    var changed = false;
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      changed = true;
    }
    if (location.hash !== lastHash) {
      lastHash = location.hash;
      changed = true;
    }
    if (changed) send();
  }, 300);

  // =========================================================================
  // CLIENT-SIDE ERROR CAPTURE
  // Catches JS errors, unhandled rejections, and console.error calls
  // from the proxied app and reports them to the developer dashboard.
  // =========================================================================
  var _cbErrorCount = 0;
  var _cbMaxErrors = 10; // Max errors per page load to prevent flooding
  var _cbSentErrors = {}; // Dedup: track sent error signatures

  function reportError(errorType, message, stack, sourceFile, line, col) {
    if (_cbErrorCount >= _cbMaxErrors) return;
    // Deduplicate: same type + message = skip
    var sig = errorType + '::' + (message || '').slice(0, 100);
    if (_cbSentErrors[sig]) return;
    _cbSentErrors[sig] = true;
    _cbErrorCount++;

    // Don't report errors from the tracking script itself
    if (stack && stack.indexOf('data-clientbridge-tracking') !== -1) return;
    // Don't report errors from browser extensions
    if (sourceFile && (sourceFile.indexOf('chrome-extension://') === 0 || sourceFile.indexOf('moz-extension://') === 0)) return;

    var payload = {
      errorType: errorType,
      message: (message || 'Unknown error').slice(0, 1000),
      stack: (stack || '').slice(0, 2000),
      sourceFile: sourceFile || null,
      line: line || null,
      column: col || null,
      pageUrl: getRealUrl(),
      projectUrl: REAL_ORIGIN,
      userAgent: navigator.userAgent
    };

    // Send to ClientBridge error ingestion endpoint
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/errors/client', true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.send(JSON.stringify(payload));
    } catch(e) { /* silent fail — don't cause more errors */ }

    // Also notify parent so the developer sees it in real-time if watching
    PARENT.postMessage({
      type: 'clientbridge:error',
      errorType: errorType,
      message: payload.message,
      pageUrl: payload.pageUrl
    }, '*');
  }

  // 1. Catch uncaught JS exceptions
  window.onerror = function(message, source, line, col, error) {
    reportError(
      'js_error',
      String(message),
      error && error.stack ? error.stack : '',
      source,
      line,
      col
    );
    // Don't suppress — let the error still show in console
    return false;
  };

  // 2. Catch unhandled promise rejections
  window.addEventListener('unhandledrejection', function(event) {
    var reason = event.reason;
    var message = reason instanceof Error ? reason.message : String(reason || 'Unhandled promise rejection');
    var stack = reason instanceof Error ? reason.stack : '';
    reportError('unhandled_rejection', message, stack || '', null, null, null);
  });

  // 3. Intercept console.error calls
  var _origConsoleError = console.error;
  console.error = function() {
    // Call original first so it still shows in dev tools
    _origConsoleError.apply(console, arguments);
    // Build message from arguments
    var parts = [];
    for (var i = 0; i < arguments.length; i++) {
      var arg = arguments[i];
      if (arg instanceof Error) {
        parts.push(arg.message);
        if (arg.stack) {
          reportError('console_error', arg.message, arg.stack, null, null, null);
          return;
        }
      } else if (typeof arg === 'object') {
        try { parts.push(JSON.stringify(arg).slice(0, 200)); } catch(e) { parts.push('[object]'); }
      } else {
        parts.push(String(arg));
      }
    }
    reportError('console_error', parts.join(' '), '', null, null, null);
  };
})();
</script>
`;
}

// Log proxy errors to the error_log table so the developer sees them in the dashboard
async function logProxyError(
  errorType: string,
  message: string,
  url: string | null,
  rawError?: string,
  userAgent?: string | null,
  projectId?: string | null
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) return

  const supabase = createClient(supabaseUrl, supabaseKey)

  // If we have a URL but no project ID, try to find the project
  let resolvedProjectId = projectId
  if (!resolvedProjectId && url) {
    try {
      const origin = new URL(url).origin
      const { data } = await supabase
        .from('projects')
        .select('id')
        .ilike('vercel_url', `${origin}%`)
        .limit(1)
      if (data?.[0]) resolvedProjectId = data[0].id
    } catch { /* best effort */ }
  }

  try {
    await supabase.from('error_log').insert({
      project_id: resolvedProjectId,
      error_type: errorType,
      tier: 1,
      message,
      url,
      raw_error: rawError || null,
      user_agent: userAgent || null,
      source: 'proxy',
      status: 'new',
    })
  } catch (e) {
    console.error('Failed to log error:', e)
  }
}

// Allowed project URLs cache (refreshed per request for security)
async function isAllowedUrl(targetOrigin: string): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) return false

  const supabase = createClient(supabaseUrl, supabaseKey)
  const { data } = await supabase
    .from('projects')
    .select('vercel_url')
    .eq('review_link_active', true)

  if (!data) return false

  return data.some((project) => {
    try {
      const projectOrigin = new URL(project.vercel_url).origin
      return projectOrigin === targetOrigin
    } catch {
      return false
    }
  })
}

function resolveUrl(relative: string, base: string): string {
  try {
    return new URL(relative, base).href
  } catch {
    return relative
  }
}

function rewriteHtml(html: string, baseUrl: string, proxyBase: string): string {
  const parsedBase = new URL(baseUrl)
  const origin = parsedBase.origin

  let result = html

  // Rewrite ALL relative URLs (src, href, action, srcset, poster, data)
  // to be absolute URLs pointing to the real origin so the browser fetches
  // assets (CSS, JS, images, fonts) directly from the deployed app.
  // Anchor hrefs are handled separately below to route through the proxy.
  result = result.replace(
    /(<(?:script|link|img|source|video|audio|embed|object|input)\s[^>]*?(?:src|href|action|poster|data)\s*=\s*["'])(\/[^"']*)(["'])/gi,
    (match, prefix, url, suffix) => {
      return `${prefix}${origin}${url}${suffix}`
    }
  )

  // Rewrite srcset attributes (responsive images)
  result = result.replace(
    /(srcset\s*=\s*["'])([^"']+)(["'])/gi,
    (match, prefix, srcsetVal, suffix) => {
      const rewritten = srcsetVal.replace(/(^|,\s*)(\/[^\s,]+)/g, (_m: string, sep: string, url: string) => {
        return `${sep}${origin}${url}`
      })
      return `${prefix}${rewritten}${suffix}`
    }
  )

  // Rewrite CSS url() references in inline styles and <style> tags for relative paths
  result = result.replace(
    /url\(\s*["']?(\/[^"')]+)["']?\s*\)/gi,
    (match, url) => {
      return `url("${origin}${url}")`
    }
  )

  // Rewrite module import/preload links (type="module", rel="modulepreload")
  // These may use crossorigin which is fine — just fix the path
  result = result.replace(
    /(<link\s[^>]*?href\s*=\s*["'])(\/[^"']*)(["'][^>]*>)/gi,
    (match, prefix, url, suffix) => {
      return `${prefix}${origin}${url}${suffix}`
    }
  )

  // Strip meta tags that block iframe embedding (X-Frame-Options, CSP frame-ancestors)
  result = result.replace(/<meta[^>]*http-equiv\s*=\s*["']?X-Frame-Options["']?[^>]*>/gi, '')
  result = result.replace(
    /(<meta[^>]*content\s*=\s*["'][^"']*)(frame-ancestors\s+[^;'"]*;?\s*)/gi,
    '$1'
  )

  // Inject tracking script before </head> (no <base> tag needed anymore)
  const injection = buildTrackingScript(baseUrl)
  if (/<\/head>/i.test(result)) {
    result = result.replace(/<\/head>/i, injection + '</head>')
  } else if (/<head[^>]*>/i.test(result)) {
    result = result.replace(/<head([^>]*)>/i, `<head$1>${injection}`)
  } else {
    // No head tag — prepend
    result = injection + result
  }

  // Rewrite anchor hrefs that point to the same origin to go through the proxy
  // so that full-page navigations stay within the proxy
  result = result.replace(
    /(<a\s[^>]*?href\s*=\s*["'])(\/[^"']*|(?:https?:\/\/[^"']*))(["'][^>]*>)/gi,
    (match, prefix, url, suffix) => {
      const absolute = resolveUrl(url, baseUrl)
      try {
        const parsed = new URL(absolute)
        if (parsed.origin === origin) {
          return `${prefix}${proxyBase}?url=${encodeURIComponent(absolute)}${suffix}`
        }
      } catch {
        // leave as-is
      }
      return match
    }
  )

  return result
}

// Branded error page for iframe display — never show raw JSON to clients
function buildErrorPage(title: string, message: string, showRetry: boolean = true): NextResponse {
  const retryButton = showRetry
    ? `<button onclick="location.reload()" style="padding:10px 24px;background:#F59E0B;color:#09090B;border:none;border-radius:8px;font-weight:600;font-size:14px;cursor:pointer;margin-right:12px">Try Again</button>`
    : ''
  const feedbackButton = `<button onclick="window.parent.postMessage({type:'clientbridge:switchView',view:'feedback'},'*')" style="padding:10px 24px;background:#18181B;color:#FAFAFA;border:1px solid #27272A;border-radius:8px;font-weight:500;font-size:14px;cursor:pointer">Submit Feedback Instead</button>`

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>*{margin:0;padding:0;box-sizing:border-box}body{background:#09090B;color:#FAFAFA;font-family:Inter,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh}</style>
</head>
<body>
<div style="text-align:center;max-width:420px;padding:24px">
  <svg width="48" height="48" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg" style="margin-bottom:24px">
    <rect x="2" y="2" width="38" height="38" rx="8" stroke="#27272A" stroke-width="2" fill="none"/>
    <text x="10" y="30" font-family="Inter,sans-serif" font-weight="800" font-size="26" fill="#27272A">cb</text>
  </svg>
  <h2 style="font-size:18px;font-weight:600;margin-bottom:8px">${title}</h2>
  <p style="font-size:14px;color:#71717A;margin-bottom:24px;line-height:1.6">${message}</p>
  <div>${retryButton}${feedbackButton}</div>
  <p style="font-size:12px;color:#52525B;margin-top:16px">Your developer has been notified.</p>
</div>
</body>
</html>`

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

export async function GET(request: NextRequest) {
  const targetUrl = request.nextUrl.searchParams.get('url')

  if (!targetUrl) {
    return buildErrorPage('Invalid Link', 'This review link appears to be broken. Contact your developer for a new link.', false)
  }

  // Validate URL format
  let parsed: URL
  try {
    parsed = new URL(targetUrl)
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return buildErrorPage('Invalid Link', 'This review link appears to be broken. Contact your developer for a new link.', false)
    }
  } catch {
    return buildErrorPage('Invalid Link', 'This review link appears to be broken. Contact your developer for a new link.', false)
  }

  // Safety: reject self-referencing URLs to prevent circular fetch loops.
  // If a project accidentally has vercel_url set to the ClientBridge domain,
  // the proxy would fetch itself infinitely.
  const selfDomains = ['clientbridge.dev', 'www.clientbridge.dev', 'clientbridge.vercel.app']
  const requestHost = request.nextUrl.hostname
  if (selfDomains.includes(parsed.hostname) || parsed.hostname === requestHost) {
    console.error(`Proxy blocked self-referencing URL: ${targetUrl}`)
    await logProxyError(
      'proxy_self_reference',
      `Blocked circular fetch: proxy tried to fetch its own domain (${parsed.hostname}). A project likely has vercel_url misconfigured.`,
      targetUrl,
      'Self-referencing URL detected — check projects table for vercel_url pointing to clientbridge.dev',
      request.headers.get('user-agent')
    )
    return buildErrorPage(
      'Configuration Error',
      'This project\'s review URL points to ClientBridge itself instead of the deployed app. Please contact your developer to update the project URL.',
      false
    )
  }

  // Security: only proxy URLs belonging to registered projects
  const allowed = await isAllowedUrl(parsed.origin)
  if (!allowed) {
    return buildErrorPage('Access Revoked', 'This review link is no longer active. Contact your developer if you need access.', false)
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': request.headers.get('user-agent') || 'ClientBridge-Proxy/1.0',
        'Accept': request.headers.get('accept') || '*/*',
        'Accept-Language': request.headers.get('accept-language') || 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    })

    const contentType = response.headers.get('content-type') || ''
    const isHtml = contentType.includes('text/html')

    if (isHtml) {
      const html = await response.text()
      // Use the final response URL (after redirects) as the base for rewriting.
      // This ensures that if the app redirected (e.g. / → /login), we track
      // the actual page the client landed on, not the original request URL.
      const finalUrl = response.url || targetUrl
      const proxyBase = '/api/proxy'
      const rewritten = rewriteHtml(html, finalUrl, proxyBase)

      return new NextResponse(rewritten, {
        status: response.status,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'no-store',
          // Strip X-Frame-Options and CSP frame-ancestors so the app can
          // be embedded in the ClientBridge review iframe.
          'X-Frame-Options': 'ALLOWALL',
        },
      })
    }

    // Non-HTML: pass through as-is (CSS, JS, images, fonts, etc.)
    const body = await response.arrayBuffer()
    const headers: Record<string, string> = {
      'Cache-Control': response.headers.get('cache-control') || 'public, max-age=3600',
    }
    if (contentType) headers['Content-Type'] = contentType

    const contentEncoding = response.headers.get('content-encoding')
    if (contentEncoding) headers['Content-Encoding'] = contentEncoding

    return new NextResponse(body, {
      status: response.status,
      headers,
    })
  } catch (err) {
    console.error('Proxy fetch error:', err)

    // Log to error_log table so developer sees it in the dashboard
    await logProxyError(
      'proxy_failed',
      `Failed to fetch ${targetUrl}: ${err instanceof Error ? err.message : String(err)}`,
      targetUrl,
      err instanceof Error ? err.stack : String(err),
      request.headers.get('user-agent')
    )

    return buildErrorPage(
      'App Unavailable',
      'The app couldn\u2019t be reached right now. It may be redeploying or temporarily offline. You can try again or submit feedback describing what you need.'
    )
  }
}
