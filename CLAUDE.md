# ClientBridge — Claude Code Instructions

## MANDATORY: Read GUARDRAILS.md First

**Before making ANY changes to this project, you MUST read `GUARDRAILS.md` in the project root.** It contains critical protective rules including:
- Supabase database protection (NEVER wipe, drop, or destructively modify)
- Protected file zones that require explicit approval to modify
- Architectural change approval process (describe, wireframe, get approval before coding)
- Additive-first development rules
- The decision context log explaining why things are built the way they are

**Failure to follow GUARDRAILS.md has previously resulted in deletion of working application code. These rules exist to prevent that from happening again.**

---

## Project Overview
ClientBridge is a client collaboration platform for dev agencies. It includes a lifecycle client portal, embedded contract builder, visual feedback with screenshot capture and markup, and milestone-based Stripe payments.

---

## html2canvas — Screen Capture Rules

**CRITICAL: Follow these rules any time you work with html2canvas in this project. Failure to follow them produces a broken capture: a zoomed-in crop with the rest of the viewport blacked out.**

### The Problem
html2canvas defaults cause incorrect renders when:
- The target element has CSS transforms, `overflow: hidden`, or is not the full viewport
- `devicePixelRatio` is > 1 (Retina displays), causing an oversized canvas that appears "zoomed in"
- Scroll position is not accounted for, offsetting the capture
- The element passed is a wrapper/container instead of the actual content area

### Required Configuration
Always use this configuration pattern when calling html2canvas. Do not omit any of these properties:

```typescript
import html2canvas from 'html2canvas';

async function captureScreenshot(targetElement?: HTMLElement): Promise<string> {
  // RULE 1: Default to document.body or documentElement — never a small wrapper div
  const element = targetElement || document.documentElement;

  // RULE 2: Always pass all of these options explicitly
  const canvas = await html2canvas(element, {
    // Force 1:1 pixel ratio — prevents zoomed-in render on Retina displays
    scale: 1,

    // Handle CORS images gracefully
    useCORS: true,
    allowTaint: false,

    // Explicitly set viewport dimensions to match what the user sees
    windowWidth: document.documentElement.clientWidth,
    windowHeight: document.documentElement.clientHeight,
    width: document.documentElement.clientWidth,
    height: document.documentElement.clientHeight,

    // Account for current scroll position
    scrollX: -window.scrollX,
    scrollY: -window.scrollY,
    x: window.scrollX,
    y: window.scrollY,

    // Transparent background instead of black for any uncaptured areas
    backgroundColor: null,

    // Ignore elements that cause rendering issues
    ignoreElements: (el) => {
      // Skip fixed overlays, modals, and the capture toolbar itself
      return el.hasAttribute('data-html2canvas-ignore');
    },
  });

  return canvas.toDataURL('image/png');
}
```

### Rules — Do Not Break These

1. **Always set `scale: 1`**. Never rely on the default (`window.devicePixelRatio`). The default produces a 2x or 3x canvas on Retina displays that renders as a zoomed-in crop when displayed at CSS pixel dimensions.

2. **Always set `width`, `height`, `windowWidth`, `windowHeight` explicitly** to `document.documentElement.clientWidth` and `clientHeight`. Do not let html2canvas guess the dimensions.

3. **Always set `scrollX`, `scrollY`, `x`, `y`** to account for the current scroll position. Without these, a scrolled page produces an offset/cropped capture.

4. **Always set `backgroundColor: null`** instead of letting it default. The default background is white, but when the capture dimensions are wrong the uncaptured area renders as black. Null background makes dimension bugs visible immediately rather than producing a mysterious black border.

5. **Never pass a small container div as the target element**. If capturing the full page, use `document.documentElement` or `document.body`. If capturing a specific section, make sure that element has explicit width/height and no CSS transforms applied.

6. **Never capture cross-origin iframes with html2canvas**. They render as black rectangles. For the Vercel preview iframe, either:
   - Proxy the content through the same origin, OR
   - Use the `getDisplayMedia` API as a fallback for iframe content, OR
   - Capture only the surrounding UI and prompt the user to screenshot the iframe content separately

7. **Add `data-html2canvas-ignore` attribute** to elements that should not be captured: the markup toolbar, floating UI, modals, toasts, and the capture button itself.

### Testing Checklist
When modifying the screen capture feature, verify:
- [ ] Capture matches what the user sees in the viewport (no zoom, no offset)
- [ ] Entire viewport is captured, no black borders or missing areas
- [ ] Works on both regular displays and Retina/HiDPI displays
- [ ] Works when the page is scrolled down
- [ ] The markup toolbar and capture UI are excluded from the capture
- [ ] Cross-origin iframe content either renders correctly or degrades gracefully (not a black box)

### Common Bugs and Their Causes

| Symptom | Cause | Fix |
|---------|-------|-----|
| Zoomed-in crop with black around it | Missing `scale: 1` or wrong target element | Set `scale: 1`, use `document.documentElement` |
| Capture is offset/shifted | Scroll position not accounted for | Set `scrollX`, `scrollY`, `x`, `y` |
| Black rectangle where iframe should be | Cross-origin iframe | Use `getDisplayMedia` fallback or proxy |
| Capture is 2x or 3x too large | Default `devicePixelRatio` on Retina | Set `scale: 1` |
| White areas where content should be | CORS-restricted images | Set `useCORS: true` |
| Toolbar appears in capture | Toolbar not excluded | Add `data-html2canvas-ignore` to toolbar |

---

## Other Project Conventions

- **Framework**: Next.js (App Router)
- **Database**: Supabase (Postgres + Auth + Storage + Realtime)
- **Styling**: Tailwind CSS
- **Payments**: Stripe (milestone-based Checkout Sessions)
- **Deployment**: Vercel
