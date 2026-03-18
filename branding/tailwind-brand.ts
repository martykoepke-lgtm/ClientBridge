/**
 * ClientBridge — Tailwind CSS Brand Extension
 *
 * Merge into your tailwind.config.ts:
 *
 *   import { brandTheme } from './branding/tailwind-brand'
 *   export default { theme: { extend: brandTheme } }
 *
 * Then use in components:
 *   className="bg-cb-background text-cb-text-primary border-cb-border"
 *   className="bg-cb-accent text-cb-accent-text hover:bg-cb-accent-hover"
 */

export const brandTheme = {
  colors: {
    cb: {
      // Core surfaces
      background:    "#09090B",
      surface:       "#18181B",
      "surface-hover": "#1C1C22",
      border:        "#27272A",
      "border-subtle": "#1C1C22",

      // Text
      "text-primary":   "#FAFAFA",
      "text-secondary": "#A1A1AA",
      "text-muted":     "#71717A",
      "text-faint":     "#52525B",

      // Accent — Warm Signal amber
      accent:        "#F59E0B",
      "accent-hover": "#D97706",
      "accent-muted": "rgba(245, 158, 11, 0.15)",
      "accent-text":  "#09090B",

      // Semantic
      error:         "#EF4444",
      "error-muted": "rgba(239, 68, 68, 0.15)",
      success:       "#22C55E",
      "success-muted": "rgba(34, 197, 94, 0.1)",
      info:          "#3B82F6",
      "info-muted":  "rgba(59, 130, 246, 0.15)",
      purple:        "#A855F7",
      "purple-muted": "rgba(168, 85, 247, 0.15)",
    },
  },
  fontFamily: {
    sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
    mono: ["JetBrains Mono", "Fira Code", "Consolas", "monospace"],
  },
  borderRadius: {
    "cb-sm": "4px",
    "cb-md": "8px",
    "cb-lg": "12px",
    "cb-xl": "16px",
  },
} as const;
