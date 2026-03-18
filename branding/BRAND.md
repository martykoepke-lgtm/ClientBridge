# ClientBridge Brand Guide

## Identity Stack
- **Logo:** cb monogram (lowercase "cb" in rounded square)
- **Typeface:** Inter (all weights) + JetBrains Mono (technical accents)
- **Palette:** Warm Signal — monochrome base with amber #F59E0B accent
- **Domain:** clientbridge.dev

## Files

| File | Purpose |
|------|---------|
| `brand-tokens.ts` | All brand values as typed constants — colors, type, logo data, feedback/status styles |
| `tailwind-brand.ts` | Tailwind theme extension — `import { brandTheme }` into tailwind.config.ts |
| `identity-board.html` | Visual reference — open in browser to see all options and mockups |
| `logo-monogram-dark.svg` | cb mark for dark backgrounds (white outline) |
| `logo-monogram-light.svg` | cb mark for light backgrounds (filled dark) |
| `logo-full-dark.svg` | cb mark + "ClientBridge" wordmark for dark backgrounds |
| `logo-full-light.svg` | cb mark + "ClientBridge" wordmark for light backgrounds |
| `favicon.svg` | 32x32 favicon (dark filled square with white cb) |

## Color Quick Reference

```
Background:   #09090B    (page bg)
Surface:      #18181B    (cards, panels)
Border:       #27272A    (dividers)
Text:         #FAFAFA    (primary)
Text muted:   #71717A    (secondary)
Accent:       #F59E0B    (amber — CTAs, active, highlights)
Accent hover: #D97706    (darker amber)

Error:        #EF4444    (red — bugs, critical)
Success:      #22C55E    (green — resolved)
Info:         #3B82F6    (blue — features)
Purple:       #A855F7    (UX feedback)
```

## Usage in Components

```tsx
import { colors, feedbackTypeStyles, statusStyles } from '@/branding/brand-tokens'

// Direct color usage
<div style={{ background: colors.surface, borderColor: colors.border }}>

// Feedback type badge
const style = feedbackTypeStyles[feedback.feedback_type]
<span style={{ color: style.color, background: style.bg }}>{style.label}</span>

// Status badge
const status = statusStyles[feedback.status]
<span style={{ color: status.color, background: status.bg }}>{status.label}</span>
```

## Usage with Tailwind

```ts
// tailwind.config.ts
import { brandTheme } from './branding/tailwind-brand'
export default {
  theme: { extend: brandTheme }
}
```

```tsx
// Components
<div className="bg-cb-background text-cb-text-primary border border-cb-border">
<button className="bg-cb-accent text-cb-accent-text hover:bg-cb-accent-hover">
<span className="text-cb-text-muted font-mono">
```
