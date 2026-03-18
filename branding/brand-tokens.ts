/**
 * ClientBridge Brand Tokens
 *
 * Single source of truth for all brand values.
 * Import these in components, tailwind config, and anywhere brand values are needed.
 *
 * Identity: cb monogram + Inter + Warm Signal (amber #F59E0B)
 * Domain: clientbridge.dev
 */

// ─── Product ────────────────────────────────────────────────────────
export const brand = {
  name: "ClientBridge",
  shortName: "cb",
  domain: "clientbridge.dev",
  company: "Practical Informatics",
  tagline: "Where clients and code connect.",
} as const;

// ─── Colors ─────────────────────────────────────────────────────────
// Palette: Warm Signal — monochrome base + amber accent
export const colors = {
  // Core palette
  background:   "#09090B",   // zinc-950 — page background
  surface:      "#18181B",   // zinc-900 — cards, panels, elevated surfaces
  surfaceHover: "#1C1C22",   // slightly lighter surface for hover states
  border:       "#27272A",   // zinc-800 — borders, dividers
  borderSubtle: "#1C1C22",   // subtle borders (section dividers)

  // Text
  textPrimary:   "#FAFAFA",  // zinc-50 — headings, primary text
  textSecondary: "#A1A1AA",  // zinc-400 — body text, descriptions
  textMuted:     "#71717A",  // zinc-500 — labels, metadata
  textFaint:     "#52525B",  // zinc-600 — placeholders, disabled

  // Accent — Warm Signal amber
  accent:        "#F59E0B",  // amber-500 — primary accent, CTAs, active states
  accentHover:   "#D97706",  // amber-600 — hover state
  accentMuted:   "rgba(245, 158, 11, 0.15)",  // amber with opacity — badges, subtle highlights
  accentText:    "#09090B",  // text on accent backgrounds

  // Semantic
  error:         "#EF4444",  // red-500 — bugs, critical, destructive
  errorMuted:    "rgba(239, 68, 68, 0.15)",
  warning:       "#F59E0B",  // amber-500 — warnings, high severity (same as accent)
  warningMuted:  "rgba(245, 158, 11, 0.15)",
  success:       "#22C55E",  // green-500 — resolved, success, positive
  successMuted:  "rgba(34, 197, 94, 0.1)",
  info:          "#3B82F6",  // blue-500 — feature requests, informational
  infoMuted:     "rgba(59, 130, 246, 0.15)",
  purple:        "#A855F7",  // purple-500 — UX feedback, enhancements
  purpleMuted:   "rgba(168, 85, 247, 0.15)",

  // Surfaces for light contexts (invoices, client-facing emails)
  white:         "#FFFFFF",
  lightBg:       "#FAFAFA",
  lightBorder:   "#E4E4E7",
} as const;

// ─── Typography ─────────────────────────────────────────────────────
export const typography = {
  // Font families
  fontSans:  "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  fontMono:  "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",

  // Font weights
  weights: {
    light:     300,
    regular:   400,
    medium:    500,
    semibold:  600,
    bold:      700,
    extrabold: 800,
  },

  // Font sizes (rem) — matches Tailwind defaults
  sizes: {
    xs:   "0.75rem",    // 12px — labels, metadata
    sm:   "0.875rem",   // 14px — body small, nav links
    base: "1rem",       // 16px — body
    lg:   "1.125rem",   // 18px — lead text
    xl:   "1.25rem",    // 20px — section headers
    "2xl": "1.5rem",    // 24px — page headers
    "3xl": "1.875rem",  // 30px — large headers
    "4xl": "2.25rem",   // 36px — hero text
    "5xl": "3rem",      // 48px — display
  },

  // Letter spacing
  tracking: {
    tighter: "-1.5px",  // display headings
    tight:   "-0.5px",  // headings
    normal:  "0",       // body
    wide:    "2px",     // labels, section markers
    wider:   "3px",     // uppercase micro labels
  },
} as const;

// ─── Spacing & Radii ────────────────────────────────────────────────
export const radii = {
  sm:   "4px",    // badges, small chips
  md:   "8px",    // buttons, inputs
  lg:   "12px",   // cards, panels
  xl:   "16px",   // modals, large containers
  full: "9999px", // pills, status badges
} as const;

// ─── Feedback Type Styles ───────────────────────────────────────────
// Maps directly to the feedback_type field in the database
export const feedbackTypeStyles = {
  bug:             { color: colors.error,  bg: colors.errorMuted,  label: "Bug" },
  content:         { color: colors.textSecondary, bg: "rgba(161,161,170,0.15)", label: "Content" },
  ux:              { color: colors.purple, bg: colors.purpleMuted,  label: "UX" },
  feature_request: { color: colors.info,   bg: colors.infoMuted,   label: "Feature" },
  general:         { color: colors.textMuted, bg: "rgba(113,113,122,0.15)", label: "General" },
} as const;

// ─── Severity Styles ────────────────────────────────────────────────
export const severityStyles = {
  low:      { color: colors.textMuted,  label: "Low" },
  normal:   { color: colors.info,       label: "Normal" },
  high:     { color: colors.accent,     label: "High" },
  critical: { color: colors.error,      label: "Critical" },
} as const;

// ─── Status Styles ──────────────────────────────────────────────────
export const statusStyles = {
  new:         { color: colors.accent,        bg: colors.accentMuted,  label: "New" },
  reviewed:    { color: colors.textSecondary,  bg: "rgba(161,161,170,0.1)", label: "Reviewed" },
  in_progress: { color: colors.info,          bg: colors.infoMuted,    label: "In Progress" },
  resolved:    { color: colors.success,       bg: colors.successMuted, label: "Resolved" },
  deferred:    { color: colors.textMuted,     bg: "rgba(113,113,122,0.1)", label: "Deferred" },
  change_made: { color: colors.purple,        bg: colors.purpleMuted,  label: "Change Made" },
} as const;

// ─── Logo SVG Paths ─────────────────────────────────────────────────
// For inline SVG rendering in components
export const logo = {
  // Monogram: "cb" in rounded square
  monogram: {
    viewBox: "0 0 42 42",
    // Dark background variant (white mark on transparent)
    onDark: {
      rect: { x: 2, y: 2, width: 38, height: 38, rx: 8, stroke: "#FAFAFA", strokeWidth: 2, fill: "none" },
      text: { x: 10, y: 30, fill: "#FAFAFA", content: "cb" },
    },
    // Light background variant (dark filled square)
    onLight: {
      rect: { x: 2, y: 2, width: 38, height: 38, rx: 8, fill: "#09090B" },
      text: { x: 10, y: 30, fill: "#FAFAFA", content: "cb" },
    },
    // Favicon variant (filled, maximum contrast)
    favicon: {
      rect: { x: 0, y: 0, width: 42, height: 42, rx: 8, fill: "#09090B" },
      text: { x: 10, y: 30, fill: "#FAFAFA", content: "cb" },
    },
  },
  // Wordmark text settings
  wordmark: {
    text: "ClientBridge",
    fontFamily: "Inter",
    fontWeight: 800,
    letterSpacing: "-1px",
  },
} as const;
