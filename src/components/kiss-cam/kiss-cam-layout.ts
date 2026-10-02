/**
 * Kiss Cam stage layout — header / stage / bottom text safe areas.
 *
 * Vertical regions (percent of stage height):
 *
 *   ┌─────────────────────────────┐ 0%
 *   │      HEADER SAFE AREA       │  ← TableWedding / Kiss Cam / couple names
 *   ├─────────────────────────────┤ HEADER_SAFE_PCT
 *   │                             │
 *   │         STAGE AREA          │  ← heart video + overlays
 *   │                             │
 *   ├─────────────────────────────┤ 100% − BOTTOM_SAFE_PCT
 *   │      BOTTOM SAFE AREA       │  ← couple names / wedding title
 *   └─────────────────────────────┘ 100%
 */

export const HEADER_SAFE_PCT = 14;
export const BOTTOM_SAFE_PCT = 12;

/** CSS variables applied on the stage root. */
export const STAGE_SAFE_AREA_STYLE = {
  ["--kiss-header-safe" as string]: `${HEADER_SAFE_PCT}%`,
  ["--kiss-bottom-safe" as string]: `${BOTTOM_SAFE_PCT}%`,
} as const;
